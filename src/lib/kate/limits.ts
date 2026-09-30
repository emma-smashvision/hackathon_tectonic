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
