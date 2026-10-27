import { useEffect } from 'react';
import { advanceRide, store, updateRide } from '@/state';

/**
 * Simulateur de suivi (DÉMO, clairement étiqueté dans l’UI) :
 * - anime la position de la voiture pour les courses actives ;
 * - fait avancer automatiquement les courses « simulées » (aucun véhicule réel).
 * Les courses non simulées n’avancent que via l’espace chauffeur.
 */
export function useRideSimulator() {
  useEffect(() => {
    const timer = setInterval(() => {
      const s = store.get();
      for (const r of s.rides) {
        if (!['requested', 'accepted', 'arriving', 'in_progress'].includes(r.status)) continue;
        const age = (Date.now() - (r.events[r.events.length - 1]?.at ?? r.createdAt)) / 1000;
        if (r.status === 'requested') {
          if (r.simulated && s.autoSim && age > 3) advanceRide(r.id, 'Chauffeur simulé');
        } else if (r.status === 'accepted' || r.status === 'in_progress') {
          const step = r.status === 'accepted' ? 0.08 : Math.max(0.02, 0.6 / Math.max(4, r.minutes));
          const next = Math.min(1, r.progress + step);
          if (next !== r.progress) updateRide(r.id, { progress: next });
          if (next >= 1 && r.simulated && s.autoSim) advanceRide(r.id);
        } else if (r.status === 'arriving') {
          if (r.simulated && s.autoSim && age > 3) advanceRide(r.id);
        }
      }
    }, 700);
    return () => clearInterval(timer);
  }, []);
}
