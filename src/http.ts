// Concurrency limiter and retry pattern for HTTP requests
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private inFlight: number = 0;
  private maxInFlight: number = 2;

  constructor(rps: number = 2, maxInFlight: number = 2) {
    this.maxTokens = rps;
    this.tokens = rps;
    this.refillRate = rps;
    this.maxInFlight = maxInFlight;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    while (this.inFlight >= this.maxInFlight) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    this.refill();
    while (this.tokens < 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.refill();
    }
    this.tokens -= 1;
    this.inFlight += 1;
  }

  release() {
    this.inFlight -= 1;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      if (attempt === maxRetries) break;
      // Check for retry-after
      let delay = baseDelay * Math.pow(2, attempt);
      const err = error as { retryAfter?: number; status?: number };
      if (err.retryAfter) {
        delay = err.retryAfter * 1000;
      }
      if (err.status === 429 || (err.status && err.status >= 500 && err.status < 600)) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
