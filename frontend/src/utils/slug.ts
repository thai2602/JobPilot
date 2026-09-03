export const generateSlug = (text: string): string =>
   text
      .trim()
      .normalize("NFD")
      .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
