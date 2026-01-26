"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { products as initialProducts, Product } from "@/data/product-test-data";

type CatalogStatus = "featured" | "standard" | "unlisted";

interface ProductContextType {
  productList: Product[];
  catalogStatus: { [key: string]: CatalogStatus };
  previousCatalogStatus: { [key: string]: "featured" | "standard" };
  addProduct: (product: Product, status: CatalogStatus) => void;
  updateProduct: (product: Product, status: CatalogStatus) => void;
  deleteProduct: (productId: string) => void;
  setCatalogStatus: (productId: string, status: CatalogStatus) => void;
  togglePublishStatus: (productId: string) => void;
  cycleCatalogStatus: (productId: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: React.ReactNode }) {
  const [productList, setProductList] = useState<Product[]>([]);
  const [catalogStatus, setCatalogStatusState] = useState<{ [key: string]: CatalogStatus }>({});
  const [previousCatalogStatus, setPreviousCatalogStatus] = useState<{ [key: string]: "featured" | "standard" }>({});

  // Load from localStorage on mount
  useEffect(() => {
    const savedProducts = localStorage.getItem("dollys-products");
    const savedCatalogStatus = localStorage.getItem("dollys-catalog-status");
    const savedPreviousStatus = localStorage.getItem("dollys-previous-status");

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

  const addProduct = (product: Product, status: CatalogStatus) => {
    setProductList([product, ...productList]);
    setCatalogStatusState({ ...catalogStatus, [product.id]: status });
    if (status !== "unlisted") {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [product.id]: status as "featured" | "standard" });
    }
  };

  const updateProduct = (product: Product, status: CatalogStatus) => {
    setProductList(productList.map(p => p.id === product.id ? product : p));
    setCatalogStatusState({ ...catalogStatus, [product.id]: status });
    if (status !== "unlisted") {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [product.id]: status as "featured" | "standard" });
    }
  };

  const deleteProduct = (productId: string) => {
    setProductList(productList.filter(p => p.id !== productId));
    const newCatalogStatus = { ...catalogStatus };
    delete newCatalogStatus[productId];
    setCatalogStatusState(newCatalogStatus);
  };

  const setCatalogStatus = (productId: string, status: CatalogStatus) => {
    setCatalogStatusState({ ...catalogStatus, [productId]: status });
  };

  const togglePublishStatus = (productId: string) => {
    const currentStatus = catalogStatus[productId];
    if (currentStatus === "unlisted") {
      const previousStatus = previousCatalogStatus[productId] || "standard";
      setCatalogStatusState({ ...catalogStatus, [productId]: previousStatus });
    } else {
      setPreviousCatalogStatus({ ...previousCatalogStatus, [productId]: currentStatus });
      setCatalogStatusState({ ...catalogStatus, [productId]: "unlisted" });
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
  };

  return (
    <ProductContext.Provider
      value={{
        productList,
        catalogStatus,
        previousCatalogStatus,
        addProduct,
        updateProduct,
        deleteProduct,
        setCatalogStatus,
        togglePublishStatus,
        cycleCatalogStatus,
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
