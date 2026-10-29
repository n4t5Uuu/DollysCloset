import { useCallback, useMemo } from "react";
import { InventoryCategory as Category } from "@dollys-closet/core";
import { sortById, type useCategoryTree } from "./useCategoryTree";

type CategoryTree = ReturnType<typeof useCategoryTree>;

/** Search-aware root, second and third level category lists for the category filter. */
export function useFilterColumns(
  tree: CategoryTree,
  activeRootKey: string | null,
  activeSecondLevelId: number | null,
  searchQuery: string
) {
  const { childrenByParent, categoryById, rootCategoryGroups, rootGroupByKey, hasChildren } = tree;

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  const matchesSearch = useCallback(
    (categoryName: string) => categoryName.toLowerCase().includes(normalizedSearchQuery),
    [normalizedSearchQuery]
  );

  const filteredRootGroups = useMemo(() => {
    if (!hasSearchQuery) return rootCategoryGroups;

    return rootCategoryGroups.filter((rootGroup) => {
      if (matchesSearch(rootGroup.label)) return true;

      return rootGroup.rootIds.some((rootId) => {
        const rootCategory = categoryById.get(rootId);
        if (rootCategory && matchesSearch(rootCategory.category_name)) return true;

        const secondLevel = childrenByParent.get(rootId) || [];
        if (secondLevel.some((child) => matchesSearch(child.category_name))) return true;

        return secondLevel.some((child) => {
          const grandchildren = childrenByParent.get(Number(child.category_id)) || [];
          return grandchildren.some((grandchild) => matchesSearch(grandchild.category_name));
        });
      });
    });
  }, [hasSearchQuery, matchesSearch, rootCategoryGroups, categoryById, childrenByParent]);

  const secondColumn = useMemo(() => {
    const group = activeRootKey ? rootGroupByKey.get(activeRootKey) : undefined;
    if (!group) return [];

    const combinedChildren: Category[] = [];
    const seenCategoryIds = new Set<number>();

    group.rootIds.forEach((rootId) => {
      (childrenByParent.get(rootId) || []).forEach((childCategory) => {
        const childId = Number(childCategory.category_id);
        if (seenCategoryIds.has(childId)) return;
        seenCategoryIds.add(childId);
        combinedChildren.push(childCategory);
      });
    });

    const sorted = combinedChildren.sort(sortById);
    if (!hasSearchQuery) return sorted;

    return sorted.filter((category) => {
      if (matchesSearch(category.category_name)) return true;
      if (!hasChildren(Number(category.category_id))) return false;
      return (childrenByParent.get(Number(category.category_id)) || []).some((child) =>
        matchesSearch(child.category_name)
      );
    });
  }, [activeRootKey, rootGroupByKey, childrenByParent, hasSearchQuery, matchesSearch, hasChildren]);

  const thirdColumn = useMemo(() => {
    const items = activeSecondLevelId !== null ? childrenByParent.get(activeSecondLevelId) || [] : [];
    if (!hasSearchQuery) return items;
    return items.filter((category) => matchesSearch(category.category_name));
  }, [activeSecondLevelId, childrenByParent, hasSearchQuery, matchesSearch]);

  return { hasSearchQuery, filteredRootGroups, secondColumn, thirdColumn };
}
