"use client";

import { forwardRef, useMemo } from "react";
import { Check, ChevronRight, Search, X } from "lucide-react";
import { InventoryCategory as Category } from "@dollys-closet/core";
import { Input } from "@dollys-closet/ui";
import { sortById, type RootGroup, type useCategoryTree } from "./useCategoryTree";

type CategoryTree = ReturnType<typeof useCategoryTree>;

const COLUMN_CLASS = "max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1";
const ACTIVE_ROW = "bg-[#FFF0F3] text-[#E7A3B0] font-medium";
const IDLE_ROW = "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]";

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative group/search-cat">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 group-focus-within/search-cat:text-[#E7A3B0] transition-colors" />
      <Input
        autoFocus
        placeholder="Search categories..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-9 h-10 rounded-xl border-zinc-200 bg-zinc-50 focus:bg-white focus:border-[#E7A3B0]/40 transition font-montserrat text-base md:text-sm"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 hover:text-[#E7A3B0] transition-colors cursor-pointer"
          aria-label="Clear category search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function PathBar({ text }: { text: string | null }) {
  return (
    <div className="mb-3 px-3 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200 min-h-[28px] flex items-center">
      {text ? (
        <span className="text-zinc-800 text-xs font-semibold break-words leading-snug">{text}</span>
      ) : (
        <span className="text-zinc-400 text-xs">Hover a category to see the path</span>
      )}
    </div>
  );
}

interface SearchResult {
  id: number;
  name: string;
  path: string;
}

function SearchResults({
  results,
  onPick,
  onClear,
}: {
  results: SearchResult[];
  onPick: (id: number) => void;
  onClear: () => void;
}) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1 divide-y divide-zinc-50">
      {results.length > 0 ? (
        results.map((result) => (
          <button
            key={result.id}
            type="button"
            onClick={() => onPick(result.id)}
            className="w-full flex flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-[#FFF0F3] group cursor-pointer"
          >
            <span className="text-sm font-medium text-zinc-800 group-hover:text-[#E7A3B0]">{result.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 group-hover:text-[#E7A3B0]/60">
              {result.path}
            </span>
          </button>
        ))
      ) : (
        <div className="px-3 py-8 text-center">
          <p className="text-sm text-zinc-500">No matching categories found</p>
          <button
            onClick={onClear}
            className="mt-2 text-xs text-[#E7A3B0] font-medium hover:underline cursor-pointer"
          >
            Clear search to browse
          </button>
        </div>
      )}
    </div>
  );
}

function RootItem({
  group,
  isActive,
  onPick,
}: {
  group: RootGroup;
  isActive: boolean;
  onPick: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onPick(group.key)}
      onClick={() => onPick(group.key)}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
        isActive ? ACTIVE_ROW : IDLE_ROW
      }`}
    >
      <span className="break-words pr-2 leading-snug">{group.label}</span>
      <ChevronRight className="h-4 w-4 text-zinc-400" />
    </button>
  );
}

function CategoryItem({
  category,
  level,
  hasChildren,
  isSelected,
  isActive,
  onSelect,
  onPickSecondLevel,
}: {
  category: Category;
  level: 2 | 3;
  hasChildren: boolean;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: number) => void;
  onPickSecondLevel: (id: number) => void;
}) {
  const id = Number(category.category_id);

  return (
    <button
      type="button"
      onMouseEnter={() => {
        if (level === 2) onPickSecondLevel(id);
      }}
      onClick={() => {
        if (!hasChildren) onSelect(id);
        else if (level === 2) onPickSecondLevel(id);
      }}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
        hasChildren ? "cursor-default" : "cursor-pointer"
      } ${isActive || isSelected ? ACTIVE_ROW : IDLE_ROW}`}
    >
      <span className="break-words pr-2 leading-snug">{category.category_name}</span>
      <span className="flex items-center gap-1">
        {isSelected && <Check className="h-4 w-4 text-[#8CA2B4]" />}
        {hasChildren && <ChevronRight className="h-4 w-4 text-zinc-400" />}
      </span>
    </button>
  );
}

interface PanelProps {
  tree: CategoryTree;
  categories: Category[];
  style: React.CSSProperties;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  activeRootKey: string | null;
  activeSecondLevelId: number | null;
  selectedCategoryId: number | null;
  selectedLabel: string | null;
  onPickRoot: (key: string) => void;
  onPickSecondLevel: (id: number) => void;
  onSelect: (id: number) => void;
}

export const CategoryDropdownPanel = forwardRef<HTMLDivElement, PanelProps>(function CategoryDropdownPanel(
  {
    tree,
    categories,
    style,
    searchTerm,
    onSearchTermChange,
    activeRootKey,
    activeSecondLevelId,
    selectedCategoryId,
    selectedLabel,
    onPickRoot,
    onPickSecondLevel,
    onSelect,
  },
  ref
) {
  const { childrenByParent, categoryById, rootCategoryGroups, rootGroupByKey, hasChildren, getCategoryPath } = tree;

  const secondColumn = useMemo(() => {
    const group = activeRootKey ? rootGroupByKey.get(activeRootKey) : undefined;
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
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];
    return categories
      .filter((cat) => cat.category_name.toLowerCase().includes(term))
      .map((cat) => ({
        id: Number(cat.category_id),
        name: cat.category_name,
        path: getCategoryPath(Number(cat.category_id)),
      }))
      .sort((a, b) => a.path.localeCompare(b.path));
  }, [searchTerm, categories, getCategoryPath]);

  const thirdColumn = activeSecondLevelId !== null ? childrenByParent.get(activeSecondLevelId) || [] : [];

  const activeRootLabel = activeRootKey ? rootGroupByKey.get(activeRootKey)?.label : null;
  const activeSecondLabel =
    activeSecondLevelId !== null ? categoryById.get(activeSecondLevelId)?.category_name : null;
  const hoveredPath = [activeRootLabel, activeSecondLabel].filter(Boolean).join(" > ");

  const renderItem = (cat: Category, level: 2 | 3) => {
    const id = Number(cat.category_id);
    return (
      <CategoryItem
        key={cat.category_id}
        category={cat}
        level={level}
        hasChildren={hasChildren(id)}
        isSelected={selectedCategoryId === id}
        isActive={level === 2 && activeSecondLevelId === id}
        onSelect={onSelect}
        onPickSecondLevel={onPickSecondLevel}
      />
    );
  };

  return (
    <div
      ref={ref}
      style={style}
      className="w-[min(90vw,580px)] max-w-[calc(100vw-1rem)] rounded-xl border border-black bg-white p-2.5 shadow-xl flex flex-col gap-2.5"
    >
      <SearchBar value={searchTerm} onChange={onSearchTermChange} />
      <PathBar text={hoveredPath || selectedLabel} />

      {searchTerm.trim() ? (
        <SearchResults results={searchResults} onPick={onSelect} onClear={() => onSearchTermChange("")} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <div className={COLUMN_CLASS}>
            {rootCategoryGroups.length > 0 ? (
              rootCategoryGroups.map((group) => (
                <RootItem key={group.key} group={group} isActive={activeRootKey === group.key} onPick={onPickRoot} />
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-zinc-400">No categories found</div>
            )}
          </div>
          <div className={COLUMN_CLASS}>
            {secondColumn.length > 0 ? (
              secondColumn.map((cat) => renderItem(cat, 2))
            ) : (
              <div className="px-3 py-2 text-sm text-zinc-400">Select a parent category</div>
            )}
          </div>
          <div className={COLUMN_CLASS}>
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
    </div>
  );
});
