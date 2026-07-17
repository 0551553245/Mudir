"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Branch } from "@/lib/supabase/types";

const STORAGE_KEY = "scop-owner-branch";

interface BranchContextValue {
  branches: Branch[];
  selectedBranchId: string; // "all" | uuid
  setSelectedBranchId: (id: string) => void;
  selectedBranch: Branch | null;
  isAllBranches: boolean;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({
  branches,
  children,
}: {
  branches: Branch[];
  children: React.ReactNode;
}) {
  const [selectedBranchId, setSelectedState] = useState("all");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored === "all" || branches.some((b) => b.id === stored))) {
        setSelectedState(stored);
      }
    } catch {
      // ignore
    }
  }, [branches]);

  const setSelectedBranchId = useCallback((id: string) => {
    setSelectedState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      branches,
      selectedBranchId,
      setSelectedBranchId,
      selectedBranch:
        selectedBranchId === "all"
          ? null
          : branches.find((b) => b.id === selectedBranchId) ?? null,
      isAllBranches: selectedBranchId === "all",
    }),
    [branches, selectedBranchId, setSelectedBranchId]
  );

  return (
    <BranchContext.Provider value={value}>{children}</BranchContext.Provider>
  );
}

export function useBranchContext() {
  const ctx = useContext(BranchContext);
  if (!ctx) {
    throw new Error("useBranchContext must be used within BranchProvider");
  }
  return ctx;
}

export function useOptionalBranchContext() {
  return useContext(BranchContext);
}
