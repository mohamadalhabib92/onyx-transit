import type { Palette } from '@/kit/theme';

/**
 * Verre — deux palettes opaques (contraste AA) plus les voiles translucides.
 * `onyx` reste en premier : les garde-fous qui lisent le premier hex de chaque jeton
 * continuent de mesurer le sombre.
 */
export const onyx: Palette = {
  bg: '#0B0B0D',
  surface: '#15151A',
  surface2: '#1E1E25',
  border: '#2C2C35',
  text: '#F4F1EA',
  textMuted: '#A19D94',
  primary: '#C9A14A',
  primaryText: '#0B0B0D',
  accent: '#E8D5A3',
  success: '#3FB27F',
  warning: '#E0A43A',
  danger: '#EC5A5F',
  info: '#5B9BF0',
  overlay: 'rgba(11,11,13,0.72)',
  mapWater: '#14263A',
  mapWaterStroke: '#1F3A57',
  mapRiver: '#1A3048',
  mapLabel: '#A19D94',
  raised: '#2A2A33',
  track: '#121216',
  glass: 'rgba(21,21,26,0.72)',
  glassStrong: 'rgba(21,21,26,0.92)',
  highlight: 'rgba(255,244,220,0.34)',
  shade: 'rgba(0,0,0,0.55)',
  shadow: 'rgba(0,0,0,0.55)',
  shadowSoft: 'rgba(0,0,0,0.38)',
  glow: 'rgba(201,161,74,0.20)',
  glow2: 'rgba(232,213,163,0.08)',
  dark: true,
  radius: 16,
  fontScale: 1,
};

/** Verre clair — ivoire chaud et or sombre, mêmes rôles que `onyx`. */
export const verreClair: Palette = {
  bg: '#F3EEE6',
  surface: '#FFFBF6',
  surface2: '#E6DFD3',
  border: '#C9C0B0',
  text: '#1C1814',
  textMuted: '#5C564C',
  primary: '#7A5610',
  primaryText: '#FFFBF6',
  accent: '#6E4E12',
  success: '#0E6B3C',
  warning: '#8A4E00',
  danger: '#B4232C',
  info: '#1A56B0',
  overlay: 'rgba(28,24,20,0.40)',
  mapWater: '#D7E6F2',
  mapWaterStroke: '#9BB6CC',
  mapRiver: '#C5D9EA',
  mapLabel: '#1A3348',
  raised: '#FFFBF6',
  track: '#E4DDD1',
  glass: 'rgba(255,251,246,0.62)',
  glassStrong: 'rgba(255,251,246,0.90)',
  highlight: 'rgba(255,255,255,0.95)',
  shade: 'rgba(90,70,40,0.22)',
  shadow: 'rgba(48,36,18,0.18)',
  shadowSoft: 'rgba(48,36,18,0.10)',
  glow: 'rgba(201,161,74,0.28)',
  glow2: 'rgba(255,255,255,0.70)',
  dark: false,
  radius: 16,
  fontScale: 1,
};

/** Espacements partagés (pt). */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 16,
  stack: 14,
} as const;

/** Échelle typographique. Le composant T y ajoute Dynamic Type. */
export const typeScale = {
  display: { fs: 32, fw: '800' as const, lh: 38 },
  h1: { fs: 24, fw: '800' as const, lh: 30 },
  h2: { fs: 19, fw: '700' as const, lh: 25 },
  h3: { fs: 16, fw: '700' as const, lh: 22 },
  body: { fs: 15, fw: '400' as const, lh: 21 },
  small: { fs: 13, fw: '400' as const, lh: 18 },
  caption: { fs: 11.5, fw: '600' as const, lh: 15 },
  label: { fs: 12, fw: '700' as const, lh: 16 },
  mono: { fs: 13, fw: '500' as const, lh: 18 },
} as const;
