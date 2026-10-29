"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { InventoryCategory as Category } from "@dollys-closet/core";
import { FilterDesktopPanel } from "@/components/category-cascading/FilterDesktopPanel";
import { FilterMobileSheet, type DrillPath } from "@/components/category-cascading/FilterMobileSheet";
import { useCategoryTree } from "@/components/category-cascading/useCategoryTree";
import {
  resolveFilterSelection,
  useAlignRight,
  useDismiss,
  useIsMobileView,
} from "@/components/category-cascading/useFilterBehavior";
import { useFilterColumns } from "@/components/category-cascading/useFilterColumns";

interface CategoryCascadingFilterProps {
  categories: Category[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
}

export default function CategoryCascadingFilter({
  categories,
  value,
  onValueChange,
  className = "",
  triggerClassName,
}: CategoryCascadingFilterProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  // Columns the user picked while the dropdown is open; unset falls back to the current selection.
  const [pickedRootKey, setPickedRootKey] = useState<string | null>(null);
  const [pickedSecondLevelId, setPickedSecondLevelId] = useState<number | null | undefined>(undefined);
  const [drillPath, setDrillPath] = useState<DrillPath>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const alignRight = useAlignRight(containerRef, isOpen);
  const { isMobileView, isMobileViewRef } = useIsMobileView();
  useDismiss(containerRef, () => setIsOpen(false));

  const tree = useCategoryTree(categories);
  const { categoryById, rootCategoryGroups, rootGroupByKey, hasChildren, getCategoryPath, getSelectionColumns } = tree;

  const { selectedRootGroupKey, selectedCategoryId, selectedLabel } = resolveFilterSelection(
    value,
    rootGroupByKey,
    getCategoryPath
  );

  // Columns that show the current selection; user picks override them until the dropdown reopens.
  const selectionColumns = selectedRootGroupKey
    ? { rootKey: selectedRootGroupKey, secondLevelId: null }
    : getSelectionColumns(selectedCategoryId);
  const activeRootKey = pickedRootKey ?? selectionColumns.rootKey;
  const activeSecondLevelId =
    pickedSecondLevelId !== undefined ? pickedSecondLevelId : selectionColumns.secondLevelId;

  const { filteredRootGroups, secondColumn, thirdColumn } = useFilterColumns(
    tree,
    activeRootKey,
    activeSecondLevelId,
    searchQuery
  );

  useEffect(() => {
    if (!isOpen || !isMobileViewRef.current) return;
    setDrillPath([]);
    setSearchQuery("");
  }, [isOpen, isMobileViewRef]);

  const selectValue = (nextValue: string) => {
    onValueChange(nextValue);
    setIsOpen(false);
  };

  const pickRoot = (key: string) => {
    setPickedRootKey(key);
    setPickedSecondLevelId(null);
  };

  const sheetTitle =
    drillPath.length === 0
      ? "Category"
      : drillPath.length === 1
        ? (rootGroupByKey.get(drillPath[0] as string)?.label ?? "Category")
        : (categoryById.get(drillPath[1] as number)?.category_name ?? "Category");

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            setPickedRootKey(null);
            setPickedSecondLevelId(undefined);
          }
          setIsOpen(!isOpen);
        }}
        className={`h-9 px-3 border border-input rounded-md bg-white text-sm text-gray-900 flex items-center justify-between ${triggerClassName ?? "w-[180px]"}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        title={selectedLabel}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && isMobileView && (
        <FilterMobileSheet
          title={sheetTitle}
          drillPath={drillPath}
          onBack={() => setDrillPath((path) => path.slice(0, -1))}
          onClose={() => setIsOpen(false)}
          isAllSelected={value === "all"}
          selectedLabel={selectedLabel}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectAll={() => selectValue("all")}
          rootGroups={filteredRootGroups}
          rootGroupByKey={rootGroupByKey}
          categoryById={categoryById}
          secondColumn={secondColumn}
          thirdColumn={thirdColumn}
          hasChildren={hasChildren}
          selectedCategoryId={selectedCategoryId}
          selectedRootGroupKey={selectedRootGroupKey}
          onOpenRoot={(key) => {
            setPickedRootKey(key);
            setDrillPath([key]);
          }}
          onOpenSecondLevel={(rootKey, id) => {
            setPickedSecondLevelId(id);
            setDrillPath([rootKey, id]);
          }}
          onSelectRootGroup={(key) => selectValue(`rootgroup:${key}`)}
          onSelectCategory={(id) => selectValue(String(id))}
        />
      )}

      {isOpen && !isMobileView && (
        <FilterDesktopPanel
          alignRight={alignRight}
          isAllSelected={value === "all"}
          rootGroups={rootCategoryGroups}
          secondColumn={secondColumn}
          thirdColumn={thirdColumn}
          hasChildren={hasChildren}
          selectedCategoryId={selectedCategoryId}
          selectedRootGroupKey={selectedRootGroupKey}
          activeRootKey={activeRootKey}
          activeSecondLevelId={activeSecondLevelId}
          onSelectAll={() => selectValue("all")}
          onPickRoot={pickRoot}
          onPickSecondLevel={setPickedSecondLevelId}
          onSelectRootGroup={(key) => selectValue(`rootgroup:${key}`)}
          onSelectCategory={(id) => selectValue(String(id))}
        />
      )}
    </div>
  );
}
