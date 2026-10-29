import { useEffect, useEffectEvent, useRef, useState, type RefObject } from "react";
import type { RootGroup } from "./useCategoryTree";

/** Calls `onDismiss` on an outside mousedown or Escape. */
export function useDismiss(containerRef: RefObject<HTMLElement | null>, onDismiss: () => void) {
  const dismiss = useEffectEvent(onDismiss);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) dismiss();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [containerRef]);
}

/** Tracks the mobile breakpoint; the ref gives handlers the latest value without re-running effects. */
export function useIsMobileView() {
  const [isMobileView, setIsMobileView] = useState(false);
  const isMobileViewRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handleMqChange = (e: MediaQueryList | MediaQueryListEvent) => {
      isMobileViewRef.current = e.matches;
      setIsMobileView(e.matches);
    };
    handleMqChange(mq);
    mq.addEventListener("change", handleMqChange);
    return () => mq.removeEventListener("change", handleMqChange);
  }, []);

  return { isMobileView, isMobileViewRef };
}

/** Whether the desktop panel should open towards the left to stay on screen. Call `measure` when opening. */
export function useAlignRight(containerRef: RefObject<HTMLElement | null>) {
  const [alignRight, setAlignRight] = useState(false);

  const measure = () => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const panelWidth = Math.min(580, window.innerWidth - 16);
    const wouldOverflowRight = containerRect.left + panelWidth > window.innerWidth - 8;
    const hasLeftSpace = containerRect.right - panelWidth >= 8;

    setAlignRight(wouldOverflowRight && hasLeftSpace);
  };

  return { alignRight, measure };
}

/** Splits the filter value ("all", "rootgroup:key" or a category id) and builds its label. */
export function resolveFilterSelection(
  value: string,
  rootGroupByKey: Map<string, RootGroup>,
  getCategoryPath: (categoryId: number) => string
) {
  const isRootGroupValue = value.startsWith("rootgroup:");
  const selectedRootGroupKey = isRootGroupValue ? value.slice("rootgroup:".length) : null;
  const selectedCategoryId = value === "all" || isRootGroupValue ? null : Number(value);

  let selectedLabel = "All Categories";
  if (selectedRootGroupKey !== null) {
    selectedLabel = rootGroupByKey.get(selectedRootGroupKey)?.label ?? selectedLabel;
  } else if (selectedCategoryId && !Number.isNaN(selectedCategoryId)) {
    selectedLabel = getCategoryPath(selectedCategoryId) || "Unknown";
  }

  return { selectedRootGroupKey, selectedCategoryId, selectedLabel };
}
