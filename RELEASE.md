# Release `release/next`

Cette branche est la ligne de préparation TestFlight. **`main` déploie le site** (GitHub Pages, workflow `pages.yml`). Ne pas fusionner `release/next` dans `main` sans un accord explicite : un merge lancerait la publication web.

Les branches d’origine ne sont pas supprimées.

## D’où vient cette tête

Les builds TestFlight déjà préparés dans le dépôt (identifiant App Store Connect, profils EAS, `ascAppId`) sont sur `main`, commits `a8be520`, `5097036` et `fa60db6`, puis le correctif de stockage des builds EAS mergé avec la PR 1. Aucune pull request ouverte ne contient un journal de build EAS : leurs textes disent qu’aucun build n’a été lancé.

`release/next` part de la tête produit la plus avancée qui contient encore cette base TestFlight :

| Branche | PR | Intégrée | Pourquoi |
|---|---|---|---|
| `cursor/preservation-fondation-fde0` | [#4](https://github.com/mohamadalhabib92/onyx-transit/pull/4) | oui, base | Dernière tête produit (7 nov. 2026) au-dessus du `main` TestFlight. Préserve `onyx-transit@v1`. |
| `ux/passe-plaisir-2026-11-04` | [#3](https://github.com/mohamadalhabib92/onyx-transit/pull/3) | oui | Ressorts, haptique, Dynamic Type, cibles 44 pt, contraste. Conflits résolus dans `package.json` (tous les tests) et `src/kit/ui.tsx` (BootGate + mouvement). |
| `ci/pr-checks-2026-11-19` | [#5](https://github.com/mohamadalhabib92/onyx-transit/pull/5) | oui, puis étendue | Contrôles PR et Dependabot. Le workflow couvre maintenant chaque push et chaque PR, et ajoute `expo export`. |

Aucune branche ouverte n’a été laissée de côté.

## Ce que fait l’intégration continue

`.github/workflows/pr-checks.yml` (`CI`) sur **chaque push** et **chaque pull request** :

1. `npm ci`
2. `npm run typecheck`
3. `npm test`
4. `npx expo export -p web`

Pas de secret, pas de déploiement, pas de build EAS. Le déploiement Pages reste réservé au push sur `main`.

## Envoyer un build sur TestFlight

À lancer **à la main**, depuis un clone de `release/next`, par la personne qui détient le compte Expo `habib548` et la clé App Store Connect. Ce dépôt ne lance pas ces commandes.

```bash
git checkout release/next
git pull
npm ci
npx eas-cli build --profile production --platform ios --non-interactive
npx eas-cli submit --profile production --platform ios --latest --non-interactive
```

Le profil `production` est déjà dans `eas.json` : `autoIncrement`, `EXPO_NO_CAPABILITY_SYNC=1`, `ascAppId` `6790746086`, équipe `Y9XF9RY2BU`. La clé API n’est pas dans le dépôt. Elle se fournit par les variables déjà prévues :

- `EXPO_TOKEN` (compte Expo, hors du dépôt)
- `EXPO_ASC_API_KEY_PATH`
- `EXPO_ASC_KEY_ID`
- `EXPO_ASC_ISSUER_ID`

`eas build` produit l’IPA. `eas submit` l’envoie à App Store Connect, où TestFlight la reçoit. Cela ne soumet pas l’app à l’examen App Store. Ne pas changer le bundle id `com.vibecode.onyxtransit-mvty5t`, les entitlements, ni la signature dans cette branche.

`expo-haptics` (passé avec la PR 3) demande un binaire natif neuf : le JavaScript servi par Expo Go ne suffit pas pour les vibrations sur iPhone.

Le web de cette branche se vérifie en local avec `npm run build:web` puis `npm run serve:web` (`http://localhost:8080/onyx-transit/`). Ce n’est pas le site public tant que `main` n’a pas bougé.

## Verre

Thèmes clair et sombre partagés (`onyx`, `verreClair`), surfaces translucides avec repli opaque, boutons en relief (ombre en couches, arête claire, état enfoncé). L’apparence suit le réglage du téléphone. Aucune clé de stockage existante n’est renommée. La clé additive `onyx-transit/pref.vibrations` vient de la PR 3 et reste telle quelle.

## Questions ouvertes

- Statut VTC à Lausanne : non décidé ici. L’app décrit un prototype local centré sur Genève. Aucune ville lausannoise n’est ajoutée.
- Autorisation de transport professionnel à Genève (LTVTC) et preuve à montrer à Apple : non tranchées. La fiche `store/ios-metadata.md` reste un brouillon.
- Identité légale encore en placeholders (`YOUR_COMPANY_LEGAL_NAME`, `YOUR_VAT_NUMBER`, `YOUR_DPO_EMAIL`, `YOUR_SUPPORT_EMAIL`).
- `geneve: true` est encore forcé dans les villes stockées. C’est le backlog noté par la PR 4, non modifié.
- La PR 3 avait choisi le sombre seul comme marque. Verre ajoute le clair en suivant le système. `userInterfaceStyle` passe de `dark` à `automatic`. Le bundle id ne change pas.
- Soumission App Store, build EAS et migration Supabase : hors de cette branche.
