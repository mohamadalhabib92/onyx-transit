# Onyx Transit — fiche App Store (brouillon)

> Brouillon à recopier dans App Store Connect. Rien n'a été soumis.

| Champ | Valeur |
|---|---|
| Nom (≤ 30) | Onyx Transit – Chauffeur privé (30 car.) |
| Sous-titre (≤ 30) | Chauffeur privé à Genève (24 car.) |
| Bundle ID | `com.vibecode.onyxtransit-mvty5t` |
| SKU proposé | `onyx-transit-ios-001` |
| Projet EAS | `bbb2faed-fd86-4567-b84c-26c32bfea811` (compte habib548) |
| Version / build | 1.0.0 / numéro de build géré par EAS (remote, autoIncrement) |
| Langue principale | Français |
| Catégorie principale | Voyages (Travel) |
| Catégorie secondaire | Navigation |
| Prix | Gratuit |
| URL de confidentialité | https://mohamadalhabib92.github.io/onyx-transit/privacy/ |
| URL d'assistance | https://mohamadalhabib92.github.io/onyx-transit/support/ |
| URL marketing | https://mohamadalhabib92.github.io/onyx-transit/ |
| Copyright | 2026 Mohamed El Habib Ba |
| Appareils | iPhone + iPad (supportsTablet) |
| Chiffrement | Aucun chiffrement non exempté (ITSAppUsesNonExemptEncryption = false) |

## Texte promotionnel (≤ 170)
Réservez un chauffeur privé premium à Genève : Business, First ou Van VIP, prix estimé à l'avance.

## Mots-clés (≤ 100, séparés par des virgules)
`chauffeur,VTC,limousine,Genève,aéroport,transfert,taxi,business,van,course,premium` (82 car.)

## Description — FR
Onyx Transit, le chauffeur privé premium à Genève.

• Départ et destination : lieux de Genève (aéroport, gare Cornavin, Palais des Nations…) ou votre position.
• Estimation du prix pour 3 catégories : Business, First, Van VIP.
• Suivi de la course étape par étape, reçu détaillé, notation, réclamation.
• Espace chauffeur et espace administration.
• Vos consentements (CGU, confidentialité, localisation, marketing) sont gérés dans l'app et révocables.

## Description — EN
Onyx Transit is a premium private-driver service in Geneva: choose a Geneva landmark or your location, get a price estimate for Business, First or VIP Van, follow your ride step by step, get a detailed receipt and rate your driver. Includes driver and admin areas and revocable consent settings.

## Classification par âge
4+ — réponses au questionnaire : aucune violence, aucun contenu sexuel, pas de jeux d'argent, pas de navigation web non filtrée, pas de contenu médical, pas de messagerie entre utilisateurs.

## Confidentialité de l'app (étiquettes « nutrition »)
- **Collecte de données : « Nous ne collectons pas de données »** (Data Not Collected). Tout est stocké uniquement sur l'appareil et n'est transmis ni à l'éditeur ni à des tiers (au sens d'Apple, il n'y a donc pas de « collecte »).
- Suivi (tracking) : Non. Pas d'identifiant publicitaire.
- À revoir si un backend (Supabase, Stripe, API) est activé dans une version future.

Données stockées localement (pour information) :
- Votre profil local (nom, téléphone et société si vous les saisissez) et vos consentements ;
- Vos trajets : lieux de départ et d'arrivée, statut, prix estimé, reçus, notes et réclamations ;
- Votre position, uniquement si vous choisissez « Ma position » comme lieu de prise en charge.

Autorisations :
- Localisation « pendant l'utilisation » : facultative, pour pré-remplir le lieu de prise en charge. Jamais en arrière-plan.

## Notes pour l'équipe de révision (App Review)
VERSION DE DÉMONSTRATION. Aucun compte requis : créez un profil local au premier lancement. Les tarifs sont indicatifs et étiquetés « démo » ; le paiement est « Paiement simulé (démo) », aucune carte n'est demandée ; le suivi du chauffeur est simulé et indiqué comme tel. L'espace chauffeur permet de piloter la course.

Contact révision : à compléter (prénom, nom, téléphone, e-mail de Mohamed). Compte de démonstration : non requis.

## Captures d'écran à fournir
- iPhone 6,9 pouces (1320 × 2868 ou 1290 × 2796) : 3 à 10 captures.
- iPad 13 pouces (2064 × 2752 ou 2048 × 2732) : 3 à 10 captures (obligatoire car l'app est disponible sur iPad).

## Risques de refus (App Review) et corrections
| Niveau | Risque | À faire avant soumission |
|---|---|---|
| Élevé | 2.1 App incomplète : courses, chauffeurs et paiements simulés. Une app de VTC doit réellement mettre en relation clients et chauffeurs. | Brancher un vrai backend de réservation et un paiement Stripe réel (service physique : Stripe autorisé, pas d'achat intégré) avant soumission. |
| Moyen | Licences : transport professionnel de personnes à Genève (LTVTC) ; Apple peut demander une preuve d'autorisation. | Préparer la preuve d'enregistrement de l'entreprise de transport. |
| Moyen | Espaces chauffeur et admin visibles par tous. | Les séparer (app chauffeur ou rôles authentifiés) dans la version App Store. |
