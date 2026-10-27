import React, { createContext, useContext } from 'react';

export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  dark: boolean;
  radius: number;
  fontScale: number;
};

const Ctx = createContext<Palette | null>(null);

export function ThemeProvider({ value, children }: { value: Palette; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): Palette {
  const v = useContext(Ctx);
  if (!v) throw new Error('ThemeProvider manquant');
  return v;
}

/** Ajoute une transparence (00-ff) à une couleur hex #rrggbb. */
export function alpha(hex: string, a: number): string {
  const h = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex.length === 7 ? hex + h : hex;
}
