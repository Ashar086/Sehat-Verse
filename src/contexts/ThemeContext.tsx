import React, { createContext, useContext, useState, useEffect } from "react";

type ThemeScheme = "cyber-cyan" | "matrix-green" | "cyber-blue" | "medical-red" | "white";

interface ThemeContextType {
  theme: ThemeScheme;
  setTheme: (theme: ThemeScheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeScheme>(() => {
    const saved = localStorage.getItem("sehatverse-theme");
    return (saved as ThemeScheme) || "cyber-cyan";
  });

  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      "theme-cyber-cyan",
      "theme-matrix-green",
      "theme-cyber-blue",
      "theme-medical-red",
      "theme-white"
    );
    
    // Add current theme class
    document.documentElement.classList.add(`theme-${theme}`);
    
    // Save to localStorage
    localStorage.setItem("sehatverse-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
