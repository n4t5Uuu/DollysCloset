const MEN_KEYWORDS = ["men", "mens", "menswear", "man", "male", "gent", "gents", "barong", "boy"];
const WOMEN_KEYWORDS = ["women", "womens", "womenswear", "woman", "female", "lady", "ladies", "girl"];
const CHILDREN_KEYWORDS = ["children", "child", "kids", "kid", "toddler", "toddlers", "boys", "girls"];

export const MEN_PLACEHOLDER = "/Men.png";
export const WOMEN_PLACEHOLDER = "/Women.png";
export const CHILDREN_PLACEHOLDER = "/Children.png";
export const DEFAULT_PRODUCT_PLACEHOLDER = "/placeholder-product.svg";

/**
 * Determines the appropriate product placeholder image based on the category or path.
 * It checks matches against men and women keywords, falling back generically if none match.
 * @param categoryOrPath - The category name string to parse.
 * @returns The absolute path string to the chosen placeholder profile picture or image.
 */
export function resolveProductPlaceholder(categoryOrPath: string | null | undefined) {
  const normalized = (categoryOrPath || "").toLowerCase();
  const tokens = normalized
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean);

  const tokenSet = new Set(tokens);
  const hasKeyword = (keywords: string[]) => keywords.some((keyword) => tokenSet.has(keyword));

  if (hasKeyword(WOMEN_KEYWORDS)) {
    return WOMEN_PLACEHOLDER;
  }

  if (hasKeyword(CHILDREN_KEYWORDS)) {
    return CHILDREN_PLACEHOLDER;
  }

  if (hasKeyword(MEN_KEYWORDS)) {
    return MEN_PLACEHOLDER;
  }

  if (normalized.includes("women")) return WOMEN_PLACEHOLDER;
  if (normalized.includes("children")) return CHILDREN_PLACEHOLDER;
  if (normalized.includes("men")) return MEN_PLACEHOLDER;

  return DEFAULT_PRODUCT_PLACEHOLDER;
}
