"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type DrawerView = "equipo" | "ruleta" | "historial" | null;

interface DrawerContextType {
  drawer: DrawerView;
  openDrawer: (view: DrawerView) => void;
  closeDrawer: () => void;
  switchDrawer: (view: DrawerView) => void;
}

const DrawerContext = createContext<DrawerContextType>({
  drawer: null,
  openDrawer: () => {},
  closeDrawer: () => {},
  switchDrawer: () => {},
});

export function DrawerProvider({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState<DrawerView>(null);

  function switchDrawer(view: DrawerView) {
    setDrawer(null);
    setTimeout(() => setDrawer(view), 350);
  }

  return (
    <DrawerContext.Provider
      value={{ drawer, openDrawer: setDrawer, closeDrawer: () => setDrawer(null), switchDrawer }}
    >
      {children}
    </DrawerContext.Provider>
  );
}

export function useDrawer() {
  return useContext(DrawerContext);
}
