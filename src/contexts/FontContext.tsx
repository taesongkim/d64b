import React, { createContext, useContext, ReactNode } from 'react';

interface FontContextType {
  getFontFamily: (weight?: 'regular' | 'medium' | 'semiBold' | 'bold') => string;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

interface FontProviderProps {
  children: ReactNode;
}

export function FontProvider({ children }: FontProviderProps) {
  const getFontFamily = (weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular'): string => {
    switch (weight) {
      case 'medium':
        return 'GolosText-Medium';
      case 'semiBold':
        return 'GolosText-SemiBold';
      case 'bold':
        return 'GolosText-Bold';
      default:
        return 'GolosText-Regular';
    }
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
