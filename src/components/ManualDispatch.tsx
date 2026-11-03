import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { Badge, Banner, Button, Card, DemoBadge, EmptyState, Row, T, useToast } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { fmtMoney } from '@/kit/format';
import { CATEGORIES } from '@/lib/pricing';
import { assignRideManually, docReport, LOCAL_DRIVER_ID, store, type Ride } from '@/state';
import { ENV } from '@/config';
import { parseOtrMaxMinutes } from '@/lib/rules';

type DropEvent = { preventDefault?: () => void; dataTransfer?: DataTransfer; nativeEvent?: { dataTransfer?: DataTransfer } };

function rideIdFromDrop(e: DropEvent): string {
  const dt = e.dataTransfer ?? e.nativeEvent?.dataTransfer;
  return dt?.getData('text/plain') ?? '';
}

export function ManualDispatch() {
  const t = useTheme();
  const toast = useToast();
  const s = store.use();
  const [last, setLast] = useState<{ ok: boolean; reasons: string[]; notes: string[] } | null>(null);
  const queue = s.rides.filter((r) => r.status === 'requested');
  const report = docReport(s);
  const otr = parseOtrMaxMinutes(ENV.otr2Limits);

  const assign = (ride: Ride) => {
    if (ride.simulated) {
      toast('Course en simulation : le dispatch manuel ne s’applique pas', 'info');
      return;
    }
    const result = assignRideManually(ride.id);
    setLast(result);
    toast(result.ok ? 'Course attribuée au chauffeur local' : 'Attribution refusée', result.ok ? 'success' : 'error');
  };

  return (
    <View style={{ gap: 12 }}>
      <Banner
        kind="info"
        text="Dispatch manuel : glissez une réservation sur le chauffeur, ou utilisez Attribuer. Contrôles : documents validés, catégorie, places, disponibilité, seuil OTR 2 s’il est configuré."
      />
      <Card
        // @ts-expect-error props web (drop)
        onDragOver={(e: DropEvent) => e.preventDefault?.()}
        onDrop={(e: DropEvent) => {
          e.preventDefault?.();
          const id = rideIdFromDrop(e);
          const ride = queue.find((r) => r.id === id);
          if (ride) assign(ride);
        }}
      >
        <T v="h3">Chauffeur local</T>
        <T v="small" muted>
          {s.driver.online ? 'En ligne' : 'Hors ligne'}
          {s.driver.vehicleCategory ? ` · ${CATEGORIES.find((c) => c.id === s.driver.vehicleCategory)?.name}` : ' · catégorie non renseignée'}
          {s.driver.vehicleSeats != null ? ` · ${s.driver.vehicleSeats} places` : ''}
          {` · conduite ${s.driver.drivingMinutes} min`}
        </T>
        <T v="small" muted>
          Documents bloquants : {report.blockers.length === 0 ? 'aucun' : report.blockers.map((b) => b.label).join(', ')}
        </T>
        <T v="small" muted>
          {otr == null ? 'OTR 2 : YOUR_OTR2_LIMITS non renseigné — à valider.' : `Seuil OTR 2 configuré : ${otr} min (à valider).`}
        </T>
        <T v="caption" muted>
          Zone de dépôt
        </T>
      </Card>

      {last && !last.ok ? <Banner kind="danger" title="Contrôle automatique" text={last.reasons.join(' ')} /> : null}
      {last?.notes.length ? <Banner kind="warning" text={last.notes.join(' ')} /> : null}
      {last?.ok ? <Banner kind="success" text="Attribution enregistrée dans le journal. Le chauffeur doit encore accepter la course." /> : null}

      {queue.length === 0 ? (
        <EmptyState icon="git-compare" title="Aucune réservation en attente" text="Les demandes non simulées apparaissent ici pour une attribution manuelle." />
      ) : (
        queue.map((r) => {
          const cat = CATEGORIES.find((c) => c.id === r.category);
          const drag = Platform.OS === 'web' ? { draggable: true, onDragStart: (e: DropEvent) => (e.dataTransfer ?? e.nativeEvent?.dataTransfer)?.setData('text/plain', r.id) } : {};
          return (
            <Card key={r.id}>
              <View {...drag}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="h3">{cat?.name ?? r.category}</T>
                  <Row gap={6}>
                    {r.simulated ? <DemoBadge /> : null}
                    {r.demo ? <DemoBadge label="Test" /> : null}
                    {r.assignedDriverId === LOCAL_DRIVER_ID ? <Badge label="Attribuée" color={t.success} /> : null}
                    <T v="h3" tabular color={t.primary}>
                      {fmtMoney(r.priceMaximum ?? r.price, 'CHF', 0)}
                    </T>
                  </Row>
                </Row>
                <T v="small">
                  {r.pickup.label} → {r.dropoff.label}
                </T>
                <T v="small" muted>
                  Prix maximum · {r.simulated ? 'simulation, dispatch non requis' : 'glisser vers le chauffeur ou attribuer'}
                </T>
              </View>
              <Button title="Attribuer" icon="person-add" disabled={!!r.simulated || r.assignedDriverId === LOCAL_DRIVER_ID} onPress={() => assign(r)} />
            </Card>
          );
        })
      )}
    </View>
  );
}
