# 🎮 PLAN COMPLET - REFONTE SF2 + LOBBY + UX

## 📊 Analyse des jeux qui marchent

### 🎨 Garticphone
**Ce qui marche:**
- ✅ Lobby ultra simple et clair
- ✅ Code room copiable en 1 clic
- ✅ Host peut configurer: rounds, temps, modes
- ✅ Liste des joueurs en temps réel avec avatars
- ✅ Bouton "START" bien visible (host uniquement)
- ✅ Feedback visuel quand quelqu'un rejoint
- ✅ Animation de transition avant le jeu

### 🎵 Pop Sauce (Blind Test)
**Ce qui marche:**
- ✅ Interface musicale colorée
- ✅ Configuration claire: nombre de manches, difficulté
- ✅ Timer bien visible et animé
- ✅ Scores en temps réel pendant le jeu
- ✅ Buzzer gros et cliquable
- ✅ Feedback sonore sur chaque action
- ✅ Écran de résultats détaillé

### 🎤 K-Culture (Quiz K-pop)
**Ce qui marche:**
- ✅ Design moderne et coloré
- ✅ Lobby avec preview des modes
- ✅ Host choisit quels modes activer
- ✅ Toggle switches visuels
- ✅ Estimation du temps de partie
- ✅ Chat entre joueurs dans le lobby
- ✅ Animations fluides partout

### 🔑 Points communs de réussite:
1. **Lobby clair et configurable** (host = maître du jeu)
2. **Code room facile à partager** (copie 1 clic)
3. **Configuration visible** (pas cachée dans un menu)
4. **Feedback constant** (sons, animations, messages)
5. **Transitions fluides** (pas de coupures brutales)
6. **Temps de partie estimé** (savoir dans quoi on s'embarque)

---

## 🎯 NOTRE PLAN - REFONTE COMPLÈTE

### Phase 1: Lobby SF2 (HOST = Maître du jeu) 🏠

#### Page: `/lobby/[roomCode]`

**Layout:**
```
┌──────────────────────────────────────────────┐
│  🥊 RAP BATTLE - STREET FIGHTER EDITION      │
│                                               │
│  Room Code: [ABC123] 📋 Click to copy        │
│  ┌─────────────────────────────────────────┐ │
│  │  CONFIGURATION (Host uniquement)        │ │
│  │                                          │ │
│  │  🎮 Modes actifs (toggles SF2):         │ │
│  │  [✓] Roland Gamos  [✓] Le Thème         │ │
│  │  [✓] Mytho         [✓] Enchères          │ │
│  │  [✓] Blind Test    [✓] Pixel Cover       │ │
│  │                                          │ │
│  │  ⚙️ Rythme:                              │ │
│  │  Modes par partie: [3] (slider SF2)     │ │
│  │  Rounds par mode:  [5] (slider SF2)     │ │
│  │                                          │ │
│  │  🎲 Mode sélection:                      │ │
│  │  ( ) Aléatoire (roulette)               │ │
│  │  ( ) Ordre fixe                          │ │
│  │  ( ) Vote des joueurs                    │ │
│  │                                          │ │
│  │  ⏱️ Temps estimé: ~25 minutes           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  👥 JOUEURS (4/8):                            │
│  ┌──────────┐ ┌──────────┐                   │
│  │ 🎤 HOST  │ │ 🎧 User2 │                   │
│  │ Player1  │ │ Player2  │                   │
│  │ 🔴 Team A│ │ 🟡 Team B│                   │
│  └──────────┘ └──────────┘                   │
│                                               │
│  [🔥 START BATTLE 🔥] (host uniquement)      │
└──────────────────────────────────────────────┘
```

**Fonctionnalités:**
- ✅ Code room cliquable → copie dans presse-papiers avec toast "Copied!"
- ✅ Configuration visible et modifiable en temps réel (host uniquement)
- ✅ Preview des modes avec icônes SF2
- ✅ Toggle switches style SF2 (gros et clairs)
- ✅ Sliders SF2 avec valeurs affichées
- ✅ Temps estimé qui se met à jour en direct
- ✅ Assignation team A/B automatique (alternance)
- ✅ Button "Change Team" pour chaque joueur
- ✅ Animations quand un joueur rejoint (flash + son)
- ✅ Chat optionnel (petit widget en bas)

---

### Phase 2: Transitions SF2 🎬

#### VS Screen (début de partie)
- Utiliser `<SF2VSScreen>` créé
- Montrer Team A vs Team B
- Animation 3 secondes
- Son "ROUND 1... FIGHT!"

#### Roulette Mode (si aléatoire)
- Roulette style SF2 qui tourne
- Icons des 6 modes
- Son de roulette
- Ralentit et s'arrête sur le mode sélectionné
- "ROLAND GAMOS!" s'affiche

#### Écran inter-rounds
- Mini-recap du round précédent
- Scores actuels
- "ROUND 2" s'affiche
- 2 secondes de transition

---

### Phase 3: Gameplay SF2 🎮

#### HUD pendant le jeu:
```
┌──────────────────────────────────────────────┐
│ TEAM A ████████░░ 85 HP    VS    70 HP ░░████ TEAM B │
│                   ⏱️ 15                       │
│              ROUND 3 / 5                      │
│ COMBO: ⭐⭐⭐                                  │
├──────────────────────────────────────────────┤
│                                               │
│          [QUESTION / MODE ACTIF]              │
│                                               │
│                                               │
└──────────────────────────────────────────────┘
```

**Utiliser composants SF2:**
- `<SF2HealthBar>` pour les HP bars
- `<SF2ComboText>` pour PERFECT, CRITICAL, HIT, MISS
- Timer SF2 style avec flash rouge < 5s
- Combo meter SF2 (pips dorés)

**Sons à chaque action:**
- Bonne réponse → "correct.mp3" + HIT animation
- Mauvaise réponse → "wrong.mp3" + MISS animation
- Combo x2 → "combo2x.mp3" + COMBO animation
- Critical hit (>20 HP) → "critical_hit.mp3" + CRITICAL animation
- Timer < 5s → "tick.mp3" en boucle

---

### Phase 4: Résultats SF2 🏆

#### Écran K.O. (fin de partie)
- Utiliser `<SF2KOScreen>`
- Montrer le gagnant avec feux d'artifice
- Stats détaillées:
  - Meilleur joueur (MVP)
  - Combo le plus long
  - Temps de réponse moyen
  - Mode préféré
- Bouton "CONTINUE" style SF2
- Son "victory.mp3" ou "defeat.mp3"

#### Écran récap final
- Tableau des scores par joueur
- Graphique de progression HP
- Highlights de la partie (meilleurs moments)
- Bouton "REJOUER" ou "QUITTER"

---

### Phase 5: Page Admin 🔧

#### Fixes nécessaires:
- Route: `/admin` (protégée par mot de passe simple)
- Design SF2 cohérent
- Sections:
  1. **Stats globales** (artistes, tracks, preview URLs)
  2. **Top charts** (popularité, albums, collabs)
  3. **Database health** (% preview URLs, % covers)
  4. **Tools:**
     - Bouton "Run crawler" (lance en background)
     - Bouton "Fix preview URLs" (lance le script)
     - Log stream en temps réel

---

## 🛠️ IMPLÉMENTATION - ORDRE D'EXÉCUTION

### ✅ Déjà fait:
1. Composants SF2 (HealthBar, ComboText, VSScreen, KOScreen)
2. CSS SF2 global
3. AudioManager avec SFX
4. GameConfig (presets, validation)

### 🚧 À faire (dans l'ordre):

#### Étape 1: Lobby SF2 (2-3h)
**Fichiers à créer/modifier:**
- `app/lobby/[roomCode]/page.tsx` → Refonte complète lobby
- `app/components/SF2Lobby.tsx` → Composant lobby SF2
- `app/components/SF2RoomCode.tsx` → Code copiable
- `app/components/SF2TeamSelector.tsx` → Sélection team
- `app/components/SF2ModeToggle.tsx` → Toggle modes

**Features:**
- [x] Code copiable en 1 clic
- [x] Configuration host (modes, rythme, sélection)
- [x] Liste joueurs avec teams
- [x] Estimation temps partie
- [x] Button START gros et visible
- [x] Animations jointures

#### Étape 2: Transitions SF2 (1-2h)
**Fichiers à créer/modifier:**
- `app/game/phases/VSIntro.tsx` → Utiliser SF2VSScreen
- `app/game/phases/ModeRoulette.tsx` → Roulette SF2 style
- `app/game/phases/RoundTransition.tsx` → Inter-rounds SF2

#### Étape 3: Gameplay HUD SF2 (2-3h)
**Fichiers à modifier:**
- `app/game/page.tsx` → Intégrer HUD SF2
- `app/game/phases/GameplayPhase.tsx` → Utiliser SF2 composants
- Chaque mode → Ajouter feedback SF2 (sons + animations)

#### Étape 4: Résultats SF2 (1-2h)
**Fichiers à modifier:**
- `app/game/phases/Results.tsx` → Utiliser SF2KOScreen
- `app/game/phases/FinalResults.tsx` → Récap SF2 style
- Stats détaillées avec animations

#### Étape 5: Page Admin fixes (1h)
**Fichiers à modifier:**
- `app/admin/page.tsx` → Design SF2, fix bugs
- Ajouter protection mot de passe
- Tools pour lancer scripts

---

## 📋 CHECKLIST FINALE

### Lobby:
- [ ] Code room copiable 1 clic
- [ ] Host peut configurer modes (toggles SF2)
- [ ] Host peut configurer rythme (sliders SF2)
- [ ] Host peut choisir sélection (aléatoire/fixe/vote)
- [ ] Estimation temps partie en direct
- [ ] Joueurs avec teams assignées
- [ ] Button change team
- [ ] Animations jointures
- [ ] Chat optionnel
- [ ] Button START visible (host uniquement)

### Transitions:
- [ ] VS Screen SF2 au début
- [ ] Roulette modes (si aléatoire)
- [ ] Inter-rounds SF2
- [ ] Sons transitions

### Gameplay:
- [ ] HUD avec SF2HealthBar
- [ ] Timer SF2 style
- [ ] Combo meter SF2
- [ ] Animations feedback (HIT, MISS, COMBO, CRITICAL)
- [ ] Sons à chaque action
- [ ] Messages SF2 style

### Résultats:
- [ ] K.O. Screen SF2
- [ ] Stats MVP
- [ ] Highlights
- [ ] Bouton rejouer SF2 style

### Admin:
- [ ] Design SF2 cohérent
- [ ] Protection mot de passe
- [ ] Stats complètes
- [ ] Tools crawler/fix
- [ ] Fix bugs

---

## 🎨 Design System SF2

### Couleurs:
```css
--sf2-team-a: #00D4FF (bleu cyan)
--sf2-team-b: #FFD700 (or)
--sf2-red: #FF0000 (rouge vif)
--sf2-green: #00FF00 (vert vif)
--sf2-yellow: #FFD700 (or)
--sf2-black: #000000
--sf2-white: #FFFFFF
```

### Font:
```css
font-family: 'Press Start 2P', monospace
```

### Buttons:
- Gros (min 56px height mobile)
- Bordures épaisses (4px)
- Ombre 3D
- Hover = scale(1.05)
- Active = translateY(4px)

### Animations:
- Entrées: slide + rotate
- Feedback: flash + shake
- Transitions: fade + scale

---

## 🚀 PROCHAINES ÉTAPES IMMÉDIATES

1. **Maintenant:** Je vais créer le lobby SF2 complet
2. **Ensuite:** Intégrer les transitions SF2
3. **Puis:** Refondre le gameplay avec HUD SF2
4. **Enfin:** Résultats SF2 + Admin fixes

Dis-moi si tu veux que je commence par le lobby ou autre chose en priorité ! 💪
