# Glossaire Haven

Ce glossaire explique les principaux termes metier/techniques utilises dans le code.

## RouteCandidate
Objet representant un itineraire candidat retourne par le pipeline routing.
Il contient la geometrie (`geometry`), les etapes de guidage (`steps`), un resume (`summary`) et un `safetyScore`.
Reference: `src/types/routing.ts`.

## RouteSummary
Resume quantitatif d'une route:
- `distanceMeters`, `durationSeconds`
- `stepCount`, `turnLikeCount`
- `highSpeedRatio` (proxy de segments moins calmes)
Reference: `src/types/routing.ts`.

## safetyScore
Score de securite entre `0` et `100` (plus haut = mieux) calcule par `scoreCandidates`.
Le score penalise principalement:
- nombre de virages manoeuvres (`turnLikeCount`)
- ratio de segments rapides (`highSpeedRatio`)
et tient aussi compte du temps/distance selon les preferences utilisateur.
Reference: `src/services/routing/scorer.ts`.

## scoreBreakdown
Details par composante du score (`time`, `distance`, `turns`, `calmness`) pour expliquer pourquoi une route est mieux classee.
Reference: `src/services/routing/scorer.ts`.

## RoutingPreference
Preferences utilisateur pour ponderer le scoring:
- `preferQuietStreets` (accent sur routes calmes)
- `preferBikeLanes` (tolerance au detour)
Reference: `src/types/routing.ts`.

## Best / Alternatives
Resultat final du routing:
- `best`: route recommandee
- `alternatives`: autres options affichables
- `all`: ensemble trie par score
Reference: `src/types/routing.ts`.

## Off-route
Etat indiquant que la position GPS sort durablement du corridor de la route active.
Declenche potentiellement un reroutage automatique.
Reference: `src/store/navigation.slice.ts` et `src/features/map/MapScreen.tsx`.

## FallEngine
Moteur de detection de chute base sur capteurs (acceleration + gyroscope).
Pipeline principal:
1. detection de chute libre
2. detection d'impact
3. verification d'immobilite post-impact
Reference: `src/features/fall/fallEngine.ts`.

## POSSIBLE_FALL / FALL_CONFIRMED
Evenements emmis par `FallEngine`:
- `POSSIBLE_FALL`: impact detecte avec un niveau de confiance
- `FALL_CONFIRMED`: sequence complete validee (impact + immobilite)
Reference: `src/features/fall/fallEngine.ts`.

## Session de navigation (TTL 45 min)
Etat de navigation persiste localement pour reprise de trajet.
Expire apres 45 minutes pour eviter une reprise obsolete.
Reference: `src/services/navigation/persistence.ts`.
