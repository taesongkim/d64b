import React, { createContext, useContext, ReactNode } from 'react';

interface FontContextType {
  getFontFamily: () => string;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

interface FontProviderProps {
  children: ReactNode;
}

export function FontProvider({ children }: FontProviderProps) {
  const getFontFamily = (): string => {
    return 'GolosText-Regular';
  };

  return (
    <FontContext.Provider value={{ getFontFamily }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont() {
  const context = useContext(FontContext);
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider');
  }
  return context;
}
