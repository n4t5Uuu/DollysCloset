"use client";

import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import { InventoryCategory as Category } from "@dollys-closet/core";
import type { RootGroup } from "./useCategoryTree";

const ACTIVE_ROW = "bg-[#FFF0F3] text-[#E7A3B0] font-medium";
const IDLE_ROW = "text-zinc-700 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]";
const MUTED_ROW = "text-zinc-500 hover:bg-[#FFF0F3] hover:text-[#E7A3B0]";
const ROW_BASE = "w-full flex items-center rounded-lg px-3 py-2.5 text-left text-sm";

export type DrillPath = Array<string | number>;

function SheetHeader({
  title,
  canGoBack,
  onBack,
  onClose,
}: {
  title: string;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-zinc-100 px-3 py-2.5 shrink-0">
      {canGoBack ? (
        <button
          aria-label="Back"
          type="button"
          onClick={onBack}
          className="flex items-center justify-center rounded-md p-1 hover:bg-zinc-100 -ml-1 mr-1"
        >
          <ChevronLeft className="h-4 w-4 text-zinc-600" />
        </button>
      ) : (
        <div className="w-6 mr-1" />
      )}
      <span className="flex-1 text-sm font-semibold text-zinc-800 truncate">{title}</span>
      <button
        aria-label="Close categories"
        type="button"
        onClick={onClose}
        className="flex items-center justify-center rounded-md p-1 hover:bg-zinc-100 -mr-1"
      >
        <X className="h-4 w-4 text-zinc-500" />
      </button>
    </div>
  );
}

function SheetSearch({
  isAllSelected,
  selectedLabel,
  searchQuery,
  onSearchChange,
  onClear,
}: {
  isAllSelected: boolean;
  selectedLabel: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="border-b border-zinc-100 px-3 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Category</p>
          <p className="truncate text-sm font-medium text-zinc-900">
            {isAllSelected ? "All Categories" : selectedLabel}
          </p>
        </div>
        {!isAllSelected && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-semibold text-[#b96d7d] hover:text-[#E7A3B0]"
          >
            Clear
          </button>
        )}
      </div>
      <input
        value={searchQuery}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="Search categories"
        aria-label="Search categories"
        className="w-full rounded-md border border-gray-200 bg-zinc-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#E7A3B0] focus:ring-1 focus:ring-[#E7A3B0]"
      />
    </div>
  );
}

function SheetRow({
  label,
  isSelected,
  hasChildren = false,
  tone = "idle",
  truncate = true,
  checkClass = "text-[#8CA2B4] shrink-0 mr-1",
  onClick,
}: {
  label: string;
  isSelected: boolean;
  hasChildren?: boolean;
  tone?: "idle" | "muted";
  truncate?: boolean;
  checkClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ROW_BASE} ${isSelected ? ACTIVE_ROW : tone === "muted" ? MUTED_ROW : IDLE_ROW}`}
    >
      <span className={truncate ? "flex-1 truncate" : "flex-1"}>{label}</span>
      {isSelected && <Check className={`h-4 w-4 ${checkClass}`} />}
      {hasChildren && <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />}
    </button>
  );
}

interface SheetProps {
  title: string;
  drillPath: DrillPath;
  onBack: () => void;
  onClose: () => void;
  isAllSelected: boolean;
  selectedLabel: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectAll: () => void;
  rootGroups: RootGroup[];
  rootGroupByKey: Map<string, RootGroup>;
  categoryById: Map<number, Category>;
  secondColumn: Category[];
  thirdColumn: Category[];
  hasChildren: (categoryId: number) => boolean;
  selectedCategoryId: number | null;
  selectedRootGroupKey: string | null;
  onOpenRoot: (key: string) => void;
  onOpenSecondLevel: (rootKey: string, id: number) => void;
  onSelectRootGroup: (key: string) => void;
  onSelectCategory: (id: number) => void;
}

function RootList(props: SheetProps) {
  const { rootGroups, hasChildren, selectedRootGroupKey, isAllSelected } = props;

  return (
    <>
      <SheetRow
        label="All Categories"
        isSelected={isAllSelected}
        truncate={false}
        checkClass="shrink-0"
        onClick={props.onSelectAll}
      />
      {rootGroups.map((group) => {
        const hasAny = group.rootIds.some((id) => hasChildren(id));
        return (
          <SheetRow
            key={group.key}
            label={group.label}
            isSelected={selectedRootGroupKey === group.key}
            hasChildren={hasAny}
            onClick={() => (hasAny ? props.onOpenRoot(group.key) : props.onSelectRootGroup(group.key))}
          />
        );
      })}
    </>
  );
}

function SecondLevelList(props: SheetProps & { rootKey: string }) {
  const { rootKey, rootGroupByKey, secondColumn, hasChildren, selectedCategoryId, selectedRootGroupKey } = props;
  const group = rootGroupByKey.get(rootKey);
  if (!group) return null;

  return (
    <>
      <SheetRow
        label={`All ${group.label}`}
        isSelected={selectedRootGroupKey === rootKey}
        tone="muted"
        truncate={false}
        checkClass="text-[#8CA2B4] shrink-0"
        onClick={() => props.onSelectRootGroup(rootKey)}
      />
      {secondColumn.length === 0 && <div className="px-3 py-2 text-sm text-zinc-400">No subcategories</div>}
      {secondColumn.map((cat) => {
        const id = Number(cat.category_id);
        const catHasChildren = hasChildren(id);
        return (
          <SheetRow
            key={cat.category_id}
            label={cat.category_name}
            isSelected={selectedCategoryId === id}
            hasChildren={catHasChildren}
            onClick={() => (catHasChildren ? props.onOpenSecondLevel(rootKey, id) : props.onSelectCategory(id))}
          />
        );
      })}
    </>
  );
}

function ThirdLevelList(props: SheetProps & { secondId: number }) {
  const { secondId, categoryById, thirdColumn, selectedCategoryId } = props;

  return (
    <>
      <SheetRow
        label={`All ${categoryById.get(secondId)?.category_name}`}
        isSelected={selectedCategoryId === secondId}
        tone="muted"
        truncate={false}
        checkClass="text-[#8CA2B4] shrink-0"
        onClick={() => props.onSelectCategory(secondId)}
      />
      {thirdColumn.length === 0 && <div className="px-3 py-2 text-sm text-zinc-400">No subcategories</div>}
      {thirdColumn.map((cat) => {
        const id = Number(cat.category_id);
        return (
          <SheetRow
            key={cat.category_id}
            label={cat.category_name}
            isSelected={selectedCategoryId === id}
            checkClass="text-[#8CA2B4] shrink-0"
            onClick={() => props.onSelectCategory(id)}
          />
        );
      })}
    </>
  );
}

export function FilterMobileSheet(props: SheetProps) {
  const { drillPath } = props;

  return (
    <div className="fixed inset-x-2 bottom-2 z-50 rounded-xl border border-black bg-white shadow-xl overflow-hidden flex flex-col max-h-[70vh]">
      <SheetHeader
        title={props.title}
        canGoBack={drillPath.length > 0}
        onBack={props.onBack}
        onClose={props.onClose}
      />
      <SheetSearch
        isAllSelected={props.isAllSelected}
        selectedLabel={props.selectedLabel}
        searchQuery={props.searchQuery}
        onSearchChange={props.onSearchChange}
        onClear={props.onSelectAll}
      />
      <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
        {drillPath.length === 0 && <RootList {...props} />}
        {drillPath.length === 1 && <SecondLevelList {...props} rootKey={drillPath[0] as string} />}
        {drillPath.length === 2 && <ThirdLevelList {...props} secondId={drillPath[1] as number} />}
      </div>
    </div>
  );
}
