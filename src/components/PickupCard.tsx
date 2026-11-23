import React from 'react';
import { Card, Field, T } from '@/kit/ui';
import { meetFor } from '@/lib/meet';

/** Carte de prise en charge aéroport ou gare. Rien si le lieu n’est pas GVA ou Cornavin. */
export function PickupCard({
  stop,
  value,
  onChange,
}: {
  stop: { label: string };
  value: string;
  onChange?: (next: string) => void;
}) {
  const meet = meetFor(stop);
  if (onChange) {
    if (!meet) return null;
  } else if (!meet && !value.trim()) return null;
  const label = meet?.refLabel ?? 'Référence enregistrée';
  const shown = value.trim();
  return (
    <Card>
      <T v="caption" muted>
        Prise en charge
      </T>
      <T v="h3">{meet?.place.name ?? stop.label}</T>
      {meet ? (
        <T v="small" muted>
          {meet.place.sub}
        </T>
      ) : null}
      {onChange ? (
        <Field
          label={label}
          value={value}
          onChangeText={onChange}
          placeholder={meet?.placeholder}
          autoCapitalize="characters"
          autoCorrect={false}
          hint="Facultatif. Enregistré avec la course sur cet appareil."
        />
      ) : (
        <T accessibilityLabel={shown ? `${label} ${shown}` : `${label} non renseigné`}>
          {shown ? `${label} : ${shown}` : `${label} : non renseigné`}
        </T>
      )}
    </Card>
  );
}
