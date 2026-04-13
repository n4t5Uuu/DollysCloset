"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { InventoryCategory as Category } from "@dollys-closet/core";
import { Input } from "@dollys-closet/ui";

interface CategoryCascadingSelectProps {
  categories: Category[];
  value: string; // numeric category ID string, or ""
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function sortById(a: Category, b: Category) {
  return Number(a.category_id) - Number(b.category_id);
}

export default function CategoryCascadingSelect({
  categories,
  value,
  onValueChange,
  className = "",
  placeholder = "Select category",
}: CategoryCascadingSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [activeRootKey, setActiveRootKey] = useState<string | null>(null);
  const [activeSecondLevelId, setActiveSecondLevelId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const normalizeName = (name: string) => name.trim().toLowerCase();

  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, Category[]>();
    categories.forEach((cat) => {
      const parentId = cat.parent_category;
      const existing = map.get(parentId) || [];
      existing.push(cat);
      map.set(parentId, existing);
    });
    map.forEach((cats, key) => map.set(key, [...cats].sort(sortById)));
    return map;
  }, [categories]);

  const categoryById = useMemo(
    () => new Map(categories.map((cat) => [Number(cat.category_id), cat])),
    [categories]
  );

  const rootCategoryGroups = useMemo(() => {
    const rootCategories = childrenByParent.get(null) || [];
    const groups = new Map<string, { key: string; label: string; rootIds: number[] }>();
    rootCategories.forEach((cat) => {
      const key = normalizeName(cat.category_name);
      const existing = groups.get(key);
      const rootId = Number(cat.category_id);
      if (existing) {
        existing.rootIds.push(rootId);
        return;
      }
      groups.set(key, { key, label: cat.category_name, rootIds: [rootId] });
    });
    return Array.from(groups.values()).map((g) => ({
      ...g,
      rootIds: [...g.rootIds].sort((a, b) => a - b),
    }));
  }, [childrenByParent]);

  const rootGroupByKey = useMemo(() => {
    const map = new Map<string, { key: string; label: string; rootIds: number[] }>();
    rootCategoryGroups.forEach((g) => map.set(g.key, g));
    return map;
  }, [rootCategoryGroups]);

  const rootGroupByRootId = useMemo(() => {
    const map = new Map<number, string>();
    rootCategoryGroups.forEach((g) => g.rootIds.forEach((id) => map.set(id, g.key)));
    return map;
  }, [rootCategoryGroups]);

  const hasChildren = (categoryId: number) =>
    (childrenByParent.get(categoryId) || []).length > 0;

  const getCategoryPath = (categoryId: number) => {
    const cat = categoryById.get(categoryId);
    if (!cat) return "";
    const path: string[] = [cat.category_name];
    let parentId = cat.parent_category;
    const visited = new Set<number>([categoryId]);
    while (parentId !== null) {
      if (visited.has(parentId)) break;
      visited.add(parentId);
      const parent = categoryById.get(parentId);
      if (!parent) break;
      path.unshift(parent.category_name);
      parentId = parent.parent_category;
    }
    return path.join(" > ");
  };

  const selectedCategoryId = value ? Number(value) : null;
  const selectedLabel =
    selectedCategoryId && !Number.isNaN(selectedCategoryId)
      ? getCategoryPath(selectedCategoryId)
      : null;

  // Sync active columns to current selection when opening
  useEffect(() => {
    if (!isOpen) return;
    if (selectedCategoryId && !Number.isNaN(selectedCategoryId)) {
      const cat = categoryById.get(selectedCategoryId);
      if (!cat) {
        setActiveRootKey(rootCategoryGroups[0]?.key ?? null);
        setActiveSecondLevelId(null);
        return;
      }
      let rootId = Number(cat.category_id);
      let childId: number | null = null;
      let parentId = cat.parent_category;
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
  }, [isOpen, selectedCategoryId, categoryById, rootCategoryGroups, rootGroupByRootId]);

  // Position dropdown via fixed coords to escape modal overflow clipping
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = Math.min(580, window.innerWidth - 16);
    const wouldOverflowRight = rect.left + panelWidth > window.innerWidth - 8;
    const left = wouldOverflowRight ? Math.max(8, rect.right - panelWidth) : rect.left;
    const approxDropdownHeight = 320;
    const wouldOverflowBottom = rect.bottom + approxDropdownHeight > window.innerHeight;
    const top = wouldOverflowBottom ? rect.top - approxDropdownHeight - 4 : rect.bottom + 4;
    setDropdownStyle({ position: "fixed", top, left, zIndex: 9999 });
  }, [isOpen]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      )
        return;
      setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const secondColumn = useMemo(() => {
    if (!activeRootKey) return [];
    const group = rootGroupByKey.get(activeRootKey);
    if (!group) return [];
    const combined: Category[] = [];
    const seen = new Set<number>();
    group.rootIds.forEach((rootId) => {
      (childrenByParent.get(rootId) || []).forEach((child) => {
        const id = Number(child.category_id);
        if (seen.has(id)) return;
        seen.add(id);
        combined.push(child);
      });
    });
    return combined.sort(sortById);
  }, [activeRootKey, rootGroupByKey, childrenByParent]);
  
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    return categories
      .filter((cat) => cat.category_name.toLowerCase().includes(term))
      .map((cat) => ({
        id: Number(cat.category_id),
        name: cat.category_name,
        path: getCategoryPath(Number(cat.category_id)),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [searchTerm, categories]);

  const thirdColumn =
    activeSecondLevelId !== null ? childrenByParent.get(activeSecondLevelId) || [] : [];

  const activeRootLabel = activeRootKey ? rootGroupByKey.get(activeRootKey)?.label : null;
  const activeSecondLabel =
    activeSecondLevelId !== null ? categoryById.get(activeSecondLevelId)?.category_name : null;
  const hoveredPath = [activeRootLabel, activeSecondLabel].filter(Boolean).join(" > ");
  const pathBarText = hoveredPath || selectedLabel;

  const renderItem = (cat: Category, level: 2 | 3) => {
    const catId = Number(cat.category_id);
    const itemHasChildren = hasChildren(catId);
    const isSelected = selectedCategoryId === catId;
    const isActive = level === 2 && activeSecondLevelId === catId;

    return (
      <button
        key={cat.category_id}
        type="button"
        onMouseEnter={() => {
          if (level === 2) setActiveSecondLevelId(catId);
        }}
        onClick={() => {
          if (!itemHasChildren) {
            onValueChange(String(catId));
            setIsOpen(false);
          } else if (level === 2) {
            setActiveSecondLevelId(catId);
          }
        }}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
          itemHasChildren ? "cursor-default" : "cursor-pointer"
        } ${
          isActive || isSelected
            ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium"
            : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
        }`}
      >
        <span className="break-words pr-2 leading-snug">{cat.category_name}</span>
        <span className="flex items-center gap-1">
          {isSelected && <Check className="h-4 w-4 text-[#8CA2B4]" />}
          {itemHasChildren && <ChevronRight className="h-4 w-4 text-zinc-400" />}
        </span>
      </button>
    );
  };

  const renderRootItem = (group: { key: string; label: string; rootIds: number[] }) => {
    const isActive = activeRootKey === group.key;
    return (
      <button
        key={group.key}
        type="button"
        onMouseEnter={() => {
          setActiveRootKey(group.key);
          setActiveSecondLevelId(null);
        }}
        onClick={() => {
          setActiveRootKey(group.key);
          setActiveSecondLevelId(null);
        }}
        className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
          isActive
            ? "bg-[#FFF0F3] text-[#E7A3B0] font-medium"
            : "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]"
        }`}
      >
        <span className="break-words pr-2 leading-snug">{group.label}</span>
        <ChevronRight className="h-4 w-4 text-zinc-400" />
      </button>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full h-9 px-3 border border-input rounded-md bg-white text-sm flex items-center justify-between gap-2 text-gray-900"
      >
        <span
          className={`truncate text-left flex-1 ${selectedLabel ? "text-gray-900" : "text-gray-500"}`}
        >
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="w-[min(90vw,580px)] max-w-[calc(100vw-1rem)] rounded-xl border border-black bg-white p-2.5 shadow-xl flex flex-col gap-2.5"
          >
            {/* Search Bar */}
            <div className="relative group/search-cat">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/search-cat:text-[#E7A3B0] transition-colors" />
              <Input
                autoFocus
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 h-10 rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-[#E7A3B0]/40 transition-all font-montserrat text-base md:text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-[#E7A3B0] transition-colors cursor-pointer"
                  aria-label="Clear category search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Path bar */}
            <div className="mb-3 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 min-h-[28px] flex items-center">
              {pathBarText ? (
                <span className="text-zinc-800 text-xs font-semibold break-words leading-snug">{pathBarText}</span>
              ) : (
                <span className="text-zinc-400 text-xs">Hover a category to see the path</span>
              )}
            </div>

            {searchTerm.trim() ? (
              <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1 divide-y divide-zinc-50">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => {
                        onValueChange(String(result.id));
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className="w-full flex flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-[#FFF0F3] group cursor-pointer"
                    >
                      <span className="text-sm font-medium text-zinc-800 group-hover:text-[#E7A3B0]">
                        {result.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 group-hover:text-[#E7A3B0]/60">
                        {result.path}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center">
                    <p className="text-sm text-zinc-500">No matching categories found</p>
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="mt-2 text-xs text-[#E7A3B0] font-medium hover:underline cursor-pointer"
                    >
                      Clear search to browse
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1">
                  {rootCategoryGroups.length > 0 ? (
                    rootCategoryGroups.map(renderRootItem)
                  ) : (
                    <div className="px-3 py-2 text-sm text-zinc-400">No categories found</div>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1">
                  {secondColumn.length > 0 ? (
                    secondColumn.map((cat) => renderItem(cat, 2))
                  ) : (
                    <div className="px-3 py-2 text-sm text-zinc-400">Select a parent category</div>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1">
                  {thirdColumn.length > 0 ? (
                    thirdColumn.map((cat) => renderItem(cat, 3))
                  ) : (
                    <div className="h-full flex items-center justify-center px-3 py-2 text-xs text-zinc-300 text-center">
                      No subcategories
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

