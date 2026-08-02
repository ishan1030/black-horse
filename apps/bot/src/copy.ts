import Anthropic from '@anthropic-ai/sdk';

/**
 * AI product copy from shoe photos. Three providers, checked in order:
 *   1. ANTHROPIC_API_KEY  → Claude (claude-opus-4-8, vision + structured output)
 *   2. GEMINI_API_KEY     → Google Gemini (gemini-2.5-flash)
 *   3. OPENROUTER_API_KEY → OpenRouter free vision models (no billing needed)
 * Dormant when no key is in the root .env — every caller falls back to
 * template copy when disabled or on any API failure, so the bot never blocks.
 */

const SYSTEM_PROMPT =
  'You write product copy for Black Horse Shoe, a premium footwear brand hand-crafting ' +
  'leather shoes in Kathmandu, Nepal. Voice: minimal luxury, confident, concrete — ' +
  'describe what is actually visible in the photos (leather grain, stitching, silhouette, ' +
  'sole, color, hardware). No clichés, no exclamation marks, no emoji.';

export interface ShoeCopy {
  description: string;
  caption: string;
}

// Lazy so the root .env (loaded in index.ts after imports) is respected.
let anthropicClient: Anthropic | null | undefined;
function getAnthropic(): Anthropic | null {
  if (anthropicClient === undefined) {
    anthropicClient = process.env.ANTHROPIC_API_KEY
      ? new Anthropic({ timeout: 60_000 })
      : null;
  }
  return anthropicClient;
}

export function aiCopyProvider(): 'claude' | 'gemini' | 'openrouter' | null {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENROUTER_API_KEY) return 'openrouter';
  return null;
}

function buildPrompt(context: { name?: string; category?: string; price?: number }): string {
  const facts = [
    context.name ? `Name: ${context.name}` : null,
    context.category ? `Category: ${context.category}` : null,
    context.price ? `Price: Rs. ${context.price}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  return (
    'Write copy for this shoe based on the photos.' + (facts ? `\nKnown details:\n${facts}` : '')
  );
}

async function toBase64(photos: Blob[]): Promise<string[]> {
  return Promise.all(
    // 3 angles are plenty for copywriting; keeps the request small.
    photos.slice(0, 3).map(async (p) => Buffer.from(await p.arrayBuffer()).toString('base64')),
  );
}

async function claudeCopy(
  images: string[],
  prompt: string,
): Promise<ShoeCopy | null> {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...images.map((data) => ({
            type: 'image' as const,
            source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data },
          })),
          { type: 'text' as const, text: prompt },
        ],
      },
    ],
    output_config: {
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: '2-3 sentence product description for the product page',
            },
            caption: {
              type: 'string',
              description:
                'One short line (under 90 characters) usable as a gallery caption or image alt text',
            },
          },
          required: ['description', 'caption'],
          additionalProperties: false,
        },
      },
    },
  });

  if (response.stop_reason === 'refusal') return null;
  const text = response.content.find((b) => b.type === 'text');
  return text && text.type === 'text' ? (JSON.parse(text.text) as ShoeCopy) : null;
}

async function geminiCopy(
  images: string[],
  prompt: string,
): Promise<ShoeCopy | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            parts: [
              ...images.map((data) => ({
                inline_data: { mime_type: 'image/jpeg', data },
              })),
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              description: {
                type: 'STRING',
                description: '2-3 sentence product description for the product page',
              },
              caption: {
                type: 'STRING',
                description: 'One short line (under 90 characters) for gallery caption / alt text',
              },
            },
            required: ['description', 'caption'],
          },
        },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  );
  if (!res.ok) {
    console.error('Gemini API error', res.status, await res.text().catch(() => ''));
    return null;
  }
  const body: any = await res.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text ? (JSON.parse(text) as ShoeCopy) : null;
}

// OpenRouter's free-model roster changes constantly, so discover the current
// free vision models from the live catalog instead of hardcoding them.
let freeModelCache: { models: string[]; fetchedAt: number } | null = null;
const FREE_MODEL_CACHE_MS = 60 * 60 * 1000; // refresh hourly

async function getOpenrouterFreeVisionModels(): Promise<string[]> {
  if (freeModelCache && Date.now() - freeModelCache.fetchedAt < FREE_MODEL_CACHE_MS) {
    return freeModelCache.models;
  }
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`models list ${res.status}`);
    const body: any = await res.json();
    const models = (body?.data ?? [])
      .filter(
        (m: any) =>
          typeof m?.id === 'string' &&
          m.id.endsWith(':free') &&
          !m.id.includes('safety') &&
          Array.isArray(m?.architecture?.input_modalities) &&
          m.architecture.input_modalities.includes('image'),
      )
      .map((m: any) => m.id as string)
      // General instruction models write better copy — prefer them.
      .sort((a: string, b: string) => Number(b.includes('gemma')) - Number(a.includes('gemma')));
    if (models.length) {
      freeModelCache = { models, fetchedAt: Date.now() };
      return models;
    }
  } catch (err) {
    console.error('OpenRouter model discovery failed', err);
  }
  return freeModelCache?.models ?? [];
}

function parseLooseJson(text: string): ShoeCopy | null {
  // Some models wrap JSON in ```json fences or add prose around it.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed.description === 'string' && typeof parsed.caption === 'string'
      ? { description: parsed.description, caption: parsed.caption }
      : null;
  } catch {
    return null;
  }
}

async function openrouterCopy(images: string[], prompt: string): Promise<ShoeCopy | null> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return null;

  const jsonPrompt =
    `${prompt}\n\nRespond with ONLY a JSON object, no other text:\n` +
    `{"description": "<2-3 sentence product description>", "caption": "<one line under 90 chars for gallery caption/alt text>"}`;

  const models = await getOpenrouterFreeVisionModels();
  for (const model of models.slice(0, 4)) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: [
                ...images.map((data) => ({
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${data}` },
                })),
                { type: 'text', text: jsonPrompt },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        console.error(`OpenRouter ${model} error`, res.status, await res.text().catch(() => ''));
        continue;
      }
      const body: any = await res.json();
      const text = body?.choices?.[0]?.message?.content;
      const copy = text ? parseLooseJson(text) : null;
      if (copy) return copy;
    } catch (err) {
      console.error(`OpenRouter ${model} failed`, err);
    }
  }
  return null;
}

export async function generateShoeCopy(
  photos: Blob[],
  context: { name?: string; category?: string; price?: number },
): Promise<ShoeCopy | null> {
  if (!aiCopyProvider()) return null;

  const images = await toBase64(photos).catch(() => null);
  if (!images) return null;
  const prompt = buildPrompt(context);

  // Cascade: a provider with a dead/depleted key just falls through to the next.
  const attempts: Array<[string, () => Promise<ShoeCopy | null>]> = [
    ['claude', () => claudeCopy(images, prompt)],
    ['gemini', () => geminiCopy(images, prompt)],
    ['openrouter', () => openrouterCopy(images, prompt)],
  ];
  for (const [name, attempt] of attempts) {
    try {
      const copy = await attempt();
      if (copy) return copy;
    } catch (err) {
      console.error(`AI copy via ${name} failed`, err);
    }
  }
  return null;
}
