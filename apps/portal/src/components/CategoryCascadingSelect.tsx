"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { InventoryCategory as Category } from "@dollys-closet/core";
import { CategoryDropdownPanel } from "@/components/category-cascading/CategoryDropdownPanel";
import { useCategoryTree } from "@/components/category-cascading/useCategoryTree";

interface CategoryCascadingSelectProps {
  /** Applied to the trigger button so a <label htmlFor> can name it. */
  id?: string;
  categories: Category[];
  value: string; // numeric category ID string, or ""
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

const subscribeNoop = () => () => {};

export default function CategoryCascadingSelect({
  id,
  categories,
  value,
  onValueChange,
  className = "",
  placeholder = "Select category",
}: CategoryCascadingSelectProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  // false during SSR/hydration, true on the client, so the portal only renders after mount.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  // Columns the user picked while the dropdown is open; unset falls back to the current selection.
  const [pickedRootKey, setPickedRootKey] = useState<string | null>(null);
  const [pickedSecondLevelId, setPickedSecondLevelId] = useState<number | null | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const tree = useCategoryTree(categories);

  const selectedCategoryId = value ? Number(value) : null;
  const selectedLabel =
    selectedCategoryId && !Number.isNaN(selectedCategoryId)
      ? tree.getCategoryPath(selectedCategoryId)
      : null;

  // Columns that show the current selection; user picks override them until the dropdown reopens.
  const selectionColumns = tree.getSelectionColumns(selectedCategoryId);
  const activeRootKey = pickedRootKey ?? selectionColumns.rootKey;
  const activeSecondLevelId =
    pickedSecondLevelId !== undefined ? pickedSecondLevelId : selectionColumns.secondLevelId;

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

  const handleSelect = (categoryId: number) => {
    onValueChange(String(categoryId));
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={`relative ${className}`}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen) {
            setPickedRootKey(null);
            setPickedSecondLevelId(undefined);
          }
          setIsOpen(!isOpen);
        }}
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
          <CategoryDropdownPanel
            ref={dropdownRef}
            tree={tree}
            categories={categories}
            style={dropdownStyle}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            activeRootKey={activeRootKey}
            activeSecondLevelId={activeSecondLevelId}
            selectedCategoryId={selectedCategoryId}
            selectedLabel={selectedLabel}
            onPickRoot={(key) => {
              setPickedRootKey(key);
              setPickedSecondLevelId(null);
            }}
            onPickSecondLevel={setPickedSecondLevelId}
            onSelect={handleSelect}
          />,
          document.body
        )}
    </div>
  );
}
