"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { InventoryCategory as Category } from "@/types/inventory.types";

interface CategoryCascadingFilterProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

function sortById(firstCategory: Category, secondCategory: Category) {
  return Number(firstCategory.category_id) - Number(secondCategory.category_id);
}

export default function CategoryCascadingFilter({
  categories,
  value,
  onValueChange,
  className = "",
}: CategoryCascadingFilterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeRootKey, setActiveRootKey] = useState<string | null>(null);
  const [activeSecondLevelId, setActiveSecondLevelId] = useState<number | null>(null);
  const [alignRight, setAlignRight] = useState(false);

  const normalizeName = (categoryName: string) => categoryName.trim().toLowerCase();

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, Category[]>();

    categories.forEach((category) => {
      const parentId = category.parent_category;
      const existing = map.get(parentId) || [];
      existing.push(category);
      map.set(parentId, existing);
    });

    map.forEach((groupedCategories, key) => {
      map.set(key, [...groupedCategories].sort(sortById));
    });

    return map;
  }, [categories]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [Number(category.category_id), category])),
    [categories]
  );

  const rootCategoryGroups = useMemo(() => {
    const rootCategories = childrenByParent.get(null) || [];
    const groupedRoots = new Map<
      string,
      { key: string; label: string; rootIds: number[] }
    >();

    rootCategories.forEach((rootCategory) => {
      const key = normalizeName(rootCategory.category_name);
      const existing = groupedRoots.get(key);
      const rootId = Number(rootCategory.category_id);

      if (existing) {
        existing.rootIds.push(rootId);
        return;
      }

      groupedRoots.set(key, {
        key,
        label: rootCategory.category_name,
        rootIds: [rootId],
      });
    });

    return Array.from(groupedRoots.values()).map((group) => ({
      ...group,
      rootIds: [...group.rootIds].sort((firstId, secondId) => firstId - secondId),
    }));
  }, [childrenByParent]);

  const rootGroupByRootId = useMemo(() => {
    const map = new Map<number, string>();

    rootCategoryGroups.forEach((group) => {
      group.rootIds.forEach((rootId) => {
        map.set(rootId, group.key);
      });
    });

    return map;
  }, [rootCategoryGroups]);

  const rootGroupByKey = useMemo(() => {
    const map = new Map<string, { key: string; label: string; rootIds: number[] }>();
    rootCategoryGroups.forEach((group) => map.set(group.key, group));
    return map;
  }, [rootCategoryGroups]);

  const hasChildren = (categoryId: number) => {
    return (childrenByParent.get(categoryId) || []).length > 0;
  };

  const getCategoryPath = (categoryId: number) => {
    const category = categoryById.get(categoryId);
    if (!category) return "Unknown";

    const path: string[] = [category.category_name];
    let parentId = category.parent_category;
    const visited = new Set<number>([categoryId]);

    while (parentId !== null) {
      if (visited.has(parentId)) break;
      visited.add(parentId);

      const parentCategory = categoryById.get(parentId);
      if (!parentCategory) break;

      path.unshift(parentCategory.category_name);
      parentId = parentCategory.parent_category;
    }

    return path.join(" > ");
  };

  const isRootGroupValue = value.startsWith("rootgroup:");
  const selectedRootGroupKey = isRootGroupValue ? value.slice("rootgroup:".length) : null;
  const selectedCategoryId = value === "all" || isRootGroupValue ? null : Number(value);
  const selectedLabel = isRootGroupValue
    ? (rootGroupByKey.get(selectedRootGroupKey!)?.label ?? "All Categories")
    : selectedCategoryId && !Number.isNaN(selectedCategoryId)
      ? getCategoryPath(selectedCategoryId)
      : "All Categories";

  useEffect(() => {
    if (!isOpen) return;

    if (selectedRootGroupKey) {
      setActiveRootKey(selectedRootGroupKey);
      setActiveSecondLevelId(null);
      return;
    }

    if (selectedCategoryId && !Number.isNaN(selectedCategoryId)) {
      const selectedCategory = categoryById.get(selectedCategoryId);

      if (!selectedCategory) {
        setActiveRootKey(rootCategoryGroups[0]?.key ?? null);
        setActiveSecondLevelId(null);
        return;
      }

      let rootId = Number(selectedCategory.category_id);
      let childId: number | null = null;
      let parentId = selectedCategory.parent_category;

      while (parentId !== null) {
        childId = rootId;
        rootId = parentId;
        const parent = categoryById.get(parentId);
        parentId = parent?.parent_category ?? null;
      }

      setActiveRootKey(rootGroupByRootId.get(rootId) ?? rootCategoryGroups[0]?.key ?? null);
      setActiveSecondLevelId(childId);
      return;
    }

    setActiveRootKey(rootCategoryGroups[0]?.key ?? null);
    setActiveSecondLevelId(null);
  }, [isOpen, selectedRootGroupKey, selectedCategoryId, categoryById, rootCategoryGroups, rootGroupByRootId]);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const panelWidth = Math.min(580, window.innerWidth - 16);
    const wouldOverflowRight = containerRect.left + panelWidth > window.innerWidth - 8;
    const hasLeftSpace = containerRect.right - panelWidth >= 8;

    setAlignRight(wouldOverflowRight && hasLeftSpace);
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const firstColumn = rootCategoryGroups;

  const secondColumn = useMemo(() => {
    if (!activeRootKey) return [];

    const group = rootGroupByKey.get(activeRootKey);
    if (!group) return [];

    const combinedChildren: Category[] = [];
    const seenCategoryIds = new Set<number>();

    group.rootIds.forEach((rootId) => {
      const children = childrenByParent.get(rootId) || [];
      children.forEach((childCategory) => {
        const childId = Number(childCategory.category_id);
        if (seenCategoryIds.has(childId)) return;
        seenCategoryIds.add(childId);
        combinedChildren.push(childCategory);
      });
    });

    return combinedChildren.sort(sortById);
  }, [activeRootKey, rootGroupByKey, childrenByParent]);

  const thirdColumn = activeSecondLevelId !== null ? childrenByParent.get(activeSecondLevelId) || [] : [];

  const handleLeafSelect = (categoryId: number) => {
    onValueChange(String(categoryId));
    setIsOpen(false);
  };

  const renderItem = (category: Category, level: 2 | 3) => {
    const categoryId = Number(category.category_id);
    const itemHasChildren = hasChildren(categoryId);
    const isSelected = selectedCategoryId === categoryId;
    const isActive = level === 2 && activeSecondLevelId === categoryId;

    return (
      <button
        key={category.category_id}
        type="button"
        onMouseEnter={() => {
          if (level === 2) {
            setActiveSecondLevelId(categoryId);
          }
        }}
        onClick={() => {
          onValueChange(String(categoryId));
          setIsOpen(false);
        }}
        className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/90 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="truncate pr-2">{category.category_name}</span>
        <span className="flex items-center gap-1">
          {isSelected && <Check className="h-4 w-4" />}
          {itemHasChildren && <ChevronRight className="h-4 w-4 text-white/60" />}
        </span>
      </button>
    );
  };

  const renderRootItem = (rootGroup: { key: string; label: string; rootIds: number[] }) => {
    const hasAnyChildren = rootGroup.rootIds.some((rootId) => hasChildren(rootId));
    const isActive = activeRootKey === rootGroup.key;
    const isSelected = selectedRootGroupKey === rootGroup.key;

    return (
      <button
        key={rootGroup.key}
        type="button"
        onMouseEnter={() => {
          setActiveRootKey(rootGroup.key);
          setActiveSecondLevelId(null);
        }}
        onClick={() => {
          onValueChange(`rootgroup:${rootGroup.key}`);
          setIsOpen(false);
        }}
        className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
          isActive
            ? "bg-white/10 text-white"
            : "text-white/90 hover:bg-white/10 hover:text-white"
        }`}
      >
        <span className="truncate pr-2">{rootGroup.label}</span>
        <span className="flex items-center gap-1">
          {isSelected && <Check className="h-4 w-4" />}
          {hasAnyChildren && <ChevronRight className="h-4 w-4 text-white/60" />}
        </span>
      </button>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        className="w-[180px] h-9 px-3 border border-input rounded-md bg-white text-sm text-gray-900 flex items-center justify-between"
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <div className={`absolute z-50 mt-2 w-[min(90vw,580px)] max-w-[calc(100vw-1rem)] rounded-lg border border-[#1b2a47] bg-[#020b20] p-2 shadow-2xl ${alignRight ? "right-0" : "left-0"}`}>
          <button
            type="button"
            onClick={() => {
              onValueChange("all");
              setIsOpen(false);
            }}
            className={`mb-2 w-full flex items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
              value === "all"
                ? "bg-white/10 text-white"
                : "text-white/90 hover:bg-white/10 hover:text-white"
            }`}
          >
            <span>All Categories</span>
            {value === "all" && <Check className="h-4 w-4" />}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <div className="max-h-72 overflow-y-auto rounded-md border border-white/10 p-1">
              {firstColumn.length > 0 ? firstColumn.map((rootGroup) => renderRootItem(rootGroup)) : (
                <div className="px-3 py-2 text-sm text-white/60">No categories found</div>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border border-white/10 p-1">
              {secondColumn.length > 0 ? secondColumn.map((category) => renderItem(category, 2)) : (
                <div className="px-3 py-2 text-sm text-white/60">Select a parent category</div>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto rounded-md border border-white/10 p-1">
              {thirdColumn.length > 0 ? thirdColumn.map((category) => renderItem(category, 3)) : (
                <div className="px-3 py-2 text-sm text-white/60">Select a subcategory</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
