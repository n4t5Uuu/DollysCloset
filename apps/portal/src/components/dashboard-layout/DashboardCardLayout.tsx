"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSwappingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@dollys-closet/core";
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@dollys-closet/ui";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  GripVertical,
  RotateCcw,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getDefaultDashboardLayout,
  normalizeDashboardLayoutPreference,
  type DashboardCardId,
  type DashboardLayoutPreference,
  type DashboardSurfaceKey,
} from "@/lib/dashboard-layout/config";

const MAIN_CONTAINER_ID = "__dashboard-main__";
const RAIL_CONTAINER_ID = "__dashboard-rail__";
const RAIL_EDGE_ID = "__dashboard-rail-edge__";

export interface DashboardCardDefinition {
  id: DashboardCardId;
  title: string;
  description?: string;
  icon?: ReactNode;
  headerMeta?: ReactNode;
  minimizedSummary?: ReactNode;
  collapsedClassName?: string;
  className?: string;
  contentClassName?: string;
  render: () => ReactNode;
}

interface DashboardCardLayoutProps {
  surface: DashboardSurfaceKey;
  cards: DashboardCardDefinition[];
  gridClassName?: string;
  desktopRailTopClass?: string;
  desktopRailTabTopClass?: string;
}

function serializeLayout(layout: DashboardLayoutPreference) {
  return JSON.stringify(layout);
}

function getLayoutCacheKey(surface: DashboardSurfaceKey) {
  return `dollys-dashboard-layout:${surface}`;
}
function getCardTransformString(transform: Parameters<typeof CSS.Transform.toString>[0]) {
  if (!transform) {
    return undefined;
  }

  return CSS.Transform.toString({
    ...transform,
    scaleX: 1,
    scaleY: 1,
  });
}


function DashboardDropZone({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver && "ring-2 ring-[#E7A3B0]/40 ring-offset-2 ring-offset-transparent"
      )}
    >
      {children}
    </div>
  );
}

function SortableMainCard({
  card,
  minimized,
  onToggleMinimized,
  onMoveToRail,
}: {
  card: DashboardCardDefinition;
  minimized: boolean;
  onToggleMinimized: () => void;
  onMoveToRail: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });
  const headerDetails = minimized ? card.minimizedSummary ?? card.description : card.description;

  return (
    <section
      ref={setNodeRef}
      style={{
        transform: getCardTransformString(transform),
        transition,
      }}
      className={cn(
        "relative min-w-0 max-w-full self-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow",
        "data-[dragging=true]:shadow-lg data-[dragging=true]:opacity-80",
        isDragging && "border-dashed border-[#E7A3B0]/30 bg-[#fff9fb]",
        card.className
      )}
      data-dragging={isDragging}
    >
      <div
        className={cn(
          "flex items-start gap-3 px-4 py-4",
          !minimized && "border-b border-gray-100",
          isDragging && "invisible"
        )}
      >
        <button
          type="button"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400 transition hover:border-[#E7A3B0]/40 hover:bg-[#fff5f7] hover:text-[#b96d7d]"
          aria-label={`Drag ${card.title}`}
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {card.icon ? <span className="shrink-0 text-[#E7A3B0]">{card.icon}</span> : null}
            <h2 className="text-sm font-semibold text-[#121212]">{card.title}</h2>
            {card.headerMeta ? <div className="shrink-0">{card.headerMeta}</div> : null}
          </div>
          {headerDetails ? (
            <div
              className={cn(
                "mt-1 text-xs leading-relaxed",
                minimized ? "font-medium text-[#8a6b73]" : "text-gray-400"
              )}
            >
              {headerDetails}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-gray-500 hover:text-[#b96d7d]"
                onClick={onToggleMinimized}
                aria-label={minimized ? `Expand ${card.title}` : `Minimize ${card.title}`}
              >
                {minimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              {minimized ? "Expand card" : "Minimize card"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-gray-500 hover:text-[#b96d7d]"
                onClick={onMoveToRail}
                aria-label={`Move ${card.title} to stored cards`}
              >
                <Archive className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8}>
              Store card in sidebar
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {!minimized ? (
        <div className={cn("p-4", isDragging && "invisible", card.contentClassName)}>{card.render()}</div>
      ) : null}

      {isDragging ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl">
          <div className="rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b96d7d] shadow-sm">
            Moving
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CollapsedMainCard({
  card,
  onExpand,
  onMoveToRail,
}: {
  card: DashboardCardDefinition;
  onExpand: () => void;
  onMoveToRail: () => void;
}) {
  const headerDetails = card.minimizedSummary ?? card.description;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-start gap-3 rounded-xl border border-[#E7A3B0]/20 bg-[#fff9fb] px-4 py-3 shadow-sm sm:min-w-[240px]",
        card.collapsedClassName
      )}
    >
      <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E7A3B0]/20 bg-white text-[#b96d7d]">
        {card.icon ?? <ChevronDown className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-[#121212]">{card.title}</h3>
          {card.headerMeta ? <div className="shrink-0">{card.headerMeta}</div> : null}
        </div>
        {headerDetails ? (
          <div className="mt-1 text-xs font-medium leading-relaxed text-[#8a6b73]">{headerDetails}</div>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-gray-500 hover:text-[#b96d7d]"
              onClick={onExpand}
              aria-label={`Expand ${card.title}`}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            Expand card
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-gray-500 hover:text-[#b96d7d]"
              onClick={onMoveToRail}
              aria-label={`Move ${card.title} to stored cards`}
            >
              <Archive className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            Store card in sidebar
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
function SortableRailItem({
  card,
  onRestore,
}: {
  card: DashboardCardDefinition;
  onRestore: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: getCardTransformString(transform),
        transition,
      }}
      className={cn(
        "rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm",
        isDragging && "opacity-80 shadow-lg"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-400 transition hover:border-[#E7A3B0]/40 hover:bg-[#fff5f7] hover:text-[#b96d7d]"
          aria-label={`Reorder stored ${card.title}`}
          style={{ touchAction: "none" }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {card.icon ? <span className="shrink-0 text-[#E7A3B0]">{card.icon}</span> : null}
            <p className="text-sm font-semibold text-[#121212]">{card.title}</p>
          </div>
          {card.description ? (
            <p className="mt-1 text-xs text-gray-400">{card.description}</p>
          ) : (
            <p className="mt-1 text-xs text-gray-400">Drag back into the dashboard when needed.</p>
          )}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-gray-500 hover:text-[#b96d7d]"
              onClick={onRestore}
              aria-label={`Restore ${card.title}`}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={8}>
            Restore card
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function DashboardCardLayout({
  surface,
  cards,
  gridClassName = "grid grid-cols-1 gap-4 xl:grid-cols-2",
  desktopRailTopClass = "top-24",
  desktopRailTabTopClass = "top-32",
}: DashboardCardLayoutProps) {
  const isMobile = useIsMobile();
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );
  const [layout, setLayout] = useState<DashboardLayoutPreference>(() =>
    getDefaultDashboardLayout(surface)
  );
  const [activeCardId, setActiveCardId] = useState<DashboardCardId | null>(null);
  const [desktopRailOpen, setDesktopRailOpen] = useState(false);
  const [mobileRailOpen, setMobileRailOpen] = useState(false);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const lastSavedLayoutRef = useRef(serializeLayout(getDefaultDashboardLayout(surface)));
  const pendingLayoutRef = useRef<DashboardLayoutPreference | null>(null);
  const isSavingRef = useRef(false);
  const cardMap = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const mainOrder = layout.mainOrder.filter((cardId) => cardMap.has(cardId));
  const railOrder = layout.railOrder.filter((cardId) => cardMap.has(cardId));
  const minimizedSet = useMemo(() => new Set(layout.minimized), [layout.minimized]);
  const collapsedOrder = mainOrder.filter((cardId) => minimizedSet.has(cardId));
  const expandedOrder = mainOrder.filter((cardId) => !minimizedSet.has(cardId));
  const activeCard = activeCardId ? cardMap.get(activeCardId) ?? null : null;

  const collisionDetection = useCallback<NonNullable<ComponentProps<typeof DndContext>["collisionDetection"]>>(
    (args) => {
      const prioritizeItems = (collisions: ReturnType<typeof closestCenter>) =>
        collisions.filter(
          ({ id }) =>
            id !== MAIN_CONTAINER_ID && id !== RAIL_CONTAINER_ID && id !== RAIL_EDGE_ID
        );

      const pointerCollisions = prioritizeItems(pointerWithin(args));
      if (pointerCollisions.length > 0) {
        return pointerCollisions;
      }

      const centerCollisions = closestCenter(args);
      const prioritizedCenterCollisions = prioritizeItems(centerCollisions);

      return prioritizedCenterCollisions.length > 0
        ? prioritizedCenterCollisions
        : centerCollisions;
    },
    []
  );

  const persistLayout = useCallback(
    async (nextLayout: DashboardLayoutPreference) => {
      const normalizedLayout = normalizeDashboardLayoutPreference(surface, nextLayout);
      const serializedLayout = serializeLayout(normalizedLayout);

      if (serializedLayout === lastSavedLayoutRef.current) {
        pendingLayoutRef.current = null;
        return;
      }

      if (isSavingRef.current) {
        pendingLayoutRef.current = normalizedLayout;
        return;
      }

      isSavingRef.current = true;

      try {
        const response = await fetch("/api/dashboard/preferences", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            surface,
            layout: normalizedLayout,
          }),
        });

        if (!response.ok) {
          let errorMessage = "Failed to save dashboard preferences";

          try {
            const errorResult = await response.json();
            if (typeof errorResult?.error === "string" && errorResult.error.trim().length > 0) {
              errorMessage = errorResult.error;
            }
          } catch {
            // Fall back to the generic error if the response body is empty.
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        const persistedLayout = normalizeDashboardLayoutPreference(
          surface,
          result?.data?.layout ?? normalizedLayout
        );
        const persistedSerialized = serializeLayout(persistedLayout);

        lastSavedLayoutRef.current = persistedSerialized;

        try {
          window.localStorage.setItem(getLayoutCacheKey(surface), persistedSerialized);
        } catch (error) {
          console.error("Unable to update cached dashboard preferences:", error);
        }
      } catch (error) {
        console.error("Unable to save dashboard preferences:", error);
      } finally {
        isSavingRef.current = false;

        const pendingLayout = pendingLayoutRef.current;
        pendingLayoutRef.current = null;

        if (pendingLayout) {
          const pendingSerialized = serializeLayout(pendingLayout);

          if (pendingSerialized !== lastSavedLayoutRef.current) {
            void persistLayout(pendingLayout);
          }
        }
      }
    },
    [surface]
  );

  useEffect(() => {
    const fallbackLayout = normalizeDashboardLayoutPreference(surface, getDefaultDashboardLayout(surface));
    const cacheKey = getLayoutCacheKey(surface);

    setLayout(fallbackLayout);
    setPreferencesReady(false);
    pendingLayoutRef.current = null;
    lastSavedLayoutRef.current = serializeLayout(fallbackLayout);

    try {
      const cachedLayout = window.localStorage.getItem(cacheKey);

      if (cachedLayout) {
        const parsedLayout = normalizeDashboardLayoutPreference(surface, JSON.parse(cachedLayout));
        setLayout(parsedLayout);
        lastSavedLayoutRef.current = serializeLayout(parsedLayout);
      }
    } catch (error) {
      console.error("Unable to load cached dashboard preferences:", error);
    }

    let cancelled = false;

    const loadPreferences = async () => {
      try {
        const response = await fetch(`/api/dashboard/preferences?surface=${surface}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          let errorMessage = "Failed to load dashboard preferences";

          try {
            const errorResult = await response.json();
            if (typeof errorResult?.error === "string" && errorResult.error.trim().length > 0) {
              errorMessage = errorResult.error;
            }
          } catch {
            // Fall back to the generic error if the response body is empty.
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        const normalizedLayout = normalizeDashboardLayoutPreference(
          surface,
          result?.data?.layout ?? fallbackLayout
        );
        const normalizedSerialized = serializeLayout(normalizedLayout);

        if (!cancelled) {
          setLayout(normalizedLayout);
          lastSavedLayoutRef.current = normalizedSerialized;

          try {
            window.localStorage.setItem(cacheKey, normalizedSerialized);
          } catch (error) {
            console.error("Unable to cache dashboard preferences:", error);
          }
        }
      } catch (error) {
        console.error("Unable to load dashboard preferences:", error);
      } finally {
        if (!cancelled) {
          setPreferencesReady(true);
        }
      }
    };

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [surface]);

  useEffect(() => {
    if (!preferencesReady) {
      return;
    }

    const serializedLayout = serializeLayout(layout);

    try {
      window.localStorage.setItem(getLayoutCacheKey(surface), serializedLayout);
    } catch (error) {
      console.error("Unable to cache dashboard preferences:", error);
    }

    if (serializedLayout === lastSavedLayoutRef.current) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      startTransition(() => {
        void persistLayout(layout);
      });
    }, 900);

    return () => {
      window.clearTimeout(saveTimer);
    };
  }, [layout, persistLayout, preferencesReady, surface]);
  const updateLayout = useCallback(
    (updater: (currentLayout: DashboardLayoutPreference) => DashboardLayoutPreference) => {
      setLayout((currentLayout) =>
        normalizeDashboardLayoutPreference(surface, updater(currentLayout))
      );
    },
    [surface]
  );

  const setCardMinimized = useCallback(
    (cardId: DashboardCardId) => {
      updateLayout((currentLayout) => {
        const isMinimized = currentLayout.minimized.includes(cardId);
        return {
          ...currentLayout,
          minimized: isMinimized
            ? currentLayout.minimized.filter((id) => id !== cardId)
            : [...currentLayout.minimized, cardId],
        };
      });
    },
    [updateLayout]
  );

  const moveCardToRail = useCallback(
    (cardId: DashboardCardId) => {
      updateLayout((currentLayout) => ({
        ...currentLayout,
        mainOrder: currentLayout.mainOrder.filter((id) => id !== cardId),
        railOrder: currentLayout.railOrder.includes(cardId)
          ? currentLayout.railOrder
          : [...currentLayout.railOrder, cardId],
        minimized: currentLayout.minimized.filter((id) => id !== cardId),
      }));

      if (isMobile) {
        setMobileRailOpen(true);
      } else {
        setDesktopRailOpen(true);
      }
    },
    [isMobile, updateLayout]
  );

  const restoreCardToMain = useCallback(
    (cardId: DashboardCardId) => {
      updateLayout((currentLayout) => ({
        ...currentLayout,
        mainOrder: currentLayout.mainOrder.includes(cardId)
          ? currentLayout.mainOrder
          : [...currentLayout.mainOrder, cardId],
        railOrder: currentLayout.railOrder.filter((id) => id !== cardId),
      }));
    },
    [updateLayout]
  );

  const findContainer = useCallback(
    (itemId: string) => {
      if (itemId === MAIN_CONTAINER_ID || mainOrder.includes(itemId as DashboardCardId)) {
        return MAIN_CONTAINER_ID;
      }

      if (
        itemId === RAIL_CONTAINER_ID ||
        itemId === RAIL_EDGE_ID ||
        railOrder.includes(itemId as DashboardCardId)
      ) {
        return RAIL_CONTAINER_ID;
      }

      return null;
    },
    [mainOrder, railOrder]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveCardId(event.active.id as DashboardCardId);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = typeof event.over?.id === "string" ? event.over.id : null;

    if (!overId || isMobile) {
      return;
    }

    if (overId === RAIL_EDGE_ID || findContainer(overId) === RAIL_CONTAINER_ID) {
      setDesktopRailOpen(true);
    }
  }, [findContainer, isMobile]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeId = event.active.id as DashboardCardId;
      const overId = typeof event.over?.id === "string" ? event.over.id : null;

      setActiveCardId(null);

      if (!overId) {
        return;
      }

      const sourceContainer = findContainer(activeId);
      const targetContainer = findContainer(overId);

      if (!sourceContainer || !targetContainer) {
        return;
      }

      const getTargetIndex = (items: DashboardCardId[]) => {
        if (overId === MAIN_CONTAINER_ID || overId === RAIL_CONTAINER_ID || overId === RAIL_EDGE_ID) {
          return items.length;
        }

        const targetIndex = items.indexOf(overId as DashboardCardId);
        return targetIndex >= 0 ? targetIndex : items.length;
      };

      updateLayout((currentLayout) => {
        const sourceItems =
          sourceContainer === MAIN_CONTAINER_ID
            ? currentLayout.mainOrder
            : currentLayout.railOrder;
        const targetItems =
          targetContainer === MAIN_CONTAINER_ID
            ? currentLayout.mainOrder
            : currentLayout.railOrder;
        const sourceIndex = sourceItems.indexOf(activeId);

        if (sourceIndex < 0) {
          return currentLayout;
        }

        if (sourceContainer === targetContainer) {
          const targetIndex = getTargetIndex(sourceItems);

          if (targetIndex === sourceIndex || targetIndex === sourceItems.length && sourceIndex === sourceItems.length - 1) {
            return currentLayout;
          }

          const movedItems = arrayMove(sourceItems, sourceIndex, targetIndex);

          return sourceContainer === MAIN_CONTAINER_ID
            ? { ...currentLayout, mainOrder: movedItems }
            : { ...currentLayout, railOrder: movedItems };
        }

        const nextSourceItems = sourceItems.filter((item) => item !== activeId);
        const insertionIndex = getTargetIndex(targetItems);
        const nextTargetItems = [...targetItems];
        nextTargetItems.splice(insertionIndex, 0, activeId);

        if (targetContainer === RAIL_CONTAINER_ID) {
          return {
            ...currentLayout,
            mainOrder: sourceContainer === MAIN_CONTAINER_ID ? nextSourceItems : nextTargetItems,
            railOrder: targetContainer === RAIL_CONTAINER_ID ? nextTargetItems : nextSourceItems,
            minimized: currentLayout.minimized.filter((id) => id !== activeId),
          };
        }

        return {
          ...currentLayout,
          mainOrder: targetContainer === MAIN_CONTAINER_ID ? nextTargetItems : nextSourceItems,
          railOrder: sourceContainer === RAIL_CONTAINER_ID ? nextSourceItems : nextTargetItems,
        };
      });

      if (!isMobile && targetContainer === RAIL_CONTAINER_ID) {
        setDesktopRailOpen(true);
      }
    },
    [findContainer, isMobile, updateLayout]
  );

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveCardId(null);
  }, []);

  const desktopRail = (
    <>
      <button
        type="button"
        className={cn(
          "pointer-events-auto fixed right-0 z-50 hidden rounded-l-2xl border border-r-0 border-[#E7A3B0]/20 bg-white/95 px-3 py-3 shadow-[0_12px_30px_-20px_rgba(17,24,39,0.35)] backdrop-blur transition-transform duration-300 md:block",
          desktopRailTabTopClass,
          desktopRailOpen ? "-translate-x-80" : "translate-x-0"
        )}
        onClick={() => setDesktopRailOpen((current) => !current)}
        onMouseEnter={() => setDesktopRailOpen(true)}
        onFocus={() => setDesktopRailOpen(true)}
        aria-expanded={desktopRailOpen}
        aria-controls={`${surface}-stored-cards`}
      >
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-[#b96d7d]" />
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b96d7d]">
              Stored
            </p>
            <p className="text-xs text-gray-500">
              {railOrder.length} card{railOrder.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </button>

      <div
        className={cn("pointer-events-none fixed right-0 bottom-6 z-40 hidden md:block", desktopRailTopClass)}
        onMouseEnter={() => setDesktopRailOpen(true)}
        onMouseLeave={() => {
          if (!activeCardId) {
            setDesktopRailOpen(false);
          }
        }}
        onFocusCapture={() => setDesktopRailOpen(true)}
        onBlurCapture={(event) => {
          if (activeCardId) {
            return;
          }

          const nextTarget = event.relatedTarget as Node | null;
          if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
            setDesktopRailOpen(false);
          }
        }}
      >
        <aside
          id={`${surface}-stored-cards`}
          className={cn(
            "pointer-events-auto h-full w-80 rounded-l-2xl border border-r-0 border-[#E7A3B0]/15 bg-white/95 shadow-[-18px_0_40px_-30px_rgba(17,24,39,0.35)] backdrop-blur transition-transform duration-300",
            desktopRailOpen ? "translate-x-0" : "translate-x-full"
          )}
        >
          <div className="flex h-full flex-col overflow-hidden rounded-l-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b96d7d]">
                Stored Cards
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Hover here or drag cards to the right edge to stash them for later.
              </p>
            </div>

            <DashboardDropZone
              id={RAIL_CONTAINER_ID}
              className="flex-1 overflow-y-auto px-4 py-4"
            >
              <SortableContext items={railOrder} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {railOrder.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#E7A3B0]/25 bg-[#fff9fb] px-4 py-6 text-center">
                      <p className="text-sm font-medium text-[#8a6b73]">No stored cards yet</p>
                      <p className="mt-1 text-xs text-gray-500">
                        Use the archive action on any card to keep the dashboard tidy without losing it.
                      </p>
                    </div>
                  ) : (
                    railOrder.map((cardId) => {
                      const card = cardMap.get(cardId);
                      return card ? (
                        <SortableRailItem
                          key={card.id}
                          card={card}
                          onRestore={() => restoreCardToMain(card.id)}
                        />
                      ) : null;
                    })
                  )}
                </div>
              </SortableContext>
            </DashboardDropZone>
          </div>
        </aside>
      </div>
    </>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {!isMobile ? (
        <>
          {desktopRail}
          {activeCardId ? (
            <DashboardDropZone id={RAIL_EDGE_ID} className="fixed inset-y-0 right-0 z-30 hidden w-6 md:block">
              <div className="h-full w-full" />
            </DashboardDropZone>
          ) : null}
        </>
      ) : (
        <div className="mb-4 flex justify-end md:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-[#E7A3B0]/25 text-[#b96d7d] hover:bg-[#fff5f7] hover:text-[#b96d7d]"
            onClick={() => setMobileRailOpen(true)}
          >
            <Archive className="h-4 w-4" />
            Stored cards
            <span className="rounded-full bg-[#fff1f4] px-2 py-0.5 text-[11px] font-semibold text-[#b96d7d]">
              {railOrder.length}
            </span>
          </Button>
        </div>
      )}

      {collapsedOrder.length > 0 ? (
        <div className="mb-4 w-full max-w-full overflow-hidden rounded-2xl border border-[#E7A3B0]/15 bg-[#fffdfd] px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b96d7d]">
                Collapsed Cards
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Expand a card when you want it back in the main workspace.
              </p>
            </div>
            <span className="rounded-full bg-[#fff1f4] px-2.5 py-1 text-xs font-semibold text-[#b96d7d]">
              {collapsedOrder.length}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {collapsedOrder.map((cardId) => {
              const card = cardMap.get(cardId);

              return card ? (
                <CollapsedMainCard
                  key={card.id}
                  card={card}
                  onExpand={() => setCardMinimized(card.id)}
                  onMoveToRail={() => moveCardToRail(card.id)}
                />
              ) : null;
            })}
          </div>
        </div>
      ) : null}

      <DashboardDropZone id={MAIN_CONTAINER_ID} className={cn("w-full max-w-full items-start", gridClassName)}>
        <SortableContext items={expandedOrder} strategy={rectSwappingStrategy}>
          {expandedOrder.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-[#E7A3B0]/25 bg-[#fff9fb] px-6 py-10 text-center">
              <p className="text-sm font-medium text-[#8a6b73]">
                {collapsedOrder.length > 0 ? "All visible cards are collapsed" : "All cards are in storage"}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {collapsedOrder.length > 0
                  ? "Expand a collapsed card above or restore one from the stored rail."
                  : "Restore any stored card from the right-side rail to rebuild this dashboard view."}
              </p>
            </div>
          ) : (
            expandedOrder.map((cardId) => {
              const card = cardMap.get(cardId);

              return card ? (
                <SortableMainCard
                  key={card.id}
                  card={card}
                  minimized={false}
                  onToggleMinimized={() => setCardMinimized(card.id)}
                  onMoveToRail={() => moveCardToRail(card.id)}
                />
              ) : null;
            })
          )}
        </SortableContext>
      </DashboardDropZone>

      <Sheet open={isMobile && mobileRailOpen} onOpenChange={setMobileRailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader className="border-b border-gray-100">
            <SheetTitle>Stored Cards</SheetTitle>
            <SheetDescription>
              Reorder stored cards here or restore them to the dashboard when you need them again.
            </SheetDescription>
          </SheetHeader>
          <DashboardDropZone id={RAIL_CONTAINER_ID} className="flex-1 overflow-y-auto px-4 py-4">
            <SortableContext items={railOrder} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {railOrder.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#E7A3B0]/25 bg-[#fff9fb] px-4 py-6 text-center">
                    <p className="text-sm font-medium text-[#8a6b73]">No stored cards yet</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Store cards from the dashboard to build a more focused view.
                    </p>
                  </div>
                ) : (
                  railOrder.map((cardId) => {
                    const card = cardMap.get(cardId);
                    return card ? (
                      <SortableRailItem
                        key={card.id}
                        card={card}
                        onRestore={() => restoreCardToMain(card.id)}
                      />
                    ) : null;
                  })
                )}
              </div>
            </SortableContext>
          </DashboardDropZone>
        </SheetContent>
      </Sheet>

      <DragOverlay>
        {activeCard ? (
          <div className="w-[280px] rounded-xl border border-[#E7A3B0]/25 bg-white px-4 py-3 shadow-[0_18px_48px_-20px_rgba(17,24,39,0.35)]">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-[#b96d7d]" />
              <p className="text-sm font-semibold text-[#121212]">{activeCard.title}</p>
            </div>
            {activeCard.description ? (
              <p className="mt-1 text-xs text-gray-500">{activeCard.description}</p>
            ) : null}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}















