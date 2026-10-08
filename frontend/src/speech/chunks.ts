export const MAX_NARRATION_CHARACTERS = 6000;
export const MAX_SPEECH_CHUNK = 1800;

/** Keep each thought intact; never silently truncate evidence or uncertainty. */
export function chunkSpeechText(text: string): string[] {
  const input = text.trim();
  if (!input || input.length > MAX_NARRATION_CHARACTERS) throw new Error(`The spoken review must contain 1–${MAX_NARRATION_CHARACTERS} characters.`);
  const sentences = [...new Intl.Segmenter('en', { granularity: 'sentence' }).segment(input)].map(item => item.segment.trim()).filter(Boolean);
  const chunks: string[] = []; let current = '';
  for (const sentence of sentences) {
    if (sentence.length > MAX_SPEECH_CHUNK) throw new Error('A sentence in this review is too long to read aloud. Use shorter sentences and try again.');
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > MAX_SPEECH_CHUNK) { chunks.push(current); current = sentence; }
    else current = next;
  }
  if (current) chunks.push(current);
  return chunks;
}
