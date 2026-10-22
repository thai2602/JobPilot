const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

const decodeEntity = (_match: string, entity: string): string => {
  if (entity.startsWith("#x") || entity.startsWith("#X")) {
    const codePoint = Number.parseInt(entity.slice(2), 16);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
  }
  if (entity.startsWith("#")) {
    const codePoint = Number.parseInt(entity.slice(1), 10);
    return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : _match;
  }
  return NAMED_ENTITIES[entity.toLowerCase()] ?? _match;
};

export const cleanApiText = (value?: string | null): string =>
  String(value ?? "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&([a-zA-Z]+|#\d+|#x[\da-fA-F]+);/g, decodeEntity)
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const splitApiText = (value?: string | null, limit = 6): string[] =>
  cleanApiText(value)
    .split(/\n+|\s*[•●▪]\s*/)
    .map((item) => item.replace(/^[-–—]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, limit);

/** Tách mô tả dài thành các đoạn ngắn: theo dòng trước, rồi gom câu nếu một đoạn quá dài. */
export const toParagraphs = (value?: string | null, maxLength = 360): string[] =>
  cleanApiText(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (line.length <= maxLength) return [line];
      const chunks: string[] = [];
      let current = "";
      for (const sentence of line.split(/(?<=[.!?])\s+/)) {
        if (current && current.length + sentence.length > maxLength) {
          chunks.push(current);
          current = sentence;
        } else {
          current = current ? `${current} ${sentence}` : sentence;
        }
      }
      if (current) chunks.push(current);
      return chunks;
    });
