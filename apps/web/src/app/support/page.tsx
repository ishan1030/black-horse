export const metadata = { title: 'Support' };

const SIZE_ROWS = [
  ['EU 40', '25.0 cm', 'US 7', 'UK 6'],
  ['EU 41', '25.7 cm', 'US 8', 'UK 7'],
  ['EU 42', '26.3 cm', 'US 8.5', 'UK 7.5'],
  ['EU 43', '27.0 cm', 'US 9.5', 'UK 8.5'],
  ['EU 44', '27.7 cm', 'US 10.5', 'UK 9.5'],
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line py-12 first:border-t-0 first:pt-0">
      <h2 className="mb-5 font-display text-[clamp(20px,2.4vw,26px)] font-extrabold tracking-tight">
        {title}
      </h2>
      <div className="space-y-4 text-[14.5px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export default function SupportPage() {
  return (
    <div className="px-5 py-16 md:px-16 md:py-24">
      <div className="mx-auto max-w-[72ch]">
        <h1 className="mb-12 font-display text-[clamp(28px,3.4vw,40px)] font-extrabold tracking-tight">
          Support
        </h1>

        <Section id="shipping" title="Shipping & returns">
          <p>
            <b className="text-ink">Free delivery across Kathmandu Valley</b> within 48 hours of
            your order being confirmed. Nationwide delivery takes 3–5 working days.
          </p>
          <p>
            Unworn pairs can be <b className="text-ink">returned or exchanged within 7 days</b> of
            delivery — keep the box and tags. Cash-on-delivery and Fonepay are both accepted.
          </p>
        </Section>

        <Section id="size-guide" title="Size guide">
          <p>
            Measure your foot from heel to longest toe and compare below. Between sizes? We
            recommend sizing up — full-grain leather softens and moulds to your foot.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-line text-[11.5px] uppercase tracking-[0.14em] text-faint">
                  <th className="py-2.5 pr-4 font-semibold">EU</th>
                  <th className="py-2.5 pr-4 font-semibold">Foot length</th>
                  <th className="py-2.5 pr-4 font-semibold">US</th>
                  <th className="py-2.5 font-semibold">UK</th>
                </tr>
              </thead>
              <tbody>
                {SIZE_ROWS.map((row) => (
                  <tr key={row[0]} className="border-b border-line/60">
                    {row.map((cell, i) => (
                      <td key={i} className={`py-2.5 ${i < 3 ? 'pr-4' : ''} ${i === 0 ? 'font-semibold text-ink' : ''}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="care" title="Care guide">
          <p>
            Wipe with a soft damp cloth and let your shoes dry away from direct heat. Condition the
            leather monthly, and use a shoe tree (or stuffed newspaper) to hold the shape. Rotate
            between pairs — leather lasts longest with a day of rest.
          </p>
          <p>Every pair carries a 6-month craft warranty covering stitching and construction.</p>
        </Section>

        <Section id="contact" title="Contact">
          <p>
            <b className="text-ink">Workshop & store</b> — Kathmandu, Nepal
          </p>
          <p>
            Message us on Telegram at{' '}
            <a
              href="https://t.me/blackhorseshoe_bot"
              className="font-medium text-ink underline underline-offset-4"
            >
              @blackhorseshoe_bot
            </a>{' '}
            or reach us by email at{' '}
            <a
              href="mailto:hello@bhandariventures.com"
              className="font-medium text-ink underline underline-offset-4"
            >
              hello@bhandariventures.com
            </a>
            . We reply within one working day.
          </p>
        </Section>
      </div>
    </div>
  );
}
