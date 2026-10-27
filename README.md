# Onyx Transit — chauffeur privé premium (Genève)

Application **Expo (React Native + expo-router, TypeScript)** pour iOS, Android et **PWA installable**.
Recréée à partir du cahier des charges `05-onyx-transit.md`. Tout le parcours principal fonctionne **hors ligne, sur l’appareil** (stockage local), sans aucune API payante.

## Fonctionnalités

**Client**
- Profil local + consentements RGPD/nLPD (CGU, confidentialité obligatoires ; GPS et marketing facultatifs et révocables).
- Départ/destination : lieux publics de Genève (aéroport, Cornavin, Palais des Nations…) ou **position GPS** (expo-location, avec consentement).
- Estimation de prix locale (distance × 1,3, temps urbain) pour 3 catégories — Business, First, Van VIP — **tarifs indicatifs étiquetés « démo »**.
- Carte **schématique** dessinée en SVG (Lac Léman, Rhône, Arve simplifiés) — aucune tuile cartographique ni clé.
- Suivi de course : demande → chauffeur en route → arrivé → en course → terminée. Le **suivi simulé** est clairement indiqué ; on peut le désactiver pour piloter la course depuis l’espace chauffeur.
- Reçu détaillé (téléchargeable en .txt), notation 1–5 ★, réclamation à l’amiable, historique des trajets.
- Moyens de paiement : *Paiement simulé (démo)* actif ; Carte Stripe = « configuration manquante » tant que les clés ne sont pas fournies ; Apple Pay / Google Pay = Phase 1.1 ; facture entreprise si société renseignée.
- Assistance (FAQ, numéros d’urgence suisses), états vides/erreur, badge hors ligne.

**Chauffeur**
- En ligne / hors ligne, gains de la session (part chauffeur 80 % = hypothèse démo).
- Accepter / refuser, naviguer vers la prise en charge et la destination (lien Google Maps), « Arrivé », « Démarrer », « Terminer ».
- Documents réglementaires : statut local (aucun fichier envoyé tant que le stockage n’est pas configuré).
- Véhicule représenté par une silhouette générique (aucune photo de marque).

**Admin**
- Courses (indicateurs **calculés** sur les données locales, aucun KPI inventé), export CSV.
- Utilisateurs, chauffeurs (validation des documents), litiges (clôture à l’amiable).
- Villes : Genève active ; Paris et Casablanca désactivées (activables, affichées « bientôt »).
- Système : **Backend cible** `EXPO_PUBLIC_API_BASE_URL=YOUR_API_BASE_URL`, statut de chaque variable, **Dispatch IA = Phase 2 (désactivé)**.

**Confidentialité** : bases légales, durées de conservation, export JSON de toutes mes données, suppression du compte.

> Correctif web : les styles utilisent `transformOrigin` (camelCase) — plus de `transform-origin` invalide.

## Lancer en local

```bash
npm install
npx expo start          # puis i (iOS), a (Android) ou w (web)
```

Vérifications :

```bash
npm run typecheck       # tsc --noEmit
npm run build:web       # expo export -p web + post-traitement PWA → dist/
npm run serve:web       # puis ouvrir http://localhost:8080/onyx-transit/
```

## Build web / PWA

`npm run build:web` exécute `expo export -p web` puis `scripts/pwa.mjs`, qui :
- ajoute `manifest.webmanifest`, les icônes (`assets/pwa/`), les balises iOS/Android ;
- génère `sw.js` (service worker : app shell + bundles en cache → **fonctionne hors ligne**) ;
- copie `index.html` en `404.html` (routage SPA sur GitHub Pages).

L’app est servie sous le chemin **`/onyx-transit`** (`experiments.baseUrl` dans `app.json`), prévu pour GitHub Pages
`https://<utilisateur>.github.io/onyx-transit/`. Si le dépôt porte un autre nom, modifiez `baseUrl` en conséquence.
Pour tester localement : `npm run serve:web` sert `dist/` sous ce chemin (http://localhost:8080/onyx-transit/).

## Déploiement GitHub Pages

Le workflow `.github/workflows/pages.yml` (push sur `main` ou lancement manuel) installe, vérifie les types, construit la PWA et la publie.
Dans le dépôt GitHub : *Settings → Pages → Source : GitHub Actions*.

## Configuration (placeholders)

Copiez `.env.example` en `.env`. **Aucune vraie clé n’est fournie** ; sans configuration l’app reste en mode local.

| Variable | Rôle | Où |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL` | comptes / synchro | app (public) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY` | clé anon (RLS) | app (public) |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=YOUR_STRIPE_PUBLISHABLE_KEY` | paiement carte | app (public) |
| `EXPO_PUBLIC_API_BASE_URL=YOUR_API_BASE_URL` | backend (dispatch, paiements serveur) | app (public) |
| `STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY` | encaissement | **serveur uniquement** |

Autres textes à compléter avant lancement : `YOUR_COMPANY_LEGAL_NAME`, `YOUR_DPO_EMAIL`, `YOUR_SUPPORT_EMAIL`, `YOUR_VAT_NUMBER`, identifiants `com.yourcompany.*` dans `app.json`.

## Limites connues / Phase 2
- Pas de backend : comptes, dispatch et paiements réels nécessitent Supabase + API + Stripe.
- Démo chauffeur/client sur **un seul appareil** (même stockage local).
- Recherche d’adresse libre (géocodage) et vrai fond de carte : Phase 2 (`YOUR_MAPS_API_KEY`).
- Apple Pay / Google Pay : Phase 1.1. Dispatch IA : Phase 2 expérimental.
- Ancien backend Vibecode `clover-maritime.vibecode.run` : **non repris** (non confirmé comme backend réel) ; à saisir dans `EXPO_PUBLIC_API_BASE_URL` seulement après confirmation.
