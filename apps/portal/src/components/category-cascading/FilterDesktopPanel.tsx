"use client";

import { Check, ChevronRight } from "lucide-react";
import { InventoryCategory as Category } from "@dollys-closet/core";
import type { RootGroup } from "./useCategoryTree";

const ACTIVE_ROW = "bg-[#FFF0F3] text-[#E7A3B0] font-medium";
const IDLE_ROW = "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]";
const COLUMN_CLASS = "max-h-72 overflow-y-auto rounded-md border border-zinc-200 p-1";

function RootItem({
  group,
  hasAnyChildren,
  isActive,
  isSelected,
  onHover,
  onSelect,
}: {
  group: RootGroup;
  hasAnyChildren: boolean;
  isActive: boolean;
  isSelected: boolean;
  onHover: (key: string) => void;
  onSelect: (key: string) => void;
}) {
  return (
    <button
      type="button"
      onMouseEnter={() => onHover(group.key)}
      onClick={() => onSelect(group.key)}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
        isActive || isSelected ? ACTIVE_ROW : IDLE_ROW
      }`}
    >
      <span className="truncate pr-2">{group.label}</span>
      <span className="flex items-center gap-1">
        {isSelected && <Check className="h-4 w-4 text-[#8CA2B4]" />}
        {hasAnyChildren && <ChevronRight className="h-4 w-4 text-zinc-400" />}
      </span>
    </button>
  );
}

function CategoryItem({
  category,
  level,
  hasChildren,
  isSelected,
  isActive,
  onHover,
  onSelect,
}: {
  category: Category;
  level: 2 | 3;
  hasChildren: boolean;
  isSelected: boolean;
  isActive: boolean;
  onHover: (id: number) => void;
  onSelect: (id: number) => void;
}) {
  const id = Number(category.category_id);

  return (
    <button
      type="button"
      onMouseEnter={() => {
        if (level === 2) onHover(id);
      }}
      onClick={() => onSelect(id)}
      className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
        isActive || isSelected ? ACTIVE_ROW : IDLE_ROW
      }`}
    >
      <span className="truncate pr-2">{category.category_name}</span>
      <span className="flex items-center gap-1">
        {isSelected && <Check className="h-4 w-4 text-[#8CA2B4]" />}
        {hasChildren && <ChevronRight className="h-4 w-4 text-zinc-400" />}
      </span>
    </button>
  );
}

interface DesktopPanelProps {
  alignRight: boolean;
  isAllSelected: boolean;
  rootGroups: RootGroup[];
  secondColumn: Category[];
  thirdColumn: Category[];
  hasChildren: (categoryId: number) => boolean;
  selectedCategoryId: number | null;
  selectedRootGroupKey: string | null;
  activeRootKey: string | null;
  activeSecondLevelId: number | null;
  onSelectAll: () => void;
  onPickRoot: (key: string) => void;
  onPickSecondLevel: (id: number) => void;
  onSelectRootGroup: (key: string) => void;
  onSelectCategory: (id: number) => void;
}

export function FilterDesktopPanel({
  alignRight,
  isAllSelected,
  rootGroups,
  secondColumn,
  thirdColumn,
  hasChildren,
  selectedCategoryId,
  selectedRootGroupKey,
  activeRootKey,
  activeSecondLevelId,
  onSelectAll,
  onPickRoot,
  onPickSecondLevel,
  onSelectRootGroup,
  onSelectCategory,
}: DesktopPanelProps) {
  const renderCategory = (category: Category, level: 2 | 3) => {
    const id = Number(category.category_id);
    return (
      <CategoryItem
        key={category.category_id}
        category={category}
        level={level}
        hasChildren={hasChildren(id)}
        isSelected={selectedCategoryId === id}
        isActive={level === 2 && activeSecondLevelId === id}
        onHover={onPickSecondLevel}
        onSelect={onSelectCategory}
      />
    );
  };

  return (
    <div
      className={`absolute z-50 mt-2 w-[min(90vw,580px)] max-w-[calc(100vw-1rem)] rounded-xl border border-black bg-white p-2.5 shadow-xl ${
        alignRight ? "right-0" : "left-0"
      }`}
    >
      <button
        type="button"
        onClick={onSelectAll}
        className={`mb-2 w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
          isAllSelected ? ACTIVE_ROW : IDLE_ROW
        }`}
      >
        <span>All Categories</span>
        {isAllSelected && <Check className="h-4 w-4" />}
      </button>

      <div className="grid grid-cols-3 gap-2">
        <div className={COLUMN_CLASS}>
          {rootGroups.length > 0 ? (
            rootGroups.map((group) => (
              <RootItem
                key={group.key}
                group={group}
                hasAnyChildren={group.rootIds.some((rootId) => hasChildren(rootId))}
                isActive={activeRootKey === group.key}
                isSelected={selectedRootGroupKey === group.key}
                onHover={onPickRoot}
                onSelect={onSelectRootGroup}
              />
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-zinc-400">No categories found</div>
          )}
        </div>

        <div className={COLUMN_CLASS}>
          {secondColumn.length > 0 ? (
            secondColumn.map((category) => renderCategory(category, 2))
          ) : (
            <div className="px-3 py-2 text-sm text-zinc-400">Select a parent category</div>
          )}
        </div>

        <div className={COLUMN_CLASS}>
          {thirdColumn.length > 0 ? (
            thirdColumn.map((category) => renderCategory(category, 3))
          ) : (
            <div className="px-3 py-2 text-sm text-zinc-300">Select a subcategory</div>
          )}
        </div>
      </div>
    </div>
  );
}
