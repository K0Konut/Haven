# Haven (anciennement SoftRide)

Application de navigation velo cross-platform (web + mobile via Capacitor), avec:
- calcul d'itineraires securises (Mapbox Directions + scoring),
- guidage temps reel avec reroutage automatique,
- detection de chute basee capteurs (accelerometre/gyroscope),
- envoi d'alerte email au contact d'urgence (EmailJS).

Note nommage:
- Nom du repo/projet: `Haven`
- Identifiants techniques encore presents dans le code: `SoftRide` (ex: `package.json`, `capacitor.config.ts`, cles de persistance)

## Table des matieres
- [1. Stack technique](#1-stack-technique)
- [2. Prerequis](#2-prerequis)
- [3. Installation](#3-installation)
- [4. Variables d'environnement](#4-variables-denvironnement)
- [5. Commandes utiles](#5-commandes-utiles)
- [6. Lancer sur mobile (Capacitor)](#6-lancer-sur-mobile-capacitor)
- [7. Architecture rapide](#7-architecture-rapide)
- [8. Flux fonctionnels](#8-flux-fonctionnels)
- [9. Persistance locale](#9-persistance-locale)
- [10. Documentation detaillee](#10-documentation-detaillee)
- [11. Depannage rapide](#11-depannage-rapide)

## 1. Stack technique
- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Zustand (etat applicatif)
- Mapbox GL JS + APIs Directions/Geocoding
- Capacitor (Android, iOS)
- Plugins Capacitor: Geolocation, Motion, Haptics, Local Notifications, Preferences
- EmailJS pour les alertes email d'urgence

## 2. Prerequis
- Node.js 20+ (recommande)
- npm 10+ (ou equivalent adapte)
- Compte Mapbox (token API)
- Compte EmailJS (service/template/public key)
- Pour mobile:
  - Android Studio pour Android
  - Xcode pour iOS (macOS)

## 3. Installation
```bash
git clone <url-du-repo>
cd Haven
npm install
cp .env.example .env
```

Ensuite, complete les variables `.env` puis lance:
```bash
npm run dev
```

## 4. Variables d'environnement
Fichier: `.env`

```bash
VITE_MAPBOX_TOKEN=...
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ID=...
VITE_EMAILJS_PUBLIC_KEY=...
```

Details:
- `VITE_MAPBOX_TOKEN`: requis pour la carte, geocoding et directions.
- `VITE_EMAILJS_*`: requis pour l'envoi d'email d'urgence.

Si `VITE_MAPBOX_TOKEN` est absent, l'app leve une erreur au chargement de la carte.

## 5. Commandes utiles
```bash
npm run dev         # demarrage local
npm run build       # build production (tsc + vite)
npm run preview     # preview du build
npm run lint        # eslint
npm run typecheck   # verification TypeScript
```

## 6. Lancer sur mobile (Capacitor)
```bash
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

Config Capacitor: `capacitor.config.ts`
- `appId`: `com.softride.app`
- `appName`: `SoftRide`
- `webDir`: `dist`

Ces identifiants sont historiques et n'empechent pas l'utilisation du projet sous le nom `Haven`.

## 7. Architecture rapide
```text
src/
  app/
    config/           # env + config EmailJS
    layout/           # shell + navigation basse
    routes/           # routing React Router (hash router)
  features/
    map/              # ecran carte/navigation + composants UI
    fall/             # detection de chute + debug/calibration
    settings/         # reglages (contact urgence, capteurs)
  services/
    mapbox/           # directions + geocoding + client HTTP
    routing/          # geodesie, scoring, formatage
    permissions/      # geoloc + motion permissions
    emergency/        # contact + email + legacy SMS (deprecie)
    navigation/       # persistance session de nav
  store/
    *.slice.ts        # stores Zustand (location/routing/nav/fall)
```

## 8. Flux fonctionnels
### Calcul d'itineraire
1. L'utilisateur choisit une destination (geocoding Mapbox).
2. `routing.calculate()` appelle `getSecureRoute()`.
3. Les routes candidates sont scorees (`scoreCandidates`) et triees.
4. La meilleure route est selectionnee, les autres restent en alternatives visuelles.

### Navigation temps reel
1. `watchPosition()` ecoute les fixes GPS.
2. Le fix est "snappe" sur la polyline (`distanceToRouteMeters`).
3. L'app met a jour:
   - distance restante,
   - ETA,
   - prochaine instruction,
   - etat off-route.
4. Si off-route stable + GPS suffisamment bon, reroute automatique.
5. Session de navigation sauvegardee/restauree automatiquement (TTL 45 min).

### Detection de chute
1. Lecture des capteurs via `@capacitor/motion`.
2. `FallEngine` detecte:
   - chute libre,
   - impact,
   - immobilite post-impact.
3. En cas de confirmation:
   - countdown utilisateur (annuler ou envoyer immediatement),
   - envoi email au contact d'urgence via EmailJS.

## 9. Persistance locale
- Contact d'urgence:
  - stockage via Capacitor Preferences
  - cle: `softride.emergencyContact.v2`
- Session navigation:
  - stockage localStorage
  - cle: `softride_nav_session_v1`
  - expiration: 45 minutes

## 10. Documentation detaillee
- `docs/ARCHITECTURE.md`
  - details par module/store/service
  - logique de scoring d'itineraires
  - fonctionnement du moteur de chute
  - recommandations d'extension
- `docs/GLOSSARY.md`
  - definitions des concepts cles (ex: `RouteCandidate`, `safetyScore`, `FallEngine`)
- `CONTRIBUTING.md`
  - workflow de contribution (branches, commits, PR, checks avant merge)

## 11. Depannage rapide
- Carte non chargee:
  - verifier `VITE_MAPBOX_TOKEN` dans `.env`.
- Recherche d'adresse vide ou en erreur:
  - verifier connectivite + token Mapbox.
- Alerte email non envoyee:
  - verifier les 3 variables `VITE_EMAILJS_*`.
- Detection de chute inactive:
  - verifier permissions capteurs + contact d'urgence configure.
- GPS peu fiable:
  - l'app affiche une pastille qualite GPS, attendre une meilleure precision avant navigation.
