# School Matrix — App mobile

Frontend React Native (Expo) pour Android & iOS.

**Marque :** School Matrix (pas « Parallele » dans l’UI).

## Démarrer

```bash
# depuis la racine du monorepo
npm run dev:mobile

# ou
npm --prefix apps/mobile start
```

Puis scanner le QR code avec Expo Go, ou `i` / `a` pour simulateur.

### Les changements UI ne s’affichent pas ?

`npx expo start -c` puis `a` **ne rebuild pas** Expo Go. `-c` vide seulement le cache Metro sur le Mac. L’app Android/iOS garde souvent l’ancien JS en mémoire.

Pour un vrai relance Android :

```bash
# depuis la racine du monorepo
npm run dev:mobile:android:fresh

# depuis apps/mobile (même commande, alias ajouté)
npm run android:fresh
# ou
npm run dev:mobile:android:fresh
```

Ça : tue le port 8081, vide Metro/`.expo`, **force-stop Expo Go** sur l’émulateur, puis `expo start -c --android`.

Si ça reste collé (très rare) :

```bash
NUKE=1 npm --prefix apps/mobile run android:fresh
```

(`pm clear` Expo Go — tu devras te reconnecter à Expo.)

**Ce que `-c` ne peut pas changer :** splash, icône, plugins natifs (`app.json`) → il faut un build natif (`eas build` / prebuild), pas Expo Go.

### API

Par défaut → **cloud** `http://34.95.43.132` (comme desktop Remote).

```bash
# Nest local (iOS sim)
EXPO_PUBLIC_API_TARGET=local npm run dev:mobile

# ou URL explicite — voir .env.example
```

## Spec produit

| Fichier | Contenu |
|---------|---------|
| [`docs/CARTOGRAPHIE.md`](docs/CARTOGRAPHIE.md) | Inventaire desktop + backend |
| [`docs/PLAN-UI-UX.md`](docs/PLAN-UI-UX.md) | Navigation mobile / personas |
| [`docs/PLAN-APPLICATION.md`](docs/PLAN-APPLICATION.md) | Feuille de route S0→S21 |
| [`docs/ROLE_CHECKS.md`](docs/ROLE_CHECKS.md) | Checklist ACL par rôle (S21) |
| [`spec/productMap.ts`](spec/productMap.ts) | Schéma navigation |

## État chantier

- **S0–S21** : parcours produit + durcissement (cache offline, file appel/paiement, `eas.json`, stub push)
- Builds store : `eas build -p android|ios --profile preview|production` (remplacer `extra.eas.projectId` après `eas init`)

Logo : `assets/logo.png`
