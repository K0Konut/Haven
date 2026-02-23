# Architecture SoftRide

Ce document decrit l'architecture technique actuelle du projet, en se basant sur le code de `src/`.

## 1. Vue d'ensemble
SoftRide est structure en couches:
- `features/`: composants UI orientes ecrans/metiers.
- `store/`: etat global (Zustand).
- `services/`: logique technique (API, geodesie, permissions, persistance, alertes).
- `app/`: routing global, layout et config d'environnement.

## 2. Routing et layout
- Point d'entree: `src/main.tsx`
- App Router: `src/App.tsx`
- Routes: `src/app/routes/index.tsx`
  - `/` -> `Home`
  - `/map` -> `MapScreen`
  - `/settings` -> `SettingsScreen`
- Layout global: `src/app/layout/AppShell.tsx`
  - bottom navigation fixe (Accueil, Carte, Reglages)
  - adaptation safe area mobile

## 3. Stores Zustand

### `location.slice.ts`
- Stocke:
  - `permission`
  - `fix` (lat/lng/accuracy/heading/speed/timestamp)
- Source des donnees: `services/permissions/location.ts`

### `routing.slice.ts`
- Gere:
  - etat calcul (`loading`, `error`)
  - requete courante
  - routes candidates
  - route selectionnee
- Anti-race condition: `activeRequestId` ignore les resultats obsoletes.

### `navigation.slice.ts`
- Gere:
  - etat navigation (`isNavigating`, `followUser`, `offRoute`)
  - progression sur polyline (`routeSegIndex`, `routeT`)
  - metriques live (distance restante, ETA, prochaine instruction)

### `fall.slice.ts`
- Gere:
  - activation detection chute
  - etat moteur (`idle`, `listening`, `possible`, `countdown`)
  - countdown et cooldown
  - configuration runtime (warmup/cooldown/min Hz)

## 4. Module carte et navigation
Fichiers principaux:
- `src/features/map/MapScreen.tsx`
- `src/features/map/MapView.tsx`
- `src/features/map/components/NavBanner.tsx`

Responsabilites:
- permissions geolocalisation + premier fix.
- recherche destination (Mapbox geocoding).
- calcul itineraire et selection route.
- suivi GPS live + snap a la route.
- detection off-route + reroutage.
- feedback utilisateur:
  - haptics,
  - notifications locales,
  - bannieres de reprise/reroute.

Camera map:
- mode preview: fit sur route selectionnee.
- mode navigation: follow user + bearing + pitch.
- desactivation automatique du follow au geste utilisateur.

## 5. Pipeline routing securise
Fichiers:
- `src/services/mapbox/directions.ts`
- `src/services/routing/scorer.ts`
- `src/services/routing/geo.ts`

Etapes:
1. Appel Mapbox Directions (alternatives + steps + annotations speed).
2. Transformation en `RouteCandidate`.
3. Calcul d'indicateurs:
   - nombre de manoeuvres "turn-like",
   - ratio de segments rapides.
4. Scoring (`0..100`) selon preferences:
   - rues calmes (`preferQuietStreets`)
   - tolerance detour (`preferBikeLanes`)
5. Tri descendant par `safetyScore`.

Geodesie:
- distance point-route (projection locale),
- distance restante sur polyline,
- haversine pour les longueurs.

## 6. Detection de chute
Fichiers:
- `src/features/fall/useFallDetection.ts`
- `src/features/fall/fallEngine.ts`
- `src/features/fall/FallDetectionPanel.tsx`
- `src/features/fall/FallDebugPanel.tsx`

Moteur `FallEngine`:
- signaux:
  - acceleration avec gravite,
  - rotation gyroscope.
- sequence de validation:
  - chute libre,
  - impact (acceleration + gyro),
  - immobilite post-impact.

Protections anti faux positifs:
- warmup au demarrage,
- cooldown apres alerte,
- garde-fou frequence echantillonnage minimale,
- filtre spikes gyroscope repetes.

UX de securite:
- modal countdown,
- action annuler,
- action envoyer immediatement.

## 7. Alertes d'urgence
Fichiers:
- `src/services/emergency/contact.ts`
- `src/services/emergency/email.ts`

Contact:
- persiste via Capacitor Preferences.
- modele actuel: `email` + `message`.

Envoi:
- EmailJS avec template params:
  - `to_email`
  - `message` (inclut lien Google Maps si position dispo).

Note:
- `src/services/emergency/sms.ts` et `src/services/emergency/alert.ts` sont legacy/deprecies.
- Le flux actif dans l'app passe par email.

## 8. Permissions et platforme
### Geoloc
`src/services/permissions/location.ts`:
- check/request permissions.
- `getCurrentPosition`.
- `watchPosition` + cleanup `clearWatch`.

### Motion
`src/services/permissions/motion.ts`:
- gere `DeviceMotionEvent.requestPermission()` (iOS),
- retourne `not-required` sur plateformes sans demande explicite.

## 9. Persistance navigation
Fichier: `src/services/navigation/persistence.ts`
- Sauvegarde/restauration destination en cours.
- TTL session: 45 minutes.
- Evite la reprise de session trop ancienne.

## 10. Points d'extension recommandes
- Ajouter un backend pour historiser trajets/statistiques.
- Ajouter tests unitaires (scoring, geodesie, fall engine).
- Supprimer/refactor legacy SMS pour reduire la dette technique.
- Ajouter validation stricte des variables d'environnement EmailJS.
