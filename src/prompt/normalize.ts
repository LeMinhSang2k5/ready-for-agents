/** Conservative filler phrases (VI + EN). Whole-phrase only. */
const FILLER_PATTERNS: RegExp[] = [
  /(?:^|\s)(bạn hãy|bạn có thể|giúp tôi|giúp mình|nếu được|có thể|một xíu|một chút|nhé|nhá|ạ|ơi)(?=\s|$|[,.])/giu,
  /(?:^|\s)(tôi muốn bạn|mình muốn bạn|tôi cần bạn|mình cần bạn)(?=\s|$|[,.])/giu,
  /\b(please|could you|would you|if possible|kindly)\b/giu,
  /\b(i want you to|i need you to)\b/giu,
];

const PARTICLE_ONLY =
  /^(nhé|nhá|ạ|ơi|please|thanks|ok|okay|yes|no|[,.!\s])+$/iu;

export function normalizePromptText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return "";

  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  text = text.replace(/\n{3,}/g, "\n\n");

  for (const pattern of FILLER_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  text = text.replace(/[ \t]+/g, " ").trim();
  text = text.replace(/^[,.\s]+|[,.\s]+$/g, "");

  if (!text || PARTICLE_ONLY.test(text)) {
    return "";
  }

  return text;
}
