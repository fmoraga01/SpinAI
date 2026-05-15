"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { Assignment } from "@/lib/types";

export type DrawerView = "equipo" | "ruleta" | "historial" | "log" | null;

interface DrawerContextType {
  drawer: DrawerView;
  openDrawer: (view: DrawerView) => void;
  closeDrawer: () => void;
  switchDrawer: (view: DrawerView) => void;
  pendingPrepare: Assignment | null;
  openPrepare: (assignment: Assignment) => void;
  clearPendingPrepare: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  drawer: null,
  openDrawer: () => {},
  closeDrawer: () => {},
  switchDrawer: () => {},
  pendingPrepare: null,
  openPrepare: () => {},
  clearPendingPrepare: () => {},
});

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerView>(null);
  const [pendingPrepare, setPendingPrepare] = useState<Assignment | null>(null);

  function switchDrawer(view: DrawerView) {
    setDrawer(null);
    setTimeout(() => setDrawer(view), 350);
  }

  function openPrepare(assignment: Assignment) {
    setPendingPrepare(assignment);
    setDrawer("historial");
  }

  return (
    <DrawerContext.Provider
      value={{
        drawer,
        openDrawer: setDrawer,
        closeDrawer: () => setDrawer(null),
        switchDrawer,
        pendingPrepare,
        openPrepare,
        clearPendingPrepare: () => setPendingPrepare(null),
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}
