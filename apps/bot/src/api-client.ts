/**
 * Minimal authenticated client for the Black Horse API. Logs in with the
 * bot's admin credentials, caches the JWT, and retries once on 401.
 */
export class ApiClient {
  private token: string | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly email: string,
    private readonly password: string,
  ) {}

  private async login(): Promise<void> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    if (!res.ok) {
      throw new Error(`Bot login failed: ${res.status}`);
    }
    const data = (await res.json()) as { accessToken: string };
    this.token = data.accessToken;
  }

  async get<T>(path: string, retry = true): Promise<T> {
    if (!this.token) await this.login();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (res.status === 401 && retry) {
      this.token = null;
      return this.get<T>(path, false);
    }
    if (!res.ok) {
      throw new Error(`API ${path} responded ${res.status}`);
    }
    return (await res.json()) as T;
  }

  /** JSON POST. */
  async post<T>(path: string, body: unknown, retry = true): Promise<T> {
    if (!this.token) await this.login();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(body),
    });
    if (res.status === 401 && retry) {
      this.token = null;
      return this.post<T>(path, body, false);
    }
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const msg = Array.isArray(detail?.message) ? detail.message[0] : detail?.message;
      throw new Error(msg ?? `API ${path} responded ${res.status}`);
    }
    return (await res.json()) as T;
  }

  /** Multipart POST (file uploads). */
  async postForm<T>(path: string, form: FormData, retry = true): Promise<T> {
    if (!this.token) await this.login();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    });
    if (res.status === 401 && retry) {
      this.token = null;
      return this.postForm<T>(path, form, false);
    }
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const msg = Array.isArray(detail?.message) ? detail.message[0] : detail?.message;
      throw new Error(msg ?? `API ${path} responded ${res.status}`);
    }
    return (await res.json()) as T;
  }
}
