# Audit Onyx Transit — 7 novembre 2026

Document de travail. Ce n’est pas une certification juridique, pas un agrément de transport, pas une preuve que des courses ont lieu, et pas une sauvegarde d’appareil.

Commits cités :

- Base auditée, lue avant le correctif : `550bf6754d821122f4d51aa2ce53abdfe457231e` (main, après les PR 1 et 2).
- Correctif de préservation : `63bbbfb14de6fb6d1fbe02beacc661dead7e6cda` sur `cursor/preservation-fondation-fde0`.
- Suivi, texte de conservation des coordonnées : `35860af64d6375015d0516b6df6460bd231745b9` (même branche, même pull request).
- Les numéros de ligne « avant » sont ceux lus sur `550bf67`. Les numéros de préservation sont ceux de `63bbbfb`. Le suivi ne change pas `reviveAppState`.

Description reçue de l’utilisateur : VTC à Lausanne. Le dépôt, lui, parle de chauffeur privé à Genève. Rien dans le code ne prouve une autorisation cantonale, une flotte, ni un service de courses réel.

## Diagnostic (cinq lignes)

1. Au commit `550bf67`, Onyx Transit est un prototype Expo (React Native, web, PWA) dont tout le parcours tient sur l’appareil, clé `onyx-transit@v1`, sans backend branché.
2. Le plus grand risque de perte était une reprise trop arrangeante : un objet JSON de forme future ou étrangère devenait un état vide, puis la prochaine écriture, déconnexion comprise, remplaçait la clé.
3. Le JSON cassé, `null`, un nombre ou un tableau étaient déjà copiés sans écrasement (PR 1) ; un objet « lisible » mais incompatible ne l’était pas.
4. Le commit `63bbbfb` refuse cette réécriture, montre l’état incompatible, et n’efface la clé active qu’après copie brute, empreinte SHA-256 et restauration isolée ; il ne recolle jamais cette copie sur la clé active.
5. `npm test` donne 20/20 en mémoire, dont les 17 tests du correctif de préservation, toujours verts. Ce n’est pas un iPhone, pas un iPad, pas un navigateur réel, et il n’existe aucune preuve Supabase.

## Ce qui a été fait, et rien d’autre

Un seul correctif, borné à la conservation du document local. Pas de réécriture Swift, pas de flotte, pas de fusion, pas de push sur `main`, pas de build EAS, pas de store, pas de déploiement, pas d’appel réseau de production, pas de migration de schéma, pas de service payant, pas de messagerie, pas de réservation réelle, pas de paiement, pas de suivi de position continu.

La clé reste `onyx-transit@v1` (`src/state.ts`, ligne 302). Les champs inconnus d’un document compatible restent dans l’objet et repartent à l’écriture. Une clé connue dont le type empêcherait de réécrire sans jeter des données bloque tout l’enregistrement.

## Suivi : coordonnées et texte

`35860af` ne réécrit aucune course. Il change les phrases qui disaient que la position n’était pas gardée après la course. La phrase tenue par le test est : « Les coordonnées de départ et d’arrivée restent dans l’historique local de la course, sur cet appareil, jusqu’à la suppression de ces données. Cette version ne les envoie à aucun serveur de l’application. »

Vérifié dans le code des écrans : le seul `fetch(` est le rapport de crash Sentry, désactivé avec le placeholder, et il ne contient pas les courses. Aucun client Supabase. Le forçage `geneve: true` (`src/state.ts` ligne 236) n’est pas modifié. Ce n’est pas une approbation de transport ni une validation juridique. Le bandeau « Texte à valider » reste.

## Tableau

| Élément | Problème | Solution concrète | Impact | Effort (1-5) | Priorité |
|---|---|---|---|---|---|
| Reprise d’un objet incompatible | Sur `550bf67`, `revive` (`src/state.ts` 145-172) remplaçait `rides` ou `journal` non tableaux par `[]`, et étalait un profil, un chauffeur ou des villes qui n’étaient pas des objets. | `preservationIssues` (`src/state.ts` 144-221) puis `reviveAppState` (224-253) lèvent `IncompatibleStoredState`. `holdUnreadable` (`src/kit/store.ts` 214-239) copie le brut et ne marque pas le store comme enregistrable. | Les courses, adresses, factures, notes, imports et identifiants qui ne sont pas dans la forme attendue restent les octets d’origine. | 3, fait dans `63bbbfb` | P0 |
| Déconnexion | `account.tsx` 54-56 sur `550bf67` faisait `signedIn: false` puis l’écriture différée de 150 ms gravait l’état repris, y compris s’il avait été vidé. | `applySignOut` (`src/state.ts` 256-258) ne change que le drapeau. Si la reprise est incompatible, `persist` (`src/kit/store.ts` 177-178) ne écrit pas. | Une déconnexion ne doit plus effacer l’historique compatible, ni remplacer un document incompatible. | 2, fait | P0 |
| Nouvelle connexion et fiche profil | L’écran d’accueil remplaçait `consents` par les seules cases du formulaire. L’enregistrement du profil remplaçait tout l’objet profil. | `applySignIn` (275-292) et `applyProfile` (261-272) fusionnent. Branchés dans `welcome.tsx` 41 et `account.tsx` 26 et 55. | Les clés inconnues (`clientId`, `channel`, etc.) survivent à une session et à une fiche. | 2, fait | P0 |
| Export | `privacy.tsx` 64 exportait l’état mémoire, déjà normalisé (`priceMaximum` ajouté, champs jetés). | Bouton « Exporter la copie brute locale » (`privacy.tsx` 61-77) lit `readRaw` (`store.ts` 392), sans réécriture. | L’export contient les octets stockés, champs inconnus compris. | 2, fait | P0 |
| Suppression | `reset` (`store.ts` 211-220 sur `550bf67`) faisait `removeItem` sans copie. | `reset` (`store.ts` 367-390) copie, relit, compare, restaure dans une clé `…restore-isolated`, l’efface, puis seulement alors retire la clé active. L’écran l’explique (`privacy.tsx` 89-106). | La suppression volontaire laisse une copie locale prouvée. Si la copie échoue, la clé active reste. | 3, fait | P0 |
| Échec d’écriture | L’erreur de `setItem` était avalée (`store.ts` 97-99 sur `550bf67`). L’écran montrait un succès. | `writeHealth` (`store.ts` 199-204) et le bandeau dans `LostRideNotice.tsx` 17-22. | L’utilisateur voit que l’écriture n’est pas confirmée. Les octets précédents restent si `setItem` a rejeté. | 2, fait | P0 |
| JSON illisible | Déjà traité en PR 1 : copie `.corrupt-…`, pas d’écrasement. | Conservé, et la copie passe maintenant par la même preuve isolée (`writeVerifiedCopy`, `store.ts` 134-142). | Un brut cassé n’est toujours pas remplacé. La preuve est plus stricte. | 1, renfort | P0, déjà couvert |
| `geneve: true` forcé | `reviveAppState` ligne 236 écrit encore `geneve: true` dans les villes stockées. | Reporté. Le suivi `35860af` ne le change pas : pas de réécriture des villes dans le même passage que le texte de confidentialité. | Une valeur stockée `false` pour Genève peut être réécrite à la prochaine sauvegarde réussie. Reste au backlog. | 1, pas fait | P2, backlog |
| Coordonnées dans l’historique | Le texte disait « le temps de la course uniquement ; non conservée ensuite » (`privacy.tsx`, ancienne ligne 10). Le lieu choisi, GPS ou liste, reste dans `pickup` / `dropoff` (`PlacePicker.tsx` 41, type `Stop`). | `35860af` remplace cette phrase par la conservation réelle (`src/lib/location-copy.ts`, écran, `public/privacy/index.html`, brouillon `store/ios-metadata.md`). Aucune coordonnée n’est effacée. `EXPO_PUBLIC_LOCATION_RETENTION_DAYS` reste un texte affiché (`config.ts` 25 et 51) et ne supprime toujours rien. | Le texte et l’historique disent la même chose : les coordonnées restent sur l’appareil jusqu’à une suppression voulue. Aucun serveur de courses n’est appelé. | 2, fait dans `35860af` | P1, fait |
| Stockage en clair | AsyncStorage / `localStorage`, pas de chiffrement. La fiche iOS dit `ITSAppUsesNonExemptEncryption = false` (`store/ios-metadata.md` 22). | Hors de ce correctif. Un chiffrement serait une migration : interdite ici tant qu’elle n’a pas sa propre copie et son propre plan de retour. | Quiconque ouvre le stockage de l’app lit le JSON. | 4, pas fait | P1 |
| Texte « service » | Accueil : « Chauffeur privé premium à Genève » (`welcome.tsx` 55). Brouillon store : « le chauffeur privé premium à Genève » (`store/ios-metadata.md` 31), marqué non soumis. Liste de lieux : Genève seulement (`src/data/places.ts`). Carte pro : « VTC (Genève) » (`state.ts` 88). Aucune ligne Lausanne. | Ne pas réécrire le produit dans ce correctif. Aligner les phrases sur « prototype local » avant toute publication. | Un lecteur peut croire à un service autorisé. Le code ne le démontre pas. | 2, pas fait | P1 |
| Dispatch et courses | Le simulateur avance les courses `simulated` (`src/lib/simulator.ts` 10-28). Le dispatch manuel est local (`assignRideManually` dans `state.ts`). L’admin peut marquer un document `validated_demo`. | Déjà étiqueté simulation dans plusieurs écrans. Pas de nouveau dispatch. Ne pas présenter ces courses comme des courses réelles. | Aucun chauffeur distant n’est appelé. | 2, pas fait (texte) | P1 |
| Écritures du simulateur | Toutes les 700 ms, une course active peut appeler `updateRide`, donc une écriture au plus toutes les 150 ms. | Pas touché. À ralentir plus tard sans perdre l’historique. | Batterie et usure du stockage non mesurées. | 2, pas fait | P2 |
| Carte et itinéraire | Carte SVG schématique (`RouteMap.tsx`). Distance : vol d’oiseau × 1,3 (`src/lib/pricing.ts` 23-29). Lien Google Maps au geste du chauffeur (`driver.tsx`, ouverture d’URL). Aucune clé de cartes dans le client (`.env.example` 31-34). | Ne pas ajouter de fournisseur de cartes ni de clé. | Pas d’itinéraire routier, pas d’ETA réel, pas de tuile. Le lien Google envoie la destination seulement si l’utilisateur le demande. | 4, pas fait | P2 |
| Bascule future | `proveSnapshot` (`store.ts` 393-402) relit une copie sans écrire la clé active. Aucune méthode `cutover`. | Volontaire. Une bascule devra être un autre changement, avec décision humaine, hash, et retour arrière. | On ne « répare » pas un ancien fichier en le remplaçant. | 3, reporté | P1 |
| « Repartir de zéro » | `startFresh` (`store.ts` 340-365) remplace encore la clé active par un profil vide, après égalité de la copie et preuve isolée, et après confirmation dans `BootGate`. | Gardé : c’est l’échappatoire déjà présente, maintenant mieux gardée. Ce n’est pas une restauration. | L’original incompatible est remplacé seulement si la personne confirme. La copie `.incompatible-` ou `.corrupt-` reste. | 2, gardé | P1 |
| PR UX ouverte | PR 3, branche `ux/passe-plaisir-2026-11-04`, non mergée. | Cette branche ne l’a pas modifiée. | Conflits possibles, détaillés plus bas. | 1 | P1 au moment du merge |

## Cinq sujets pour la semaine

1. Faire relire `63bbbfb` et ne le merger qu’avec l’accord de Mohamed, après résolution des chevauchements avec la PR 3. Ne pas pusher `main` pour « voir ».
2. Réécrire les phrases publiques (accueil, brouillon App Store, page confidentialité statique) pour qu’elles disent « prototype sur l’appareil », sans Genève ni Lausanne comme service ouvert, tant qu’une autorisation n’est pas dans le dossier.
3. Laisser `geneve: true` au backlog (`src/state.ts` ligne 236). Ne pas le corriger dans un passage qui touche au texte de confidentialité. Une future modification devra préserver une valeur `false` déjà stockée, avec les mêmes preuves de copie que la préservation.
4. Prévoir le chiffrement au repos comme une migration séparée : copie brute, hash, essai sur une clé isolée, retour arrière, et seulement ensuite la bascule. Pas dans la foulée de ce correctif.
5. Écrire le plan de bascule de schéma (v1 vers une v2) : qui décide, quels comptes de courses et d’identifiants doivent coïncider, quel hash annule l’opération. `proveSnapshot` ne fait pas cette bascule.

## Cinq consignes détaillées (pour un prochain passage)

1. **Texte produit, sans toucher au stockage.** Partir de `main` plus le correctif de préservation s’il est mergé. Remplacer uniquement les phrases qui promettent un chauffeur, un règlement ou une ville ouverte : `src/app/welcome.tsx` ligne 55, `store/ios-metadata.md` lignes 25-40, et le titre du README. Écrire « prototype local, aucune course réelle, aucune autorisation affichée ». Ne pas ajouter Lausanne comme ville desservie. Ne pas modifier `reviveAppState`, `store.ts`, ni la clé. Tests : les 17 tests existants restent verts ; ajouter un test de fichier qui échoue si `welcome.tsx` contient « premium à Genève ». Pas de build, pas de store.

2. **Coordonnées : fait dans `35860af`.** La phrase unique est `LOCAL_COORDINATE_RETENTION`. Elle est affichée dans le tableau et le résumé, et recopiée dans la page statique et le brouillon store. Le test `scripts/location-retention.test.ts` échoue si le texte redevient « non conservée ensuite », ou si `46.519653` / `6.632273` changent après reprise et déconnexion. Ne pas effacer ces nombres pour faire coller un ancien texte. `EXPO_PUBLIC_LOCATION_RETENTION_DAYS` reste un libellé tant qu’il vaut `YOUR_LOCATION_RETENTION_DAYS`.

3. **Ralentir le simulateur sans perdre le journal.** Dans `src/lib/simulator.ts`, ne plus écrire la progression à chaque pas de 700 ms. Écrire au plus un changement d’état (acceptée, arrivée, démarrée, terminée). Les entrées de `journal` déjà présentes gardent leur `id` et leur `label`. Test : après une avance simulée, le nombre d’écritures `setItem` de la clé vive est borné, et `evt_historique_1` est inchangé. Pas de nouveau suivi GPS.

4. **Plan de bascule, code interdit.** Rédiger `docs/bascule-schema.md` : conditions chiffrées (nombre de courses, liste triée des `id`, SHA-256 du brut), clé isolée, interdiction d’appeler `setItem` sur `onyx-transit@v1` dans ce document. Aucune fonction `cutover` dans `store.ts`. Test négatif : `proveSnapshot` laisse la clé vive byte à byte identique, comme le test déjà présent dans `scripts/store-persist.test.ts`.

5. **Conflit avec la PR 3, sans prendre sa branche.** Rebaser seulement `cursor/preservation-fondation-fde0` si Mohamed le demande. Conserver `applyProfile` et `applySignOut` dans `account.tsx`, et le script `npm test` qui lance `preserve-state.test.ts`. Reprendre le bloc Vibrations de la PR 3 tel quel s’il faut fusionner les deux fichiers. Ne pas pusher `ux/passe-plaisir-2026-11-04`. Relancer `npm test`, `npm run typecheck`, `npm run check`.

## Objectifs mesurables

Ces chiffres viennent des tests lancés dans cette session. Ce ne sont pas des indicateurs d’usage, et il n’y a pas de « taux de perte » antérieur à citer.

- `npm test` : 20 tests, 20 réussites, 0 échec, Node v22.23.4, durée environ 2,5 s. Les 17 tests de préservation sont toujours là. Trois tests s’y ajoutent (texte, coordonnées `46.519653` / `6.632273` et `46.5074` / `6.628`, absence d’envoi des courses). Commande : `node --experimental-strip-types --import ./scripts/register-alias.mjs --test scripts/store-persist.test.ts scripts/preserve-state.test.ts scripts/location-retention.test.ts scripts/app-config.test.ts`.
- `npm run typecheck` : `tsc --noEmit` puis `tsc --noEmit -p tsconfig.scripts.json`, code de sortie 0.
- `npm run check` : « Passe 1 checks OK (11 contrastes, dispatch, documents, identifiants). »
- Document ancien de test : identifiants `ride_lausanne_1` et `ride_demo_2` tous les deux présents après déconnexion ; `quai` « 4 » ; `customerRef` `cli-9` ; facture `inv-1` ; note ; import `imp-1` ; client `c-9` ; journal `evt_historique_1` avec `source` `import` ; plaque `VD 1`.
- Deux documents incompatibles (courses en objet ; courses en chaîne et profil en chaîne) : statut `incompatible`, clé vive inchangée après `applySignOut`, empreinte de la copie égale à `sha256Text` du brut, clé `restore-isolated` absente.
- Identifiant numérique `12` et `priceMaximum` texte : statut `incompatible`, brut inchangé.
- `setItem` qui rejette : santé `failed`, brut identique à celui d’avant l’écriture, 2 courses et 1 ligne de journal encore dans ce brut.
- `proveSnapshot` après suppression : même empreinte, clé vive toujours absente (pas de bascule).
- Objectif non atteint, et non promis : le même hash lu sur un iPhone, un iPad ou un Chrome réel, avant et après mise à jour de l’app. Les tests utilisent une `Map` en mémoire (`scripts/preserve-state.test.ts` et `scripts/store-persist.test.ts`). Ils ne copient pas le téléphone.

## Douze axes

### 1. Vision

Observé dans le code : un prototype d’interface de réservation, d’espace chauffeur et d’admin, sur un seul appareil, données locales, prix de simulation (distance × 1,3), trois catégories Business, First, Van VIP (`src/lib/pricing.ts` 5-9). Le README (ligne 1 sur `550bf67`) dit « chauffeur privé premium (Genève) ».

La demande utilisateur dit VTC Lausanne. Le dépôt ne contient pas cette ville. Vision honnête pour la suite : un brouillon d’interface, pas une entreprise de transport ouverte.

Non testé sur appareil. Aucune preuve Supabase : `backendReady` est faux tant que les variables valent `YOUR_SUPABASE_URL` et `YOUR_SUPABASE_ANON_KEY` (`src/config.ts` 11-12 et 62). Aucun `createClient` dans le dépôt.

### 2. Concurrents nommés

Le dépôt n’en cite aucun. Pour situer le prototype, des produits que des clients comparent souvent à un VTC ou à un taxi en Suisse romande : Uber, Bolt, Free Now, Blacklane, Allocab, et les centrales de taxis communales (à Lausanne, l’activité taxi est communale ; le VTC, dans les textes vaudois, est cantonal). Leur présence exacte à Lausanne ou à Genève le 7 novembre 2026 n’a pas été revérifiée dans cette session. Ce ne sont pas des partenaires, et le prototype n’offre pas leur dispatch, leur paiement ni leur carte.

### 3. Sources et fonctions réellement dans le dépôt

Fonctions observées : profil local, consentements, liste fermée de lieux genevois, position avant-plan si consentement, prix plafond local, carte SVG, statuts de course, reçu texte, notation, litige local, espace chauffeur avec documents en statut (aucun fichier envoyé), admin avec totaux calculés sur les courses locales, export CSV, journal ajouté en fin de liste, villes Paris et Casablanca derrière des drapeaux faux par défaut (`src/config.ts` 68-71).

Fonctions absentes : géocodage, tuiles, compte serveur, paiement encaissé, Twint (drapeau faux), dispatch multi-appareils, pièces jointes de documents, facture QR (le README et `config.ts` 55 disent que l’IBAN n’est pas utilisé).

### 4. UX — iPad, iOS, web, RTL, accessibilité, aînés

Observé : `supportsTablet: true` (`app.json` 17), orientation portrait, thème sombre seul (`app.json` 9), `lang: fr` pour le web (`app.json` 88), cases à cocher avec `accessibilityRole` sur l’accueil (`welcome.tsx` 13-16), contraste de 11 paires vérifié par `scripts/check-passe1.ts` (le script a répondu OK). Plusieurs cibles font 44 pt (accueil, boutons du kit). Pas de `I18nManager`, pas de `direction: rtl`, pas de seconde langue dans les écrans. Le français est la seule interface.

La PR 3 (non mergée) ajoute du texte dynamique, des cibles et un réglage de vibrations. Ce n’est pas dans `550bf67` ni dans ce correctif, sauf le chevauchement de fichiers signalé plus bas.

Non testé : aucun iPad, iPhone, VoiceOver, TalkBack, ni fenêtre de navigateur dans cette session. Le bon rendu pour un aîné (taille, contraste réel, geste de suppression) reste à voir sur l’appareil.

### 5. Architecture, hors ligne, CI, performance, batterie

Observé : Expo SDK 58 (`package.json`), routeur de fichiers, store maison (`src/kit/store.ts`), AsyncStorage. Le README décrit un service worker produit par `scripts/pwa.mjs` au build web. Ce build n’a pas été relancé ici. Le workflow `.github/workflows/pages.yml` ne part que sur un push `main` ou un lancement manuel : typecheck, check, test, export web, déploiement Pages. Cette branche ne l’a pas déclenché.

Hors ligne : la lecture locale ne dépend pas du réseau. « Continuer hors ligne » n’écrit pas tant que la lecture n’a pas réussi (commentaire et code de `store.ts`, déjà vrais sur `550bf67`, conservés). Le bandeau réseau est dans `src/kit/net.tsx`.

Performance et batterie : non mesurées. Le point de code le plus bruyant est le simulateur à 700 ms. Aucun chiffre de trame ni de milliampère n’a été produit.

### 6. Sécurité, nLPD, RGPD, localisation, conservation

Observé : données sur l’appareil seulement, tant que personne n’ajoute un backend. Rôle client, chauffeur et admin basculable dans le même stockage (`account.tsx` 31-39) : ce n’est pas un contrôle d’accès. Pas de clé secrète Stripe ni de clé de cartes dans les fichiers lus ; les exemples sont des `YOUR_…` (`.env.example`). Le seul `fetch(` sous `src/` est `src/kit/crash.ts`, et seulement si le DSN Sentry est une URL réelle ; le corps ne contient ni course ni coordonnée. Aucun `createClient` Supabase. Sentry ne part pas si le DSN est le placeholder (`src/kit/crash.ts` 4-5). Localisation : permission « pendant l’utilisation », précision `Balanced`, arrière-plan iOS et Android désactivés (`app.json` 91-100, `PlacePicker.tsx` 35-38). Pas d’historique de trace séparé : une position choisie, ou un lieu de la liste, devient le point de la course et y reste, latitude et longitude comprises. Le bouton Naviguer peut ouvrir Google Maps si la personne le demande (`public/privacy/index.html`, section 4) : ce n’est pas un serveur de l’application.

Textes légaux dans l’app : ils se disent « à valider » (`welcome.tsx` 77, `privacy.tsx` 28). La page statique `public/privacy/index.html` dit que l’éditeur ne collecte pas de données sur ses serveurs, et décrit le stockage local. Utile, pas suffisant comme registre nLPD.

Conservation affichée après `35860af` : les coordonnées de départ et d’arrivée restent dans l’historique local jusqu’à la suppression de ces données, et cette version ne les envoie à aucun serveur de l’application (`src/lib/location-copy.ts`). Les autres durées (pièces, avis, marketing, documents) restent des phrases d’interface, avec le bandeau « Texte à valider ». Elles ne sont pas appliquées par un effacement automatique. Ce texte n’est pas une décision juridique ni une autorisation de transport. L’écran le dit.

### 7. Linguistique

Interface en français, vouvoiement mélangé au tutoiement selon les écrans (à relire plus tard, hors de ce correctif). « VTC » est le mot des textes genevois et vaudois cités plus bas ; le code l’accole à Genève (`state.ts` 88) alors que la demande parle de Lausanne. « Chauffeur privé » n’est pas, à lui seul, le titre d’une autorisation dans les pages officielles consultées. Les placeholders `YOUR_…` sont visibles : c’est préférable à une raison sociale inventée. Pas de copie arabe ni de mise en page RTL.

### 8. Pédagogie

Sans objet. Aucun parcours d’apprentissage, aucune leçon, aucun quiz. Ne pas en ajouter pour « remplir » un axe.

### 9. Usage de l’IA, coût, gardes

Observé : `EXPO_PUBLIC_FEATURE_AI_DISPATCH` n’est vrai que si la variable vaut exactement `true` (`.env.example` 29, défaut faux). L’interrupteur admin est désactivé et sa valeur est forcée à `false` (`admin.tsx`, section « Expérimental »). Aucun appel à un modèle, donc aucun jeton et aucun coût dans ce dépôt. Garde à tenir : un futur essai ne doit pas attribuer une course, ne doit pas lire l’historique des adresses pour entraîner un modèle, et doit avoir un plafond de dépense écrit avant la première requête. Ce correctif n’ajoute pas d’IA.

### 10. Pas de faux dispatch, pas de store, pas de service physique, pas de permissions de paiement

Observé et à maintenir : les courses simulées portent `simulated: true` et un bandeau (`index.tsx` 28-29). Une course non simulée attend l’onglet Chauffeur du même appareil (`index.tsx` 30-31). Les documents « validés » sont `validated_demo` (`state.ts`, statut, et `admin.tsx`). Les paiements autres que « simulé » restent « non configuré » tant que les clés le sont (`payments.tsx`). Aucune permission de paiement n’a été ajoutée. Aucune soumission App Store ni Play. Le brouillon `store/ios-metadata.md` décrit encore un service genevois : ne pas le coller dans App Store Connect en l’état. Les numéros 117, 144 et 112 sont ceux écrits dans `support.tsx` 23 ; le bouton ouvre `tel:112`. Ce n’est pas un service d’urgence interne à l’app.

### 11. Croissance, indicateurs, éthique

Observé : l’admin calcule des totaux sur les courses de l’appareil et le dit (`admin.tsx`, bandeau « Aucun indicateur n’est inventé »). Les courses `demo` et `simulated` sont comptées à part dans ce même écran. Il n’y a pas de chiffre d’affaires réel. Éthique : ne pas publier ces totaux comme des courses effectuées. Objectif mesurable pour plus tard : chaque nombre montré à l’écran est calculable à partir du document local, et toute course `simulated` ou `demo` garde son étiquette. Pas d’objectif de croissance chiffré ici : il n’y a pas d’usage à mesurer.

### 12. Synergies, sans profilage croisé

Une charte ou des composants partagés avec d’autres prototypes sont possibles. Relier les clients, les adresses, les plaques ou les positions de cette app à une autre app serait un profilage. La nLPD définit le profilage, y compris à partir de la localisation (fiche Fedlex citée plus bas). Ce dépôt n’a pas de tel lien. Ne pas en créer « pour la synergie ».

## Observé, non testé sur appareil, sans preuve Supabase

| Sujet | Observé dans le code (`550bf67`, et `63bbbfb` pour la préservation) | Appareil | Supabase |
|---|---|---|---|
| Clé `onyx-transit@v1`, reprise, copie, suppression | Oui, fichiers et tests cités | Non | Non : pas de client, pas de projet, pas de ligne SQL |
| Lieux et carte | Oui, Genève, SVG, haversine | Non | Non |
| GPS avant-plan | Oui, `expo-location`, consentement | Non | Non |
| Paiement, Sentry, cartes | Placeholders `YOUR_…` seulement | Non | Non |
| Pages GitHub | Workflow présent ; non relancé | Non | Non |
| Autorisation VTC | Absente du dépôt | Non | Non |

## Sources officielles consultées

Consultation du 7 novembre 2026. Lecture de pages publiques. Cela ne dit pas que le prototype est conforme, ni qu’une autorisation serait accordée, ni que Mohamed ou quiconque est autorisé à transporter des personnes.

Vaud (le cadre qui correspond à une activité à Lausanne, si elle existait) :

- État de Vaud, « Informations relatives au transport de personnes à titre professionnel (taxis, VTC) » : https://www.vd.ch/economie/police-cantonale-du-commerce/transport-de-personnes-a-titre-professionnel-renouvellement-des-autorisations  
  La page décrit, depuis le 1er janvier 2020, une autorisation cantonale pour le chauffeur, pour l’entreprise, et pour le diffuseur de courses. Elle distingue le taxi (autorisation communale d’usage accru du domaine public en plus) et le VTC (autorisation cantonale d’entreprise, sans cet usage accru). Autorité nommée sur la page : Police cantonale du commerce.
- Règlement vaudois 740.25 sur le transport de personnes à titre professionnel (RTTP), du 11 décembre 2019, page LexFind consultée avec mention d’entrée en vigueur au 1er janvier 2025 pour la version affichée : https://www.lexfind.ch/tolv/249857/fr  
  L’article 2 vise des véhicules jusqu’à neuf personnes, conducteur compris, et renvoie à l’ordonnance fédérale sur le transport de voyageurs (OTV, RS 745.11). L’article 6 exige une autorisation de chauffeur. L’article 7 cite le permis avec le code 121 (OAC, RS 741.51) et une formation. L’article 13 réserve l’activité d’entreprise et de diffuseur aux titulaires d’une autorisation cantonale.
- Cette session n’a pas ouvert un règlement communal de la Ville de Lausanne. Le site vaudois dit que le taxi communal reste à part. Ne pas conclure pour Lausanne au-delà de cette phrase.

Genève (ce que le code met en scène, pas ce que la demande décrit) :

- Loi sur les taxis et les voitures de transport avec chauffeur (LTVTC), RS/GE H 1 31, du 28 janvier 2022, entrée en vigueur indiquée au 1er novembre 2022 : https://silgeneve.ch/legis/data/rsg_h1_31.htm (page : dernières modifications au 22 novembre 2025). L’article 6 soumet chauffeur de taxi, chauffeur de VTC, entreprise de transport et entreprise de diffusion à autorisation préalable. L’article 5 définit le VTC comme une course sur commande ou réservation, sans usage accru du domaine public et sans le mot « Taxi ».
- Page cantonale « Pratiquer le transport de personnes en taxi ou VTC », mise à jour indiquée au 6 octobre 2026 : https://www.ge.ch/pratiquer-transport-personnes-taxi-vtc
- Règlement d’exécution RTVTC, RS/GE H 1 31.01 : https://silgeneve.ch/legis/data/rsg_h1_31p01.htm

Le code exige une « Carte professionnelle VTC (Genève) » (`state.ts` 88) et un permis B121 (`state.ts` 87). Ce sont des libellés d’écran, statut `missing` / `uploaded_placeholder` / `validated_demo`. Aucun document n’est vérifié auprès d’un canton.

Protection des données :

- Loi fédérale du 25 septembre 2020 sur la protection des données (LPD, RS 235.1), fiche Fedlex : https://www.fedlex.admin.ch/eli/cc/2022/491/fr — la fiche consultée indique une entrée en vigueur au 31 août 2023. La définition du profilage sur cette fiche inclut la localisation et les déplacements.
- PFPDT, « Moyens techniques de surveillance sur le lieu de travail » : https://www.edoeb.admin.ch/fr/moyens-techniques-de-surveillance-sur-le-lieu-de-travail — utile si un jour l’app suivait des chauffeurs. Aujourd’hui elle ne trace pas un véhicule en arrière-plan. Ce n’est pas une analyse d’impact.

Le RGPD est mentionné dans l’interface pour d’éventuels clients de l’UE (`privacy.tsx` 28). Aucun registre, aucun représentant UE, aucun sous-traitant réel n’est dans le dépôt. Les dix ans affichés pour les pièces ne sont pas vérifiés ici contre le Code des obligations ; ne pas les prendre pour un conseil comptable.

Urgences : le code affiche 117, 144 et 112 (`support.tsx` 23). Cette session n’a pas rouvert une page fédérale pour ces trois numéros. Les afficher dans un prototype n’est pas un dispositif de sécurité testé.

## Correctif : fichiers, comportement, tests

Fichiers du commit `63bbbfb` :

- `src/kit/store.ts` — preuve isolée, état incompatible, suppression gardée, export brut, santé d’écriture, `proveSnapshot` sans écriture de la clé active.
- `src/state.ts` — `preservationIssues`, `reviveAppState`, `applySignOut`, `applyProfile`, `applySignIn`.
- `src/kit/ui.tsx` — écran « État incompatible » avec raisons, octets, comptes et empreinte (`ui.tsx` 702 et suivantes).
- `src/app/privacy.tsx` — export brut et suppression après copie.
- `src/app/welcome.tsx`, `src/app/(tabs)/account.tsx` — fusion au lieu de remplacement.
- `src/components/LostRideNotice.tsx` — bandeau si l’écriture est refusée.
- `scripts/preserve-state.test.ts`, `scripts/store-persist.test.ts`, `scripts/register-alias.mjs`, `scripts/alias-hook.mjs`, `package.json` (script `test`).

Fichiers du suivi `35860af` :

- `src/lib/location-copy.ts` — phrase unique de conservation.
- `src/app/privacy.tsx` — tableau et résumé. Les coordonnées ne sont pas lues pour être effacées.
- `public/privacy/index.html` — même phrase, page statique.
- `store/ios-metadata.md` — le brouillon répète la même phrase. Le reste du brouillon, qui parle encore d’un service genevois, n’est pas une publication et n’a pas été réécrit ici.
- `scripts/location-retention.test.ts` — régression de texte, de coordonnées, et d’absence d’envoi.
- `package.json` — le script `test` lance aussi ce fichier.

`src/state.ts` n’est pas dans ce suivi. `geneve: true` reste à la ligne 236.

Ce que les tests couvrent : ancien document compatible ; champs inconnus ; course de test conservée à côté d’une course ordinaire ; forme future ; forme étrangère ; identifiant non textuel ; prix maximum non numérique ; écriture refusée ; déconnexion ; profil ; connexion ; copie de suppression ; `proveSnapshot` qui ne recrée pas la clé vive ; JSON cassé ; `null` ; `42` ; `[1]` ; lecture en échec ; course saisie pendant la lecture ; phrase de conservation identique dans l’écran, la page et le brouillon ; latitude `46.519653` et longitude `6.632273` inchangées après déconnexion ; seul `fetch(` de `src/` dans `crash.ts`, sans course.

Ce que les tests ne couvrent pas : AsyncStorage réel, `localStorage` d’un navigateur, processus tué au milieu d’un `setItem`, disque plein, sauvegarde iCloud, désinstallation, ni la PR 3 compilée avec ce diff.

Limites explicites :

- Zéro perte n’est pas promis. Un appareil peut perdre son stockage sans que ces tests le voient.
- La copie `.deleted-`, `.corrupt-` ou `.incompatible-` reste dans le même stockage local. Ce n’est pas une sauvegarde du téléphone, ni un export hors de l’appareil, sauf si la personne partage elle-même le fichier.
- Sur mobile, l’export passe par la feuille de partage du système (`src/kit/files.ts`). Rien n’est envoyé tant qu’elle ne choisit pas une cible. Si elle choisit une app, le fichier quitte l’appareil : c’est son geste, pas un envoi caché.
- `crypto.subtle` est requis pour déclarer une empreinte (`store.ts`, `sha256Text`). Sous Node v22.23.4 il est là. S’il manque, la copie n’est pas déclarée vérifiée et la suppression ou le remplacement n’avancent pas.
- `startFresh` peut encore remplacer la clé active par un profil vide, uniquement après confirmation et preuve. Ce n’est pas un retour arrière : rien ne remet la copie sur la clé active.
- Une prochaine version qui voudra lire un schéma différent devra refuser la bascule tant que les comptes (nombre de courses, identifiants) et le hash ne correspondent pas à la copie. Ce code ne fait pas cette bascule.
- `geneve: true` forcé reste au backlog (`src/state.ts` ligne 236). Le suivi des coordonnées ne le modifie pas.
- Les coordonnées des courses déjà enregistrées ne sont pas réécrites pour coller à un ancien texte. Le texte a été changé pour coller aux coordonnées qui restent.
- Aucune donnée de production n’a été lue. Les jeux de tests sont des objets construits dans `scripts/preserve-state.test.ts`.

## Autres pull requests

- PR 1, mergée, `cursor/passe-1-fondations-e2ab` : fondations, dont le JSON illisible. Ce correctif ne la refait pas ; il ferme le trou des objets incompatibles.
- PR 2, mergée, `cursor/pages-node-22-e2ab` : Node 22 pour la CI Pages. Non modifiée.
- PR 3, ouverte : https://github.com/mohamadalhabib92/onyx-transit/pull/3 — branche `ux/passe-plaisir-2026-11-04`. Cette session ne l’a pas poussée ni modifiée.

Chevauchements possibles au merge de la PR 3 avec cette branche :

- `package.json` : ici le script `test` ; là une dépendance `expo-haptics`.
- `src/app/(tabs)/account.tsx` : ici l’import et les appels `applyProfile` / `applySignOut` ; là l’import et une section Vibrations.
- `src/kit/ui.tsx` : ici `BootGate` (état incompatible) ; là les boutons, toasts et listes, hunks qui s’arrêtent avant `BootGate`. Un merge peut quand même demander une relecture du fichier.

Pas de chevauchement attendu sur `src/kit/store.ts`, `src/state.ts`, `src/app/privacy.tsx`, `src/app/welcome.tsx`, `src/components/LostRideNotice.tsx`, ni les nouveaux scripts.

## Commandes réellement lancées

```text
npm ci
npm test
npm run typecheck
npm run check
```

Résultats de la dernière passe, après `35860af` : tests 20/20 (les 17 de préservation plus 3 sur le texte, les coordonnées et l’absence d’envoi) ; typecheck code 0 ; check « Passe 1 checks OK (11 contrastes, dispatch, documents, identifiants). »

Non lancés, volontairement : `npm run build:web`, `npx expo start`, EAS, déploiement Pages, tout appel Supabase, Stripe, Sentry ou cartes.
