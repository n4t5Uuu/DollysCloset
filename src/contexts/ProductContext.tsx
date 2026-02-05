"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { products as initialProducts, Product } from "@/data/product-test-data";
import { useUser } from "@/hooks/useUser";

type CatalogStatus = "featured" | "standard" | "unlisted";

export type ActivityLog = {
  id: string;
  timestamp: string;
  action: "added" | "edited" | "deleted" | "status_changed" | "viewed" | "opened_edit";
  productId?: string;
  productName?: string;
  statusFrom?: CatalogStatus;
  statusTo?: CatalogStatus;
  actorId?: string;
  actorEmail?: string;
  actorRole?: "admin" | "employee" | "unknown";
};

interface ProductContextType {
  productList: Product[];
  catalogStatus: { [key: string]: CatalogStatus };
  previousCatalogStatus: { [key: string]: "featured" | "standard" };
  activityLogs: ActivityLog[];
  addProduct: (product: Product, status: CatalogStatus) => void;
  updateProduct: (product: Product, status: CatalogStatus) => void;
  deleteProduct: (productId: string) => void;
  setCatalogStatus: (productId: string, status: CatalogStatus) => void;
  togglePublishStatus: (productId: string) => void;
  cycleCatalogStatus: (productId: string) => void;
  logActivity: (log: Omit<ActivityLog, "id" | "timestamp" | "actorId" | "actorEmail" | "actorRole">) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

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
      // If savedProducts exists (even if empty array), use it
      setProductList(JSON.parse(savedProducts));
    } else {
      // Only load initial products on very first visit
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

  const logActivity = (log: Omit<ActivityLog, "id" | "timestamp" | "actorId" | "actorEmail" | "actorRole">) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      actorId: user?.id,
      actorEmail: user?.email || "Unknown",
      actorRole: userRole || "unknown",
      ...log,
    };

    setActivityLogs((prev) => [newLog, ...prev]);
  };

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

  const updateProduct = (product: Product, status: CatalogStatus) => {
    setProductList(productList.map(p => p.id === product.id ? product : p));
    setCatalogStatusState({ ...catalogStatus, [product.id]: status });
    if (status !== "unlisted") {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [product.id]: status as "featured" | "standard" });
    }

    logActivity({
      action: "edited",
      productId: product.id,
      productName: product.name,
      statusTo: status,
    });
  };

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

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductProvider");
  }
  return context;
}
