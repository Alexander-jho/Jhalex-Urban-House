import React, { createContext, useContext, useState, useEffect } from "react";

export type AppearanceMode = "CLEAR" | "LIQUID";

interface AppearanceContextType {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>(() => {
    const saved = localStorage.getItem("smaj_appearance_mode");
    return (saved === "LIQUID" ? "LIQUID" : "CLEAR") as AppearanceMode;
  });

  const setMode = (newMode: AppearanceMode) => {
    setModeState(newMode);
    localStorage.setItem("smaj_appearance_mode", newMode);
    // Also toggle high-level HTML classes for easy targeting
    const root = document.documentElement;
    if (newMode === "LIQUID") {
      root.classList.add("liquid-mode");
      root.classList.remove("clear-mode");
    } else {
      root.classList.add("clear-mode");
      root.classList.remove("liquid-mode");
    }
  };

  // Sync class name on initial mount
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "LIQUID") {
      root.classList.add("liquid-mode");
      root.classList.remove("clear-mode");
    } else {
      root.classList.add("clear-mode");
      root.classList.remove("liquid-mode");
    }
  }, [mode]);

  return (
    <AppearanceContext.Provider value={{ mode, setMode }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}
