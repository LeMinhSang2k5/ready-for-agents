/** Bullet list: one blank line when placed after a line that already ends with `\n`. */
export function formatBulletList(items: string[]): string {
  if (items.length === 0) {
    return "\n- Not detected";
  }
  return `\n${items.map((item) => `- ${item}`).join("\n")}`;
}

export function formatFolderBullets(folders: string[]): string {
  return formatBulletList(folders.map((f) => `\`${f}/\``));
}

export function oneTrailingNewline(content: string): string {
  return content.replace(/\s+$/g, "") + "\n";
}
