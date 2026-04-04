"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import React, { createContext, useContext, useState, useEffect } from "react";
import { type Product } from "@dollys-closet/core";
import { 
  type CatalogStatus, 
  type ActivityLog, 
  type FieldChange 
} from "@dollys-closet/core";
import { useUser } from "@dollys-closet/core";

const initialProducts: Product[] = [];

import { type ProductContextType } from "@dollys-closet/core";

const ProductContext = createContext<ProductContextType | undefined>(undefined);

/**
 * Context Provider governing overarching logic sequences mapped to locally saved catalogs natively.
 * Synchronizes browser `localStorage` loops across dynamic state configurations protecting memory losses externally.
 * Injects catalog manipulation utility actions onto the React Context hierarchy alongside deep activity trail bindings.
 * @param children - Standard nested React nodes rendering natively within scoped product domains.
 */
export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [productList, setProductList] = useState<Product[]>([]);
  const [catalogStatus, setCatalogStatusState] = useState<{ [key: string]: CatalogStatus }>({});
  const [previousCatalogStatus, setPreviousCatalogStatus] = useState<{ [key: string]: "featured" | "standard" }>({});
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const { user, userRole } = useUser();

  // Load from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem("dollys-products");
    const savedCatalogStatus = localStorage.getItem("dollys-catalog-status");
    const savedPreviousStatus = localStorage.getItem("dollys-previous-status");
    const savedActivityLogs = localStorage.getItem("dollys-activity-logs");

    if (savedProducts !== null) {
      setProductList(JSON.parse(savedProducts));
    } else {
      setProductList(initialProducts);
      localStorage.setItem("dollys-products", JSON.stringify(initialProducts));
    }

    if (savedCatalogStatus) {
      setCatalogStatusState(JSON.parse(savedCatalogStatus));
    } else {
      const initialStatus: { [key: string]: CatalogStatus } = Object.fromEntries(
        initialProducts.map((p, index) => [p.id, index < 5 ? "featured" as CatalogStatus : "standard" as CatalogStatus])
      );
      setCatalogStatusState(initialStatus);
    }

    if (savedPreviousStatus) {
      setPreviousCatalogStatus(JSON.parse(savedPreviousStatus));
    } else {
      const initialPrevious: { [key: string]: "featured" | "standard" } = Object.fromEntries(
        initialProducts.map((p, index) => [p.id, index < 5 ? "featured" as const : "standard" as const])
      );
      setPreviousCatalogStatus(initialPrevious);
    }

    if (savedActivityLogs) {
      setActivityLogs(JSON.parse(savedActivityLogs));
    }
  }, []);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (productList.length > 0) {
      localStorage.setItem("dollys-products", JSON.stringify(productList));
    }
  }, [productList]);

  useEffect(() => {
    if (Object.keys(catalogStatus).length > 0) {
      localStorage.setItem("dollys-catalog-status", JSON.stringify(catalogStatus));
    }
  }, [catalogStatus]);

  useEffect(() => {
    if (Object.keys(previousCatalogStatus).length > 0) {
      localStorage.setItem("dollys-previous-status", JSON.stringify(previousCatalogStatus));
    }
  }, [previousCatalogStatus]);

  useEffect(() => {
    if (activityLogs.length > 0) {
      localStorage.setItem("dollys-activity-logs", JSON.stringify(activityLogs));
    }
  }, [activityLogs]);

  /**
   * Internal telemetry helper recording significant catalog modifications.
   * Merges user session metadata onto specific action payloads before syncing with state.
   * @param log - Initial log payload containing action and product details.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logActivity = (log: any) => {
    // Only log if user data is available
    if (!user?.email || !userRole) {
      return;
    }

    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      actorId: user.id,
      actorEmail: user.email,
      actorRole: userRole,
      ...log,
    };

    setActivityLogs((prev) => [newLog, ...prev]);
  };

  /**
   * Appends a new product record to the global list and initializes its catalog status.
   * Triggers an activity log entry for the "added" action.
   * @param product - The full product data object being instantiated.
   * @param status - The initial visibility status (featured/standard/unlisted).
   */
  const addProduct = (product: Product, status: CatalogStatus) => {
    setProductList([product, ...productList]);
    setCatalogStatusState({ ...catalogStatus, [product.id]: status });
    if (status !== "unlisted") {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [product.id]: status as "featured" | "standard" });
    }

    logActivity({
      action: "added",
      productId: product.id,
      productName: product.name,
      statusTo: status,
    });
  };

  /**
   * Synchronizes an updated product record with the global list and updates its status.
   * Performs a delta check against the old record to generate detailed activity trail logs.
   * @param product - Updated product data.
   * @param status - The target visibility status.
   */
  const updateProduct = (product: Product, status: CatalogStatus) => {
    const oldProduct = productList.find(p => p.id === product.id);
    setProductList(productList.map(p => p.id === product.id ? product : p));
    setCatalogStatusState({ ...catalogStatus, [product.id]: status });
    if (status !== "unlisted") {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [product.id]: status as "featured" | "standard" });
    }

    // Track field changes
    const fieldChanges: FieldChange[] = [];
    if (oldProduct) {
      if (oldProduct.name !== product.name) fieldChanges.push({ field: "Name", oldValue: oldProduct.name, newValue: product.name });
      if (oldProduct.category !== product.category) fieldChanges.push({ field: "Category", oldValue: oldProduct.category, newValue: product.category });
      if (oldProduct.type !== product.type) fieldChanges.push({ field: "Type", oldValue: oldProduct.type, newValue: product.type });
      if (oldProduct.price !== product.price) fieldChanges.push({ field: "Price", oldValue: `₱${oldProduct.price}`, newValue: `₱${product.price}` });
      if (oldProduct.size !== product.size) fieldChanges.push({ field: "Size", oldValue: oldProduct.size, newValue: product.size });
      if (oldProduct.brand !== product.brand) fieldChanges.push({ field: "Brand", oldValue: oldProduct.brand, newValue: product.brand });
      if (oldProduct.stock !== product.stock) fieldChanges.push({ field: "Stock", oldValue: oldProduct.stock, newValue: product.stock });
      if (oldProduct.description !== product.description) fieldChanges.push({ field: "Description", oldValue: oldProduct.description, newValue: product.description });
      if (oldProduct.isNewArrival !== product.isNewArrival) fieldChanges.push({ field: "New Arrival", oldValue: oldProduct.isNewArrival ? "Yes" : "No", newValue: product.isNewArrival ? "Yes" : "No" });
      if (JSON.stringify(oldProduct.images) !== JSON.stringify(product.images)) fieldChanges.push({ field: "Images", oldValue: `${oldProduct.images.length} images`, newValue: `${product.images.length} images` });
    }

    logActivity({
      action: "edited",
      productId: product.id,
      productName: product.name,
      statusTo: status,
      fieldChanges: fieldChanges.length > 0 ? fieldChanges : undefined,
    });
  };

  /**
   * Permanently removes a product from the local catalog and clears its status mapping.
   * Records a "deleted" activity trail event.
   * @param productId - Unique identifier of the product to purge.
   */
  const deleteProduct = (productId: string) => {
    const productToDelete = productList.find((p) => p.id === productId);
    setProductList(productList.filter(p => p.id !== productId));
    const newCatalogStatus = { ...catalogStatus };
    delete newCatalogStatus[productId];
    setCatalogStatusState(newCatalogStatus);

    logActivity({
      action: "deleted",
      productId,
      productName: productToDelete?.name,
    });
  };

  /**
   * Directly updates the visibility tier of a specific product.
   * @param productId - Target product ID.
   * @param status - Target CatalogStatus.
   */
  const setCatalogStatus = (productId: string, status: CatalogStatus) => {
    const fromStatus = catalogStatus[productId];
    setCatalogStatusState({ ...catalogStatus, [productId]: status });

    logActivity({
      action: "status_changed",
      productId,
      productName: productList.find((p) => p.id === productId)?.name,
      statusFrom: fromStatus,
      statusTo: status,
    });
  };

  /**
   * Toggles a product between its last active visibility status and "unlisted".
   * Primarily used for quick publish/unpublish actions on the management dashboard.
   * @param productId - Target product ID.
   */
  const togglePublishStatus = (productId: string) => {
    const currentStatus = catalogStatus[productId];
    if (currentStatus === "unlisted") {
      const previousStatus = previousCatalogStatus[productId] || "standard";
      setCatalogStatusState({ ...catalogStatus, [productId]: previousStatus });

      logActivity({
        action: "status_changed",
        productId,
        productName: productList.find((p) => p.id === productId)?.name,
        statusFrom: currentStatus,
        statusTo: previousStatus,
      });
    } else {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [productId]: currentStatus });
      setCatalogStatusState({ ...catalogStatus, [productId]: "unlisted" });

      logActivity({
        action: "status_changed",
        productId,
        productName: productList.find((p) => p.id === productId)?.name,
        statusFrom: currentStatus,
        statusTo: "unlisted",
      });
    }
  };

  /**
   * Rotates a product through the visibility hierarchy: standard -> featured -> unlisted.
   * Provides a simplified status management cycle for high-velocity inventory updates.
   * @param productId - Target product ID.
   */
  const cycleCatalogStatus = (productId: string) => {
    const currentStatus = catalogStatus[productId];
    let newStatus: CatalogStatus;
    
    if (currentStatus === "unlisted") {
      newStatus = "standard";
    } else if (currentStatus === "standard") {
      newStatus = "featured";
    } else {
      newStatus = "unlisted";
    }
    
    setCatalogStatusState({ ...catalogStatus, [productId]: newStatus });
    if (newStatus !== "unlisted") {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [productId]: newStatus as "featured" | "standard" });
    }

    logActivity({
      action: "status_changed",
      productId,
      productName: productList.find((p) => p.id === productId)?.name,
      statusFrom: currentStatus,
      statusTo: newStatus,
    });
  };

  return (
    <ProductContext.Provider
      value={{
        productList,
        catalogStatus,
        previousCatalogStatus,
        activityLogs,
        addProduct,
        updateProduct,
        deleteProduct,
        setCatalogStatus,
        togglePublishStatus,
        cycleCatalogStatus,
        logActivity,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

/**
 * Custom hook permitting seamless extraction of `ProductContext` bounds inside functional components securely.
 * Will throw exceptions directly on runtime if invoked unexpectedly disconnected from parent layout providers.
 * @returns Fully composed context matching predefined `ProductContextType` schemas globally.
 */
export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
