import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Rect, Stop as SvgStop, Text as SvgText } from 'react-native-svg';
import { alpha, useTheme } from '@/kit/theme';
import { T } from '@/kit/ui';
import type { LatLon } from '@/lib/pricing';

/**
 * Carte SCHÉMATIQUE dessinée localement (aucun fond de carte, aucune API payante).
 * Lac Léman et Rhône sont des tracés simplifiés. Un vrai fond de carte (Mapbox/Google)
 * nécessiterait une clé YOUR_MAPS_API_KEY (Phase 2).
 */
const LAKE: [number, number][] = [
  [46.2045, 6.1475], [46.2105, 6.148], [46.225, 6.153], [46.245, 6.16], [46.27, 6.168], [46.3, 6.185],
  [46.32, 6.22], [46.29, 6.215], [46.255, 6.192], [46.23, 6.176], [46.214, 6.163], [46.2055, 6.1555],
];
const RHONE: [number, number][] = [[46.2045, 6.1475], [46.2035, 6.138], [46.2065, 6.125], [46.2015, 6.108], [46.19, 6.085], [46.18, 6.05]];
const ARVE: [number, number][] = [[46.2015, 6.108], [46.195, 6.125], [46.188, 6.145], [46.183, 6.17]];

const W = 360;
const H = 220;

function bezier(p0: { x: number; y: number }, c: { x: number; y: number }, p1: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}

export function RouteMap({
  pickup,
  dropoff,
  car,
  label,
}: {
  pickup?: LatLon | null;
  dropoff?: LatLon | null;
  /** position de la voiture : { leg: 'approach' | 'trip', t: 0..1 } */
  car?: { leg: 'approach' | 'trip'; t: number } | null;
  label?: string;
}) {
  const th = useTheme();
  const pts = [pickup, dropoff].filter(Boolean) as LatLon[];
  // Cadre : Genève par défaut, sinon englobe les points avec marge
  let minLat = 46.165, maxLat = 46.29, minLon = 6.03, maxLon = 6.22;
  if (pts.length) {
    const lats = pts.map((p) => p.lat);
    const lons = pts.map((p) => p.lon);
    const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const cLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    const span = Math.max(0.03, (Math.max(...lats) - Math.min(...lats)) * 1.8, ((Math.max(...lons) - Math.min(...lons)) * 1.8 * H) / W / 1.45);
    minLat = cLat - span / 2;
    maxLat = cLat + span / 2;
    const lonSpan = (span * W * 1.45) / H;
    minLon = cLon - lonSpan / 2;
    maxLon = cLon + lonSpan / 2;
  }
  const proj = (lat: number, lon: number) => ({ x: ((lon - minLon) / (maxLon - minLon)) * W, y: H - ((lat - minLat) / (maxLat - minLat)) * H });
  const poly = (arr: [number, number][]) => arr.map(([la, lo]) => { const p = proj(la, lo); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
  const path = (arr: [number, number][]) => arr.map(([la, lo], i) => { const p = proj(la, lo); return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ');

  const A = pickup ? proj(pickup.lat, pickup.lon) : null;
  const B = dropoff ? proj(dropoff.lat, dropoff.lon) : null;
  const ctrl = A && B ? { x: (A.x + B.x) / 2 - (B.y - A.y) * 0.25, y: (A.y + B.y) / 2 + (B.x - A.x) * 0.25 } : null;
  const approachStart = A ? { x: A.x - 70, y: A.y + 50 } : null;
  let carPos: { x: number; y: number } | null = null;
  if (car && A) {
    if (car.leg === 'approach' && approachStart) carPos = { x: approachStart.x + (A.x - approachStart.x) * car.t, y: approachStart.y + (A.y - approachStart.y) * car.t };
    if (car.leg === 'trip' && B && ctrl) carPos = bezier(A, ctrl, B, car.t);
  }

  // Halo pulsé autour du point de départ — transformOrigin en camelCase (correctif web)
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.quad), useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={{ borderRadius: th.radius, overflow: 'hidden', backgroundColor: '#0F1116', borderWidth: 1, borderColor: th.border }}>
      <View style={{ width: '100%', aspectRatio: W / H }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
          <Defs>
            <LinearGradient id="route" x1="0" y1="0" x2="1" y2="1">
              <SvgStop offset="0" stopColor={th.accent} />
              <SvgStop offset="1" stopColor={th.primary} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill="#0F1116" />
          <G opacity={0.35}>
            {Array.from({ length: 13 }).map((_, i) => (
              <Line key={'v' + i} x1={i * 30} y1={0} x2={i * 30} y2={H} stroke="#262A33" strokeWidth={1} />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <Line key={'h' + i} x1={0} y1={i * 30} x2={W} y2={i * 30} stroke="#262A33" strokeWidth={1} />
            ))}
          </G>
          <Polygon points={poly(LAKE)} fill="#14263A" stroke="#1F3A57" strokeWidth={1} />
          <Path d={path(RHONE)} stroke="#1F3A57" strokeWidth={4} fill="none" strokeLinecap="round" />
          <Path d={path(ARVE)} stroke="#1A3048" strokeWidth={2.5} fill="none" strokeLinecap="round" />
          {A && B && ctrl ? (
            <>
              <Path d={`M${A.x} ${A.y} Q${ctrl.x} ${ctrl.y} ${B.x} ${B.y}`} stroke={alpha(th.primary, 0.25)} strokeWidth={9} fill="none" strokeLinecap="round" />
              <Path d={`M${A.x} ${A.y} Q${ctrl.x} ${ctrl.y} ${B.x} ${B.y}`} stroke="url(#route)" strokeWidth={3.5} fill="none" strokeLinecap="round" />
            </>
          ) : null}
          {car?.leg === 'approach' && A && approachStart ? (
            <Line x1={approachStart.x} y1={approachStart.y} x2={A.x} y2={A.y} stroke={alpha(th.info, 0.7)} strokeWidth={2} strokeDasharray="5,5" />
          ) : null}
          {A ? (
            <G>
              <Circle cx={A.x} cy={A.y} r={9} fill={alpha(th.success, 0.25)} />
              <Circle cx={A.x} cy={A.y} r={5} fill={th.success} stroke="#fff" strokeWidth={1.5} />
            </G>
          ) : null}
          {B ? (
            <G>
              <Rect x={B.x - 6} y={B.y - 6} width={12} height={12} rx={2} fill={th.primary} stroke="#fff" strokeWidth={1.5} />
            </G>
          ) : null}
          {carPos ? (
            <G>
              <Circle cx={carPos.x} cy={carPos.y} r={11} fill={alpha(th.accent, 0.25)} />
              <Circle cx={carPos.x} cy={carPos.y} r={6.5} fill={th.accent} stroke="#0B0B0D" strokeWidth={2} />
            </G>
          ) : null}
          <SvgText x={8} y={H - 8} fill="#5C6270" fontSize={9}>
            Carte schématique — Genève (tracés simplifiés)
          </SvgText>
        </Svg>
        {A ? (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${(A.x / W) * 100}%`,
              top: `${(A.y / H) * 100}%`,
              width: 40,
              height: 40,
              marginLeft: -20,
              marginTop: -20,
              borderRadius: 20,
              borderWidth: 2,
              borderColor: th.success,
              transformOrigin: 'center',
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.4] }) }],
            }}
          />
        ) : null}
      </View>
      {label ? (
        <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: th.border }}>
          <T v="small" muted>
            {label}
          </T>
        </View>
      ) : null}
    </View>
  );
}
