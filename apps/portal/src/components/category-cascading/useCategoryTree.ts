import { useCallback, useMemo } from "react";
import { InventoryCategory as Category } from "@dollys-closet/core";

export interface RootGroup {
  key: string;
  label: string;
  rootIds: number[];
}

export function sortById(a: Category, b: Category) {
  return Number(a.category_id) - Number(b.category_id);
}

const normalizeName = (name: string) => name.trim().toLowerCase();

/** Derived lookups over a flat category list: parent/child maps, root groups and breadcrumb paths. */
export function useCategoryTree(categories: Category[]) {
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
    const groups = new Map<string, RootGroup>();
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
    const map = new Map<string, RootGroup>();
    rootCategoryGroups.forEach((g) => map.set(g.key, g));
    return map;
  }, [rootCategoryGroups]);

  const rootGroupByRootId = useMemo(() => {
    const map = new Map<number, string>();
    rootCategoryGroups.forEach((g) => g.rootIds.forEach((id) => map.set(id, g.key)));
    return map;
  }, [rootCategoryGroups]);

  const hasChildren = useCallback(
    (categoryId: number) => (childrenByParent.get(categoryId) || []).length > 0,
    [childrenByParent]
  );

  const getCategoryPath = useCallback(
    (categoryId: number) => {
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
    },
    [categoryById]
  );

  /** Root group and second-level category that contain the given category (for highlighting). */
  const getSelectionColumns = useCallback(
    (selectedCategoryId: number | null) => {
      const firstRootKey = rootCategoryGroups[0]?.key ?? null;
      const cat =
        selectedCategoryId && !Number.isNaN(selectedCategoryId)
          ? categoryById.get(selectedCategoryId)
          : undefined;
      if (!cat) return { rootKey: firstRootKey, secondLevelId: null as number | null };

      let rootId = Number(cat.category_id);
      let childId: number | null = null;
      let parentId = cat.parent_category;
      while (parentId !== null) {
        childId = rootId;
        rootId = parentId;
        const parent = categoryById.get(parentId);
        parentId = parent?.parent_category ?? null;
      }
      return { rootKey: rootGroupByRootId.get(rootId) ?? firstRootKey, secondLevelId: childId };
    },
    [categoryById, rootCategoryGroups, rootGroupByRootId]
  );

  return {
    childrenByParent,
    categoryById,
    rootCategoryGroups,
    rootGroupByKey,
    hasChildren,
    getCategoryPath,
    getSelectionColumns,
  };
}
