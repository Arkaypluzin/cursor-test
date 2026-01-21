# Trello-style App

Une application de gestion de tâches style Trello construite avec Next.js, React, TypeScript, Tailwind CSS et Supabase.

## Prérequis

- Node.js 18+ installé
- Un compte Supabase avec un projet créé
- Les variables d'environnement configurées

## Installation

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet avec vos clés Supabase :

```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
```

Pour obtenir ces valeurs :
- Allez dans votre projet Supabase
- Settings → API
- Copiez le **Project URL** et la clé **anon/public**

3. **Configurer la base de données**

- Ouvrez le fichier `supabase_schema.sql`
- Allez dans votre projet Supabase → SQL Editor
- Copiez-collez tout le contenu du fichier SQL
- Exécutez le script pour créer les tables et les politiques RLS

4. **Activer Realtime (optionnel mais recommandé)**

Dans Supabase Dashboard :
- Allez dans Database → Replication
- Activez la réplication pour les tables : `boards`, `lists`, `cards`, `card_assignments`

## Lancer l'application

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## Utilisation

1. **Créer un compte** : Allez sur `/signup` pour créer un nouveau compte
2. **Se connecter** : Utilisez `/login` pour vous connecter
3. **Créer un board** : Cliquez sur "Create Board" sur la page d'accueil
4. **Ajouter des listes** : Dans un board, cliquez sur "Add List"
5. **Ajouter des cartes** : Cliquez sur "+ Add a card" dans une liste
6. **Glisser-déposer** : Utilisez le drag-and-drop pour réorganiser les listes et les cartes

## Fonctionnalités

- ✅ Authentification email/mot de passe
- ✅ CRUD complet pour les boards, listes et cartes
- ✅ Drag-and-drop pour réorganiser les listes et cartes
- ✅ Mises à jour en temps réel avec Supabase Realtime
- ✅ Mode sombre/clair
- ✅ Labels de couleur pour les cartes
- ✅ Dates d'échéance pour les cartes
- ✅ Design responsive

## Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm run start` - Lance l'application en mode production
- `npm run lint` - Vérifie le code avec ESLint

## Structure du projet

```
├── app/                    # Pages Next.js (App Router)
│   ├── login/              # Page de connexion
│   ├── signup/             # Page d'inscription
│   ├── boards/[id]/        # Page de détail d'un board
│   └── page.tsx            # Page d'accueil
├── components/             # Composants React
│   ├── boards/             # Composants pour les boards
│   ├── lists/              # Composants pour les listes
│   ├── cards/              # Composants pour les cartes
│   ├── ui/                 # Composants UI réutilisables
│   └── layout/             # Composants de layout
├── lib/                    # Utilitaires et hooks
│   ├── supabase/           # Configuration Supabase
│   ├── hooks/              # Hooks personnalisés
│   └── utils/              # Fonctions utilitaires
├── types/                  # Définitions TypeScript
└── supabase_schema.sql     # Schéma de base de données
```

## Dépannage

### Erreur de connexion à Supabase
- Vérifiez que vos variables d'environnement sont correctement configurées dans `.env.local`
- Assurez-vous que les clés Supabase sont valides

### Erreurs de permissions
- Vérifiez que les politiques RLS (Row Level Security) ont été créées dans Supabase
- Assurez-vous que l'utilisateur est bien authentifié

### Realtime ne fonctionne pas
- Vérifiez que Realtime est activé pour les tables dans Supabase Dashboard
- Vérifiez que vous avez exécuté les commandes ALTER PUBLICATION dans le SQL Editor

## Support

Pour toute question ou problème, consultez la documentation :
- [Next.js](https://nextjs.org/docs)
- [Supabase](https://supabase.com/docs)
- [@dnd-kit](https://docs.dndkit.com/)
