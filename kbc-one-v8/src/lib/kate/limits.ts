/** Per-process demo limiter. A global ceiling also bounds spoofed forwarded IPs. */
export function createRateLimiter() {
  const clients = new Map<string, number>();
  let windowStart = 0;
  let total = 0;
  return (key: string, now = Date.now()) => {
    if (now - windowStart >= 60_000) {
      clients.clear();
      total = 0;
      windowStart = now;
    }
    const count = clients.get(key) ?? 0;
    if (count >= 12 || total >= 60) return false;
    clients.set(key, count + 1);
    total++;
    return true;
  };
}

export async function readLimitedJson(
  request: Request,
  maxBytes: number,
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new RangeError("Payload too large");
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing body");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new RangeError("Payload too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder().decode(buffer));
}

/** Claude Opus 5.5 list prices in USD per token (input, cache write, cache read, output). */
const PRICE = {
  input: 4e-6,
  cacheWrite: 5e-6,
  cacheRead: 0.2e-6,
  output: 20e-6,
};
export interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

/**
 * Per-process spending cap. Claude is skipped once recorded spend reaches the
 * limit; concurrent in-flight requests can overshoot by at most their own cost.
 */
export function createSpendTracker(limitUsd: number) {
  let spent = 0;
  return {
    allows: () => spent < limitUsd,
    record(usage: Usage) {
      spent +=
        usage.input_tokens * PRICE.input +
        (usage.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
        (usage.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
        usage.output_tokens * PRICE.output;
    },
    spent: () => spent,
  };
}
export type SpendTracker = ReturnType<typeof createSpendTracker>;

/** KATE_BUDGET_USD from the environment, defaulting to $5 per server process. */
export function budgetFromEnv(value = process.env.KATE_BUDGET_USD) {
  const limit = Number(value);
  return value !== undefined &&
    value !== "" &&
    Number.isFinite(limit) &&
    limit >= 0
    ? limit
    : 5;
}
