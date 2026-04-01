"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface UnsavedChangesContextType {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  unsavedMessage?: string;
  setUnsavedMessage: (message: string | undefined) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirtyInternal] = useState(false);
  const [unsavedMessage, setUnsavedMessage] = useState<string | undefined>(undefined);

  const setIsDirty = useCallback((value: boolean) => {
    setIsDirtyInternal((prev) => {
      if (prev === value) return prev;
      return value;
    });
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty, unsavedMessage, setUnsavedMessage }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (context === undefined) {
    throw new Error("useUnsavedChanges must be used within an UnsavedChangesProvider");
  }
  return context;
}
