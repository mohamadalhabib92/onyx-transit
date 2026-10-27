import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnline } from './net';
import { alpha, useTheme } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export { Ionicons };

/* ---------- Typo ---------- */
type TVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label' | 'mono';
const sizes: Record<TVariant, { fs: number; fw: TextStyle['fontWeight']; lh?: number }> = {
  display: { fs: 32, fw: '800', lh: 38 },
  h1: { fs: 24, fw: '800', lh: 30 },
  h2: { fs: 19, fw: '700', lh: 25 },
  h3: { fs: 16, fw: '700', lh: 22 },
  body: { fs: 15, fw: '400', lh: 21 },
  small: { fs: 13, fw: '400', lh: 18 },
  caption: { fs: 11.5, fw: '600', lh: 15 },
  label: { fs: 12, fw: '700', lh: 16 },
  mono: { fs: 13, fw: '500', lh: 18 },
};

export function T({
  v = 'body',
  color,
  muted,
  center,
  style,
  children,
  numberOfLines,
  selectable,
}: {
  v?: TVariant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const t = useTheme();
  const s = sizes[v];
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[
        {
          fontSize: s.fs * t.fontScale,
          fontWeight: s.fw,
          lineHeight: s.lh ? s.lh * t.fontScale : undefined,
          color: color ?? (muted ? t.textMuted : t.text),
          textAlign: center ? 'center' : undefined,
          letterSpacing: v === 'caption' || v === 'label' ? 0.4 : undefined,
          textTransform: v === 'caption' ? 'uppercase' : undefined,
          fontFamily: v === 'mono' ? Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }) : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------- Layout ---------- */
export function Screen({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const inner = (
    <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center', padding: padded ? 16 : 0, gap: 14, paddingBottom: 40 }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {header}
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
      {footer}
    </View>
  );
}

export function Header({ title, subtitle, right, left }: { title: string; subtitle?: string; right?: React.ReactNode; left?: React.ReactNode }) {
  return (
    <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {left}
      <View style={{ flex: 1 }}>
        <T v="h1" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T v="small" muted numberOfLines={2}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Row({ children, gap = 10, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Card({ children, style, onPress, accent, a11y }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: string; a11y?: string }) {
  const t = useTheme();
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: t.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.border,
    padding: 14,
    gap: 8,
    borderLeftWidth: accent ? 3 : StyleSheet.hairlineWidth,
    borderLeftColor: accent ?? t.border,
  };
  if (onPress)
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={({ pressed }) => [base, { opacity: pressed ? 0.85 : 1 }, style]}>
        {children}
      </Pressable>
    );
  return <View style={[base, style]}>{children}</View>;
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <T v="caption" muted>
          {title}
        </T>
        {action}
      </Row>
      {children}
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 4 }} />;
}

/* ---------- Boutons ---------- */
type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  small,
  full,
  style,
  a11y,
}: {
  title: string;
  onPress?: () => void;
  kind?: BtnKind;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  a11y?: string;
}) {
  const t = useTheme();
  const bg = { primary: t.primary, secondary: t.surface2, ghost: 'transparent', danger: t.danger, success: t.success }[kind];
  const fg = { primary: t.primaryText, secondary: t.text, ghost: t.primary, danger: '#fff', success: '#fff' }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: small ? 44 : 48,
          paddingHorizontal: small ? 12 : 18,
          borderRadius: t.radius - 2,
          backgroundColor: bg,
          borderWidth: kind === 'secondary' || kind === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: kind === 'ghost' ? 'transparent' : t.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: full ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: (small ? 13 : 15) * t.fontScale }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, a11y, color, size = 22 }: { icon: IconName; onPress?: () => void; a11y: string; color?: string; size?: number }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.surface2 : 'transparent' })}
    >
      <Ionicons name={icon} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color, icon }: { label: string; selected?: boolean; onPress?: () => void; color?: string; icon?: IconName }) {
  const t = useTheme();
  const c = color ?? t.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={{
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: selected ? c : t.border,
        backgroundColor: selected ? alpha(c, 0.16) : t.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? c : t.textMuted} /> : null}
      <Text style={{ color: selected ? c : t.text, fontWeight: selected ? '700' : '500', fontSize: 13 * t.fontScale }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color, icon }: { label: string; color?: string; icon?: IconName }) {
  const t = useTheme();
  const c = color ?? t.textMuted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: alpha(c, 0.15) }}>
      {icon ? <Ionicons name={icon} size={12} color={c} /> : null}
      <Text style={{ color: c, fontSize: 11 * t.fontScale, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surface2, borderRadius: t.radius, padding: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={{ flex: 1, minHeight: 38, borderRadius: t.radius - 3, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.surface : 'transparent' }}
          >
            <Text style={{ color: on ? t.text : t.textMuted, fontWeight: on ? '700' : '500', fontSize: 13 * t.fontScale }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Formulaires ---------- */
export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <T v="label" muted>
        {label}
      </T>
      <TextInput
        placeholderTextColor={t.textMuted}
        accessibilityLabel={label}
        {...props}
        style={[
          {
            minHeight: props.multiline ? 84 : 46,
            borderWidth: 1,
            borderColor: error ? t.danger : t.border,
            borderRadius: t.radius - 2,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: t.text,
            backgroundColor: t.surface,
            fontSize: 15 * t.fontScale,
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
          props.style,
        ]}
      />
      {error ? (
        <T v="small" color={t.danger}>
          {error}
        </T>
      ) : hint ? (
        <T v="small" muted>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange, disabled }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Row style={{ minHeight: 48, justifyContent: 'space-between', opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {sub ? (
          <T v="small" muted>
            {sub}
          </T>
        ) : null}
      </View>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: t.primary, false: t.surface2 }} thumbColor="#fff" />
    </Row>
  );
}

export function ListItem({ title, sub, right, icon, iconColor, onPress }: { title: string; sub?: string; right?: React.ReactNode; icon?: IconName; iconColor?: string; onPress?: () => void }) {
  const t = useTheme();
  const content = (
    <Row style={{ minHeight: 52, paddingVertical: 6 }}>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: alpha(iconColor ?? t.primary, 0.15), alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={iconColor ?? t.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T numberOfLines={1} style={{ fontWeight: '600' }}>
          {title}
        </T>
        {sub ? (
          <T v="small" muted numberOfLines={2}>
            {sub}
          </T>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={t.textMuted} /> : null}
    </Row>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}

/* ---------- Feedback ---------- */
export function Banner({ kind = 'info', title, text, icon, action }: { kind?: 'info' | 'warning' | 'danger' | 'success' | 'demo'; title?: string; text: string; icon?: IconName; action?: React.ReactNode }) {
  const t = useTheme();
  const c = { info: t.info, warning: t.warning, danger: t.danger, success: t.success, demo: t.accent }[kind];
  const ic: IconName = icon ?? ({ info: 'information-circle', warning: 'warning', danger: 'alert-circle', success: 'checkmark-circle', demo: 'flask' } as const)[kind];
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: t.radius, backgroundColor: alpha(c, 0.12), borderWidth: 1, borderColor: alpha(c, 0.35) }}>
      <Ionicons name={ic} size={20} color={c} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <T style={{ fontWeight: '700' }}>{title}</T> : null}
        <T v="small">{text}</T>
        {action ? <View style={{ marginTop: 6 }}>{action}</View> : null}
      </View>
    </View>
  );
}

export function DemoBadge({ label = 'Démo / Échantillon' }: { label?: string }) {
  const t = useTheme();
  return <Badge label={label} color={t.accent} icon="flask" />;
}

export function OfflineBadge({ text = 'Hors ligne — données en cache' }: { text?: string }) {
  const online = useOnline();
  const t = useTheme();
  if (online) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: t.warning, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="cloud-offline" size={14} color="#111" />
      <Text style={{ color: '#111', fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'sparkles', title, text, action }: { icon?: IconName; title: string; text?: string; action?: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 28, gap: 8 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: alpha(t.primary, 0.12), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={30} color={t.primary} />
      </View>
      <T v="h3" center>
        {title}
      </T>
      {text ? (
        <T v="small" muted center>
          {text}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(op, { toValue: 0.4, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[{ height, width, borderRadius: 8, backgroundColor: t.surface2, opacity: op }, style]} />;
}

export function Progress({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ height, borderRadius: height / 2, backgroundColor: t.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height: '100%', backgroundColor: color ?? t.primary, borderRadius: height / 2 }} />
    </View>
  );
}

export function Stat({ label, value, sub, color, demo }: { label: string; value: string; sub?: string; color?: string; demo?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexGrow: 1, flexBasis: 140, backgroundColor: t.surface, borderRadius: t.radius, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border, padding: 12, gap: 2 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="caption" muted>
          {label}
        </T>
        {demo ? <Ionicons name="flask" size={12} color={t.accent} accessibilityLabel="Donnée de démonstration" /> : null}
      </Row>
      <T v="h1" color={color}>
        {value}
      </T>
      {sub ? (
        <T v="small" muted>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Fermer" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} />
      <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', paddingBottom: insets.bottom + 12 }}>
        <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center' }}>
          <Row style={{ padding: 16, paddingBottom: 6, justifyContent: 'space-between' }}>
            <T v="h2">{title}</T>
            <IconButton icon="close" a11y="Fermer" onPress={onClose} />
          </Row>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ width: '100%', maxWidth: 820, alignSelf: 'center', padding: 16, paddingTop: 4, gap: 12 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; text: string; kind: 'info' | 'success' | 'error' };
const ToastCtx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const push = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, text, kind }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 72, alignItems: 'center', gap: 8 }}>
        {toasts.map((x) => (
          <View
            key={x.id}
            accessibilityLiveRegion="polite"
            style={{
              maxWidth: 520,
              marginHorizontal: 16,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: x.kind === 'error' ? t.danger : x.kind === 'success' ? t.success : t.dark ? '#f2f2f2' : '#1d1d1f',
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <Ionicons name={x.kind === 'error' ? 'alert-circle' : x.kind === 'success' ? 'checkmark-circle' : 'information-circle'} size={18} color={x.kind === 'info' && t.dark ? '#111' : '#fff'} />
            <Text style={{ color: x.kind === 'info' && t.dark ? '#111' : '#fff', fontWeight: '600' }}>{x.text}</Text>
          </View>
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

/* ---------- Boot sans "Loading" infini ---------- */
export function BootGate({ hydrate, children, appName, timeoutMs = 4000 }: { hydrate: () => Promise<void>; children: React.ReactNode; appName: string; timeoutMs?: number }) {
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const t = useTheme();
  const run = useCallback(() => {
    setState('loading');
    let done = false;
    const timer = setTimeout(() => {
      if (!done) setState('fallback');
    }, timeoutMs);
    hydrate()
      .then(() => {
        done = true;
        clearTimeout(timer);
        setState('ready');
      })
      .catch(() => {
        done = true;
        clearTimeout(timer);
        setState('fallback');
      });
  }, [hydrate, timeoutMs]);
  useEffect(() => {
    run();
  }, [run]);

  if (state === 'ready') return <>{children}</>;
  if (state === 'loading')
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, gap: 14, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <T v="h2" center>
          {appName}
        </T>
        <Skeleton height={22} />
        <Skeleton height={90} />
        <Skeleton height={90} />
      </View>
    );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, gap: 14, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <Banner kind="warning" title="Chargement plus long que prévu" text="Le stockage local ne répond pas. Vous pouvez réessayer ou continuer avec les données locales par défaut (hors ligne)." />
      <Button title="Réessayer" icon="refresh" onPress={run} />
      <Button title="Continuer hors ligne" kind="secondary" onPress={() => setState('ready')} />
    </View>
  );
}
