import React, { createContext, useContext, useEffect } from 'react';
import { Appearance, Platform, useColorScheme, type ViewStyle } from 'react-native';
import { onyx, verreClair } from '@/theme';

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
  /** Voile de feuille modale. */
  overlay: string;
  mapWater: string;
  mapWaterStroke: string;
  mapRiver: string;
  mapLabel: string;
  /** Face plus claire, posée au-dessus d'un creux. */
  raised: string;
  /** Creux (piste de contrôle segmenté). */
  track: string;
  /** Voile de verre. */
  glass: string;
  glassStrong: string;
  /** Arête lumineuse (haut du volume). */
  highlight: string;
  /** Arête d'ombre (bas du volume). */
  shade: string;
  shadow: string;
  shadowSoft: string;
  glow: string;
  glow2: string;
  dark: boolean;
  radius: number;
  fontScale: number;
};

const Ctx = createContext<Palette | null>(null);

export function ThemeProvider({ value, children }: { value: Palette; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function systemScheme(): 'light' | 'dark' {
  const s = Appearance.getColorScheme();
  if (s === 'light' || s === 'dark') return s;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

/** Clair ou sombre selon le système. Aucune clé de stockage : le réglage reste celui du téléphone. */
export function VerreProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const mode = scheme === 'light' || scheme === 'dark' ? scheme : systemScheme();
  const value = mode === 'light' ? verreClair : onyx;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = value.bg;
    document.body.style.backgroundColor = value.bg;
    document.documentElement.style.colorScheme = value.dark ? 'dark' : 'light';
  }, [value]);
  return <ThemeProvider value={value}>{children}</ThemeProvider>;
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

type GlassStyle = ViewStyle & { boxShadow?: string; backdropFilter?: string };

/** Surface de verre. `solid` (Réduire la transparence) remplace le voile par la surface opaque testée AA. */
export function panelStyle(t: Palette, solid: boolean): GlassStyle {
  if (solid) {
    return {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderTopColor: t.highlight,
    };
  }
  return {
    backgroundColor: t.glass,
    borderWidth: 1,
    borderColor: t.border,
    borderTopColor: t.highlight,
    boxShadow: `inset 0 1px 0 ${t.highlight}, 0 12px 32px ${t.shadowSoft}, 0 1px 2px ${t.shadow}`,
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(18px)' } : null),
  };
}

/**
 * Relief de bouton : arête claire en haut, ombre portée en deux couches, ombre rentrée quand on appuie.
 * Le décalage vertical est omis si l'utilisateur réduit les animations.
 */
export function buttonRelief(t: Palette, pressed: boolean, calm: boolean, ghost = false): GlassStyle {
  if (ghost) {
    return {
      backgroundColor: pressed ? t.glass : 'transparent',
      borderWidth: 1,
      borderColor: pressed ? t.border : 'transparent',
      borderTopColor: pressed ? t.highlight : 'transparent',
      boxShadow: pressed ? `inset 0 2px 4px ${t.shadow}` : 'none',
      transform: pressed && !calm ? [{ translateY: 1 }] : [{ translateY: 0 }],
    };
  }
  const rest = `inset 0 1px 0 ${t.highlight}, 0 1px 0 ${t.shade}, 0 8px 16px ${t.shadowSoft}, 0 2px 4px ${t.shadow}`;
  const down = `inset 0 2px 5px ${t.shadow}, inset 0 1px 0 ${t.highlight}, 0 1px 1px ${t.shadow}`;
  return {
    borderWidth: 1,
    borderColor: t.shade,
    borderTopColor: t.highlight,
    borderBottomColor: t.shade,
    boxShadow: pressed ? down : rest,
    transform: pressed && !calm ? [{ translateY: 1 }] : [{ translateY: 0 }],
  };
}
