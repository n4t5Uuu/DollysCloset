"use client";

/**
 * UnsavedChangesContext.tsx
 * 
 * Provides a global mechanism to track "dirty" states in forms and other
 * interactive components. This context allows components to signal that
 * they have unsaved progress, which is then used by the NavigationGuard 
 * to block accidental exits.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

/**
 * @interface UnsavedChangesContextType
 * @property {boolean} isDirty - Current state indicating if there are unsaved changes.
 * @property {function} setIsDirty - Updates the global dirty state.
 * @property {string} [unsavedMessage] - Optional custom message to show in the navigation alert.
 * @property {function} setUnsavedMessage - Updates the custom message.
 */
interface UnsavedChangesContextType {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  unsavedMessage?: string;
  setUnsavedMessage: (message: string | undefined) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

/**
 * Provider component for managing unsaved state across the app.
 * Injected in the root layout to wrap all dashboard components.
 */
export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const [isDirty, setIsDirtyInternal] = useState(false);
  const [unsavedMessage, setUnsavedMessage] = useState<string | undefined>(undefined);

  /**
   * Updates internal dirty state ensuring redundant state calls are ignored 
   * to avoid unnecessary React re-renders.
   */
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
