export const PALETTE: Array<{ bg: string; border: string }> = [
  { bg: "#DBEAFE", border: "#93C5FD" }, // blue
  { bg: "#D1FAE5", border: "#6EE7B7" }, // emerald
  { bg: "#FEF3C7", border: "#FCD34D" }, // amber
  { bg: "#EDE9FE", border: "#C4B5FD" }, // violet
  { bg: "#FED7AA", border: "#FDBA74" }, // orange
  { bg: "#CFFAFE", border: "#67E8F9" }, // cyan
  { bg: "#FCE7F3", border: "#F9A8D4" }, // pink
  { bg: "#DCFCE7", border: "#86EFAC" }, // green
  { bg: "#FEF9C3", border: "#FDE047" }, // yellow
  { bg: "#FFE4E6", border: "#FCA5A5" }, // rose
  { bg: "#E0E7FF", border: "#A5B4FC" }, // indigo
];

export const SEL_BG = "#FEE2E9";
export const SEL_BORDER = "#E7A3B0";

export function getSeasonColor(
  seasonId: string,
  seasons: Array<{ id: string }>,
  editingSeasonId: string | null,
): { bg: string; border: string } {
  if (seasonId === editingSeasonId) return { bg: SEL_BG, border: SEL_BORDER };
  const others = seasons.filter((s) => s.id !== editingSeasonId);
  const idx = others.findIndex((s) => s.id === seasonId);
  return PALETTE[idx < 0 ? 0 : idx % PALETTE.length];
}
