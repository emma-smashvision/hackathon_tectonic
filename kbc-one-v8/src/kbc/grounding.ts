// Ported from round one (src/lib/kate/respond.ts → parseModelReply): every amount Kate writes
// must appear in what she was given. "1.050", "1,050" and 1050 are the same figure, so each token
// is read both as English and as European notation. Small whole numbers ("2 times", "30 days",
// "22 Oct") are not amounts and pass.

const values = (s: string) =>
  (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => [
    Number(n.replace(/,/g, "")),
    Number(n.replace(/\./g, "").replace(",", ".")),
  ]);

/** Numbers in `text` that appear nowhere in `sources` (facts, the customer's words, the chat). */
export function unknownNumbers(text: string, ...sources: unknown[]): string[] {
  const allowed = new Set(
    sources.flatMap((s) => values(typeof s === "string" ? s : JSON.stringify(s)).flat()),
  );
  const known = (n: number) => allowed.has(n) || (Number.isInteger(n) && n <= 100);
  const out: string[] = [];
  for (const raw of text.match(/\d+(?:[.,]\d+)*/g) ?? []) {
    const cands = [Number(raw.replace(/,/g, "")), Number(raw.replace(/\./g, "").replace(",", "."))];
    if (!cands.some(known)) out.push(raw);
  }
  return out;
}
