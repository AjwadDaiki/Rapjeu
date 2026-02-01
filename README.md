# 🎮 Rap Battle Online

Jeu de quiz rap multijoueur en temps réel, style **Versus Fighting**.

## ✨ Fonctionnalités implémentées

### Core Gameplay
- ✅ **Lobby multijoueur** avec création/rejoindre via code room
- ✅ **Système d'équipes** (Bleu vs Jaune) avec drag & drop
- ✅ **Input collaboratif** - tous les joueurs d'une équipe voient la saisie en temps réel
- ✅ **Anti-spam** - cooldown entre les réponses
- ✅ **Fuzzy Matching** - tolérance aux fautes d'orthographe (Levenshtein distance ≤ 2)
- ✅ **Alias system** - "Booba" accepte "B2O", "Kopp", etc.
- ✅ **Système de litige (Veto)** - 1 contestation par équipe
- ✅ **Screen Shake** - vibration d'écran sur erreur/impact

### Mode de jeu: Roland Gamos
- ✅ Ping-pong de réponses tour par tour
- ✅ Timer 15 secondes par équipe
- ✅ Détection des doublons
- ✅ Barres de vie (HP) style fighting game
- ✅ Historique des réponses

### Architecture Technique
- ✅ **Next.js 16** + React 19 + TypeScript
- ✅ **Socket.IO** pour temps réel
- ✅ **Tailwind CSS** + Framer Motion pour animations
- ✅ **Server custom** avec intégration Socket.IO

## 🚀 Lancer le projet

```bash
# Installation des dépendances
npm install

# Lancer en développement
npm run dev

# Ouvrir http://localhost:3000
```

## 📁 Structure du projet

```
app/
├── api/socket/         # Route API Socket.IO
├── components/         # Composants UI réutilisables
│   ├── ScreenShake.tsx
│   ├── HPBar.tsx
│   ├── GameTimer.tsx
│   ├── TeamSlot.tsx
│   └── GameInput.tsx
├── game/
│   ├── page.tsx        # Interface de jeu
│   └── modes/
│       └── RolandGamosMode.tsx
├── hooks/
│   ├── useSocket.ts    # Connexion Socket.IO
│   └── useGameContext.tsx
├── lib/
│   ├── constants.ts    # Constantes du jeu
│   ├── utils.ts        # Fuzzy matching, helpers
│   └── roomManager.ts  # Logique serveur
├── lobby/
│   └── page.tsx        # Lobby création/rejoindre
├── types/
│   └── index.ts        # Types TypeScript
└── globals.css         # Styles + animations

server.ts               # Serveur Next.js + Socket.IO
```

## 🎮 Modes de jeu (roadmap)

| Mode | Statut | Description |
|------|--------|-------------|
| 🅰️ Roland Gamos | ✅ | Ping-pong de réponses tour par tour |
| 🅱️ Les Enchères | 🚧 | Mise cachée + proof |
| 🅲️ Blind Test | 🚧 | Synchro audio + buzzer |
| 🅳️ Pixel Cover | 🚧 | Image floue qui se dévoile |

## ⚙️ Configuration

Les constantes de jeu sont dans `app/lib/constants.ts` :
- Temps de réponse
- Points de vie initiaux
- Tolérance fuzzy matching
- Alias des artistes

## 🔧 Stack technique

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS v4
- **Animations**: Framer Motion
- **Temps réel**: Socket.IO
- **Audio**: Howler.js (prêt à intégrer)

---

*Projet en cours de développement - contributions bienvenues !*
