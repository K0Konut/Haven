# Contribuer a Haven

Ce document decrit le workflow de contribution attendu pour garder un historique Git lisible et une base code/doc maintenable.

## 1. Workflow rapide
1. Partir de `main` a jour.
2. Creer une branche dediee au sujet.
3. Faire des commits atomiques (un changement logique par commit).
4. Verifier localement (`lint`, `typecheck`, `build`).
5. Ouvrir une Pull Request avec contexte, impact et verification.
6. Merger apres review, puis supprimer la branche.

## 2. Convention de branches
Utiliser des noms explicites:

- `feature/<sujet-court>` pour une fonctionnalite.
- `fix/<sujet-court>` pour une correction.
- `doc/<sujet-court>` pour la documentation.
- `chore/<sujet-court>` pour la maintenance.

Exemples:
- `feature/rerouting-threshold`
- `fix/fall-engine-cooldown`
- `doc/project-documentation`

## 3. Convention de commits
Format recommande:

```text
<type>: <resume court>
```

Types conseilles:
- `feat` nouvelle fonctionnalite
- `fix` correction
- `docs` documentation
- `refactor` amelioration interne sans changement fonctionnel
- `test` ajout/modif de tests
- `chore` maintenance

Exemples:
- `docs: ajouter glossary des concepts routing et chute`
- `fix: stabiliser le reroute sur GPS bruites`

## 4. Pull Request (PR)
La PR doit permettre a un reviewer externe de comprendre rapidement:

- Pourquoi: probleme ou besoin couvert.
- Quoi: changements principaux (fichiers/modules touches).
- Comment tester: etapes de verification locale.
- Risques/impacts: comportement, perfs, compat mobile/web.
- Documentation: liens vers docs mises a jour (`README`, `docs/ARCHITECTURE.md`, `docs/GLOSSARY.md`).

Pour une PR UI, joindre des captures (avant/apres) si possible.

## 5. Definition of Done (Git <-> Code/Doc)
| Critere Git | Attendu Code/Doc |
| --- | --- |
| Branche ciblee et courte | Diff focalisee sur un seul sujet metier/technique |
| Commits atomiques | Historique relisible et revert facile |
| Message de commit explicite | Intention fonctionnelle comprenable sans ouvrir tout le diff |
| PR decrite et testee | Reviewer capable de valider le comportement reel |
| Merge apres review | Moins de regressions et meilleure coherence d'architecture |
| Changement de concept metier/technique | Mise a jour de la doc associee (architecture/glossaire/README) |

## 6. Verifications minimales avant PR
Executer dans le repo:

```bash
npm run lint
npm run typecheck
npm run build
```

Si un comportement evolue (routing, chute, alertes, navigation), mettre a jour la documentation dans la meme PR.
