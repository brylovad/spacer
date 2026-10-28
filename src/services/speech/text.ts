/** Dzieli tekst na kawałki z całych zdań, nie dłuższe niż maxChars (chyba że samo zdanie jest dłuższe). */
export function splitIntoChunks(text: string, maxChars: number): string[] {
  const sentences = text.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxChars) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
