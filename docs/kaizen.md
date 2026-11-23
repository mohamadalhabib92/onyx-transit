# Kaizen — Onyx Transit

Petites améliorations sur `release/next`. Pas de fusion dans `main`. Aucune course ni clé de stockage retirée.

## 2026-11-23

Écart visé : certitude du prix et prises en charge aéroport ou gare (repères Blacklane / Wheely), sans nouvelle grille tarifaire et sans décision sur une autorisation de transport.

### 1. Prix maximum annoncé avant la confirmation

Avant : le montant était sur la ligne de catégorie, dans le libellé du bouton et dans une phrase qui citait `YOUR_TARIFF_TABLE` comme grille « à valider ».

Après : une carte « Prix maximum annoncé » affiche le plafond juste au-dessus du bouton Confirmer. Le chiffre est `announcedMaximum`, c’est-à-dire le `price` déjà renvoyé par `estimate` (distance estimée × 1,3, puis la grille de démonstration). La borne haute indicative n’est pas montrée. Le bouton reprend le même montant. L’historique des trajets affiche « max. ».

Fichiers : `src/lib/pricing.ts`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/trips.tsx`, `src/app/support.tsx`.

Tests : `scripts/meet.test.ts` (le plafond annoncé égale `quote.price` et diffère de `high`).

### 2. Numéro de vol ou de train, carte de prise en charge

Avant : GVA et Cornavin étaient des lieux comme les autres. Rien n’était stocké avec la course pour le vol ou le train.

Après : si le départ est exactement « Aéroport de Genève (GVA) » ou « Gare de Cornavin », une carte montre l’adresse déjà connue et un champ facultatif. La valeur nettoyée part dans `arrivalRef` sur la course. Les autres lieux n’enregistrent pas ce champ. Une course ancienne sans ce champ reste lisible. Une valeur qui n’est pas du texte bloque la réécriture, comme pour le prix maximum.

Fichiers : `src/lib/meet.ts`, `src/components/PickupCard.tsx`, `src/state.ts`, `src/app/(tabs)/index.tsx`, `src/app/ride/[id].tsx`, `src/app/(tabs)/trips.tsx`, `src/app/(tabs)/admin.tsx`.

Tests : `scripts/meet.test.ts`, `scripts/preserve-state.test.ts` (référence textuelle conservée, nombre refusé).

### 3. Autorisation VTC hors de l’écran client

Avant : le reçu client imprimait « N° carte VTC ». L’accueil, la confidentialité, l’aide et l’annulation citaient nLPD, RGPD, une obligation légale de transport, ou des placeholders « à valider ».

Après : le numéro de carte sort du reçu et du détail client. Le reçu n’imprime plus un nom de société ou une TVA placeholder « à valider ». Le numéro reste saisissable dans l’espace chauffeur et visible dans l’admin (liste, export `carte_vtc`, fiche chauffeur). Les écrans client décrivent ce qui est enregistré sur l’appareil, sans formule juridique inachevée. La phrase de conservation des coordonnées et la mention « pas une autorisation de transport » restent. Les cases de consentement, l’annulation et l’export restent.

Fichiers : `src/app/ride/[id].tsx`, `src/app/welcome.tsx`, `src/app/privacy.tsx`, `src/app/support.tsx`, `src/app/(tabs)/index.tsx`, `src/app/(tabs)/admin.tsx`.

Tests : `scripts/kaizen-copy.test.ts`, `scripts/location-retention.test.ts` (phrase de coordonnées inchangée dans son rôle).
