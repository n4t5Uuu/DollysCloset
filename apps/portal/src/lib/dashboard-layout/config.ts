export const DASHBOARD_LAYOUT_VERSION = 1 as const;

export const DASHBOARD_SURFACE_CARD_IDS = {
  admin_dashboard_home: [
    "stock-alerts",
    "missing-images",
    "recently-edited",
    "activity-log",
  ],
  employee_dashboard_home: [
    "stock-alerts",
    "missing-images",
    "recently-edited",
    "activity-log",
  ],
  admin_analytics_overview: [
    "daily-traffic",
    "monthly-traffic",
    "customer-pages",
    "internal-pages",
    "devices",
  ],
  admin_analytics_products: [
    "top-categories",
    "most-edited-products",
    "most-viewed-products",
    "stock-alerts",
    "missing-images",
  ],
} as const;

type SurfaceCardsMap = typeof DASHBOARD_SURFACE_CARD_IDS;
type SurfaceCardsValue = SurfaceCardsMap[keyof SurfaceCardsMap];

export type DashboardSurfaceKey = keyof SurfaceCardsMap;
export type DashboardCardId = SurfaceCardsValue[number];
export type DashboardPreferenceRole = "admin" | "employee";

export interface DashboardLayoutPreference {
  version: typeof DASHBOARD_LAYOUT_VERSION;
  mainOrder: DashboardCardId[];
  railOrder: DashboardCardId[];
  minimized: DashboardCardId[];
}

const DASHBOARD_SURFACE_ALLOWED_ROLES: Record<
  DashboardSurfaceKey,
  readonly DashboardPreferenceRole[]
> = {
  admin_dashboard_home: ["admin"],
  employee_dashboard_home: ["employee"],
  admin_analytics_overview: ["admin"],
  admin_analytics_products: ["admin"],
};

export function isDashboardSurfaceKey(value: string): value is DashboardSurfaceKey {
  return value in DASHBOARD_SURFACE_CARD_IDS;
}

export function canAccessDashboardSurface(
  role: DashboardPreferenceRole,
  surface: DashboardSurfaceKey
) {
  return DASHBOARD_SURFACE_ALLOWED_ROLES[surface].includes(role);
}

export function getDefaultDashboardLayout(
  surface: DashboardSurfaceKey
): DashboardLayoutPreference {
  return {
    version: DASHBOARD_LAYOUT_VERSION,
    mainOrder: [...DASHBOARD_SURFACE_CARD_IDS[surface]],
    railOrder: [],
    minimized: [],
  };
}

function collectKnownCardIds(surface: DashboardSurfaceKey, value: unknown) {
  if (!Array.isArray(value)) return [];

  const knownIds = new Set<string>(DASHBOARD_SURFACE_CARD_IDS[surface]);
  const seen = new Set<DashboardCardId>();
  const result: DashboardCardId[] = [];

  for (const candidate of value) {
    if (typeof candidate !== "string" || !knownIds.has(candidate) || seen.has(candidate as DashboardCardId)) {
      continue;
    }

    const cardId = candidate as DashboardCardId;
    seen.add(cardId);
    result.push(cardId);
  }

  return result;
}

export function normalizeDashboardLayoutPreference(
  surface: DashboardSurfaceKey,
  value: unknown
): DashboardLayoutPreference {
  const fallback = getDefaultDashboardLayout(surface);

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<DashboardLayoutPreference>;
  const railOrder = collectKnownCardIds(surface, candidate.railOrder);
  const railSet = new Set<DashboardCardId>(railOrder);
  const mainOrder = collectKnownCardIds(surface, candidate.mainOrder).filter(
    (cardId) => !railSet.has(cardId)
  );

  const assigned = new Set<DashboardCardId>([...mainOrder, ...railOrder]);
  const missingCards = fallback.mainOrder.filter((cardId) => !assigned.has(cardId));
  const nextMainOrder = [...mainOrder, ...missingCards];
  const mainSet = new Set<DashboardCardId>(nextMainOrder);
  const minimized = collectKnownCardIds(surface, candidate.minimized).filter((cardId) =>
    mainSet.has(cardId)
  );

  return {
    version: DASHBOARD_LAYOUT_VERSION,
    mainOrder: nextMainOrder,
    railOrder,
    minimized,
  };
}
