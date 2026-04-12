"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { InventoryCategory as Category } from "@dollys-closet/core";

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
  const [isMobileView, setIsMobileView] = useState(false);
  const isMobileViewRef = useRef(false);
  const [drillPath, setDrillPath] = useState<Array<string | number>>([]);

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

  useEffect(() => {
    if (!isOpen || !isMobileViewRef.current) return;
    setDrillPath([]);
  }, [isOpen]);

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
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
          isActive || isSelected
            ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium"
            : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
        }`}
      >
        <span className="truncate pr-2">{category.category_name}</span>
        <span className="flex items-center gap-1">
          {isSelected && <Check className="h-4 w-4 text-[#8CA2B4]" />}
          {itemHasChildren && <ChevronRight className="h-4 w-4 text-zinc-400" />}
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
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
          isActive || isSelected
            ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium"
            : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
        }`}
      >
        <span className="truncate pr-2">{rootGroup.label}</span>
        <span className="flex items-center gap-1">
          {isSelected && <Check className="h-4 w-4 text-[#8CA2B4]" />}
          {hasAnyChildren && <ChevronRight className="h-4 w-4 text-zinc-400" />}
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
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={selectedLabel}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        isMobileView ? (
          <div className="fixed inset-x-2 bottom-2 z-50 rounded-xl border border-black bg-white shadow-xl overflow-hidden flex flex-col max-h-[70vh]">
            <div className="flex items-center gap-1 border-b border-zinc-100 px-3 py-2.5 shrink-0">
              {drillPath.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setDrillPath((p) => p.slice(0, -1))}
                  className="flex items-center justify-center rounded-md p-1 hover:bg-zinc-100 -ml-1 mr-1"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-600" />
                </button>
              ) : (
                <div className="w-6 mr-1" />
              )}
              <span className="flex-1 text-sm font-semibold text-zinc-800 truncate">
                {drillPath.length === 0
                  ? "Category"
                  : drillPath.length === 1
                    ? (rootGroupByKey.get(drillPath[0] as string)?.label ?? "Category")
                    : (categoryById.get(drillPath[1] as number)?.category_name ?? "Category")}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center rounded-md p-1 hover:bg-zinc-100 -mr-1"
              >
                <X className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
              {drillPath.length === 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => { onValueChange("all"); setIsOpen(false); }}
                    className={`w-full flex items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                      value === "all" ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium" : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
                    }`}
                  >
                    <span className="flex-1">All Categories</span>
                    {value === "all" && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                  {firstColumn.map((rootGroup) => {
                    const hasAny = rootGroup.rootIds.some((id) => hasChildren(id));
                    const isSelected = selectedRootGroupKey === rootGroup.key;
                    return (
                      <button
                        key={rootGroup.key}
                        type="button"
                        onClick={() => {
                          if (hasAny) {
                            setDrillPath([rootGroup.key]);
                          } else {
                            onValueChange(`rootgroup:${rootGroup.key}`);
                            setIsOpen(false);
                          }
                        }}
                        className={`w-full flex items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                          isSelected ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium" : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
                        }`}
                      >
                        <span className="flex-1 truncate">{rootGroup.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-[#8CA2B4] shrink-0 mr-1" />}
                        {hasAny && <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />}
                      </button>
                    );
                  })}
                </>
              )}
              {drillPath.length === 1 && (() => {
                const rootKey = drillPath[0] as string;
                const group = rootGroupByKey.get(rootKey);
                if (!group) return null;
                const isRootSelected = selectedRootGroupKey === rootKey;
                const level2Items: Category[] = [];
                const seen = new Set<number>();
                group.rootIds.forEach((rootId) => {
                  (childrenByParent.get(rootId) || []).forEach((cat) => {
                    const id = Number(cat.category_id);
                    if (!seen.has(id)) { seen.add(id); level2Items.push(cat); }
                  });
                });
                level2Items.sort(sortById);
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => { onValueChange(`rootgroup:${rootKey}`); setIsOpen(false); }}
                      className={`w-full flex items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                        isRootSelected ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium" : "text-zinc-500 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
                      }`}
                    >
                      <span className="flex-1">All {group.label}</span>
                      {isRootSelected && <Check className="h-4 w-4 text-[#8CA2B4] shrink-0" />}
                    </button>
                    {level2Items.length === 0 && <div className="px-3 py-2 text-sm text-zinc-400">No subcategories</div>}
                    {level2Items.map((cat) => {
                      const catId = Number(cat.category_id);
                      const catHasChildren = hasChildren(catId);
                      const isSelected = selectedCategoryId === catId;
                      return (
                        <button
                          key={cat.category_id}
                          type="button"
                          onClick={() => {
                            if (catHasChildren) {
                              setDrillPath([rootKey, catId]);
                            } else {
                              onValueChange(String(catId));
                              setIsOpen(false);
                            }
                          }}
                          className={`w-full flex items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                            isSelected ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium" : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
                          }`}
                        >
                          <span className="flex-1 truncate">{cat.category_name}</span>
                          {isSelected && <Check className="h-4 w-4 text-[#8CA2B4] shrink-0 mr-1" />}
                          {catHasChildren && <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </>
                );
              })()}
              {drillPath.length === 2 && (() => {
                const secondId = drillPath[1] as number;
                const parentCat = categoryById.get(secondId);
                const level3Items = childrenByParent.get(secondId) || [];
                const isParentSelected = selectedCategoryId === secondId;
                return (
                  <>
                    <button
                      type="button"
                      onClick={() => { onValueChange(String(secondId)); setIsOpen(false); }}
                      className={`w-full flex items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                        isParentSelected ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium" : "text-zinc-500 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
                      }`}
                    >
                      <span className="flex-1">All {parentCat?.category_name}</span>
                      {isParentSelected && <Check className="h-4 w-4 text-[#8CA2B4] shrink-0" />}
                    </button>
                    {level3Items.length === 0 && <div className="px-3 py-2 text-sm text-zinc-400">No subcategories</div>}
                    {level3Items.map((cat) => {
                      const catId = Number(cat.category_id);
                      const isSelected = selectedCategoryId === catId;
                      return (
                        <button
                          key={cat.category_id}
                          type="button"
                          onClick={() => { onValueChange(String(catId)); setIsOpen(false); }}
                          className={`w-full flex items-center rounded-lg px-3 py-2.5 text-left text-sm ${
                            isSelected ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium" : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
                          }`}
                        >
                          <span className="flex-1 truncate">{cat.category_name}</span>
                          {isSelected && <Check className="h-4 w-4 text-[#8CA2B4] shrink-0" />}
                        </button>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          <div className={`absolute z-50 mt-2 w-[min(90vw,580px)] max-w-[calc(100vw-1rem)] rounded-xl border border-black bg-white p-2.5 shadow-xl ${alignRight ? "right-0" : "left-0"}`}>
            <button
              type="button"
              onClick={() => {
                onValueChange("all");
                setIsOpen(false);
              }}
              className={`mb-2 w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                value === "all"
                  ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium"
                  : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
              }`}
            >
              <span>All Categories</span>
              {value === "all" && <Check className="h-4 w-4" />}
            </button>

            <div className="grid grid-cols-3 gap-2">
              <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1">
                {firstColumn.length > 0 ? firstColumn.map((rootGroup) => renderRootItem(rootGroup)) : (
                  <div className="px-3 py-2 text-sm text-zinc-400">No categories found</div>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1">
                {secondColumn.length > 0 ? secondColumn.map((category) => renderItem(category, 2)) : (
                  <div className="px-3 py-2 text-sm text-zinc-400">Select a parent category</div>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1">
                {thirdColumn.length > 0 ? thirdColumn.map((category) => renderItem(category, 3)) : (
                  <div className="px-3 py-2 text-sm text-zinc-300">Select a subcategory</div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

