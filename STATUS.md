# État actuel du dépôt — SoftRide

> Synthèse technique de l'avancement du projet au 06/03/2026.

---

## 🗂️ Vue d'ensemble

**SoftRide** est une application de navigation vélo cross-platform (web + Android/iOS via Capacitor), construite avec :

| Outil | Rôle |
|---|---|
| React 19 + TypeScript | Interface utilisateur |
| Vite + Tailwind CSS v4 | Bundler & styles |
| Capacitor 7 | Bridge natif (GPS, haptique, notifications) |
| Mapbox GL JS v3 | Carte, routing, geocoding |
| Zustand | Gestion d'état global |
| EmailJS | Envoi d'e-mails d'urgence côté client |
| ESLint + GitHub Actions | Qualité de code & CI |

---

## ✅ Fonctionnalités implémentées

### 🗺️ Carte & Navigation (`src/features/map/`)
- **MapView** — rendu de la carte Mapbox, affichage de la position et de la route active.
- **Home** — écran d'accueil avec barre de recherche geocoding (départ/arrivée), sélection de la route, démarrage de la navigation.
- **MapScreen** — écran de navigation en temps réel : suivi du cycliste, recalcul si hors itinéraire, bannière d'instruction, pill de qualité GPS.
- **NavBanner** — bandeau d'instruction de navigation (prochaine manœuvre + distance).

### 🛡️ Détection de chute (`src/features/fall/`)
- **FallEngine** — machine à états (`IDLE → FREEFALL → IMPACT → STILLNESS_CHECK`) basée sur l'accéléromètre et le gyroscope.
- **useFallDetection** — hook React orchestrant le moteur, le compte à rebours et l'envoi d'alerte.
- **FallDetectionPanel** — panneau UI (activation, statut, compte à rebours annulable).
- **FallDebugPanel** — panneau de debug pour visualiser les données brutes du capteur en temps réel.

### 🚨 Système d'urgence (`src/services/emergency/`)
- **contact.ts** — sauvegarde/chargement/suppression du contact d'urgence (via `@capacitor/preferences`).
- **email.ts** — envoi d'e-mail d'alerte via EmailJS avec position GPS intégrée.
- **sms.ts** — ouverture d'une URL `sms:` pré-remplie (iOS & Android).
- **alert.ts** — orchestrateur : envoie l'e-mail et tente le SMS en parallèle.

### ⚙️ Paramètres (`src/features/settings/`)
- **SettingScreen** — configuration du contact d'urgence (email + message), test d'envoi, panneau de détection de chute.

### 📦 Stores Zustand (`src/store/`)
| Slice | Responsabilité |
|---|---|
| `index.ts` | État global de l'app (`isReady`) |
| `location.slice.ts` | Permission GPS + dernière position (`LocationFix`) |
| `navigation.slice.ts` | État de navigation (en cours, suivi, hors-route, métriques en temps réel, étape courante) |
| `routing.slice.ts` | Calcul de route (requête, candidats, sélection, anti-race-condition) |
| `fall.slice.ts` | État de détection de chute (activé, statut, compte à rebours, config tuneable) |

### 🔧 Services (`src/services/`)
| Service | Description |
|---|---|
| `mapbox/client.ts` | Initialisation du token Mapbox |
| `mapbox/directions.ts` | Requêtes Directions API + scoring des variantes |
| `mapbox/geocoding.ts` | Recherche d'adresses (forward geocoding) |
| `mapbox/http.ts` | Utilitaire fetch bas niveau avec gestion d'erreurs |
| `routing/geo.ts` | Fonctions géospatiales : haversine, projection locale, distance point-segment, snap sur polyline, ETA |
| `routing/scorer.ts` | Scoring de sécurité des candidats (virages, vitesse, distance, préférences) |
| `routing/format.ts` | Formatage des instructions (distance, durée, étapes) |
| `navigation/persistence.ts` | Sauvegarde/restauration de la session de navigation |
| `permissions/location.ts` | Demande + surveillance de la permission GPS |
| `permissions/motion.ts` | Demande de la permission capteur de mouvement |
| `fall/fallService.ts` | Lancement de l'alerte d'urgence depuis la détection de chute |

### 🪝 Hooks natifs (`src/hooks/native/`)
- **useMotion** — abonnement aux événements `DeviceMotionEvent` / `@capacitor/motion` avec normalisation des unités.

---

## 🔄 Infrastructure & outillage

- **GitHub Actions** — workflows CI : lint (`eslint`), typecheck (`tsc --noEmit`), build (`vite build`).
- **Capacitor** — synchronisé pour Android (`android/`) ; iOS (`ios/`) présent.
- **`.env.example`** — variables d'environnement nécessaires : `VITE_MAPBOX_TOKEN`, `VITE_EMAILJS_*`.
- **Routing** — HashRouter (`createHashRouter`) pour compatibilité Capacitor.

---

## 🚧 Points à surveiller / pistes d'amélioration

- [ ] **Tests** — aucun test unitaire ou d'intégration n'est encore en place (ni Jest, ni Vitest).
- [ ] **Recalcul de route** — le déclenchement du recalcul hors-itinéraire est présent mais pourrait être mieux dé-bouncé côté UX.
- [ ] **Offline / cache** — pas de mise en cache des tuiles ou des routes pour une utilisation sans connexion.
- [ ] **iOS** — le projet Capacitor iOS est généré mais n'a pas encore été validé sur simulateur.
- [ ] **FallEngine** — les seuils (freefallG, impactG, etc.) sont codés en dur ; un calibrage par appareil serait utile.
- [ ] **SMS** — l'envoi par URL `sms:` ne garantit pas la livraison ; une API SMS serveur pourrait fiabiliser le système.
- [ ] **Notifications locales** — `@capacitor/local-notifications` est installé mais pas encore intégré au flow de détection de chute.
- [ ] **README** — la section *Testing* est vide ; à compléter une fois les tests ajoutés.

---

## 📁 Arborescence simplifiée

```
src/
├── App.tsx
├── app/
│   ├── config/          # emailjs.ts, env.ts
│   ├── layout/          # AppShell.tsx
│   └── routes/          # index.tsx (HashRouter)
├── features/
│   ├── fall/            # FallEngine, useFallDetection, panels UI
│   ├── map/             # Home, MapScreen, MapView, NavBanner
│   └── settings/        # SettingScreen
├── hooks/
│   └── native/          # useMotion
├── services/
│   ├── emergency/       # alert, contact, email, sms
│   ├── fall/            # fallService
│   ├── mapbox/          # client, directions, geocoding, http
│   ├── navigation/      # persistence
│   ├── permissions/     # location, motion
│   └── routing/         # format, geo, scorer
├── store/               # Zustand slices
├── styles/
└── types/               # routing.ts, device-motion.d.ts
```
