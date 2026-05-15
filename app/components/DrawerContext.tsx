"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type DrawerView = "equipo" | "ruleta" | "historial" | null;

interface DrawerContextType {
  drawer: DrawerView;
  openDrawer: (view: DrawerView) => void;
  closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  drawer: null,
  openDrawer: () => {},
  closeDrawer: () => {},
});

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerView>(null);
  return (
    <DrawerContext.Provider
      value={{ drawer, openDrawer: setDrawer, closeDrawer: () => setDrawer(null) }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}
