const MEN_KEYWORDS = ["men", "mens", "menswear", "man", "male", "gent", "gents", "barong", "boy"];
const WOMEN_KEYWORDS = ["women", "womens", "womenswear", "woman", "female", "lady", "ladies", "girl"];

export const MEN_PLACEHOLDER = "/Men.png";
export const WOMEN_PLACEHOLDER = "/Women.png";
export const DEFAULT_PRODUCT_PLACEHOLDER = "/placeholder-product.svg";

export function resolveProductPlaceholder(categoryOrPath: string | null | undefined) {
  const normalized = (categoryOrPath || "").toLowerCase();
  const tokens = normalized
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);

  const hasKeyword = (keywords: string[]) => keywords.some((keyword) => tokens.includes(keyword));

  if (hasKeyword(WOMEN_KEYWORDS)) {
    return WOMEN_PLACEHOLDER;
  }

  if (hasKeyword(MEN_KEYWORDS)) {
    return MEN_PLACEHOLDER;
  }

  if (normalized.includes("women")) return WOMEN_PLACEHOLDER;
  if (normalized.includes("men")) return MEN_PLACEHOLDER;

  return DEFAULT_PRODUCT_PLACEHOLDER;
}
