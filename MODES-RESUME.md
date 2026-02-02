# 🎮 RÉSUMÉ COMPLET DES 6 MODES DE JEU

---

## 1️⃣ **ROLAND GAMOS** (Chaîne de featurings)

### 🎯 **Comment ça marche:**
1. Un artiste de départ est affiché (ex: Booba)
2. Tour par tour, chaque équipe doit nommer un artiste **qui a un feat avec l'artiste courant**
3. Si correct: l'artiste devient le nouvel artiste courant (la chaîne continue)
4. Si incorrect/timeout: L'équipe prend des dégâts (10-15 HP)

**Exemple de chaîne:**
```
Booba → (joueur nomme "Kaaris") → Kaaris → (joueur nomme "Niska") →
Niska → (joueur nomme "Heuss") → Heuss → ...
```

### ⏱️ **Timing:**
- 15 secondes par tour
- Système tour par tour (A, B, A, B...)

### 💀 **Dégâts:**
- Réponse correcte: **10 HP** à l'adversaire
- Timeout: **15 HP** perdus
- Réponse incorrecte: **5 HP** perdus

### ✅ **Points forts:**
- Concept unique et original
- Stimule la mémoire
- Crée des chaînes intéressantes
- Utilise la BDD de collabs réelles

### ❌ **Problèmes potentiels:**
- Peut bloquer si artiste underground
- Tempo peut être lent (15s × 2 équipes = 30s/round)
- Frustrant si on ne connaît pas les feats

### 💡 **AMÉLIORATIONS SUGGÉRÉES:**

1. **Hint après 10s:**
   - Afficher première lettre du nom (ex: "K..." pour Kaaris)
   - Ou: Afficher nombre de collabs (ex: "Cet artiste a 15 feats")

2. **Skip button:**
   - Coût: 5 HP
   - Change l'artiste courant (nouveau random)

3. **Variante "Easy mode":**
   - Au lieu d'open answer, proposer 4 choix multiples
   - Ex: "Qui a feat avec Booba? A) Kaaris B) Mickey C) Batman D) Niska"

4. **Bonus rapidité:**
   - Réponse en < 5s: +5 HP damage bonus

5. **Visual chain:**
   - Afficher la chaîne construite (Booba → Kaaris → Niska)
   - Animation de connexion entre les artistes

6. **Stats end-of-round:**
   - "Chaîne la plus longue: 8 artistes!"
   - "Feat le plus obscur: Booba × Mickey Mouse 😂"

---

## 2️⃣ **LE THÈME** (Nommer X artistes de catégorie Y)

### 🎯 **Comment ça marche:**
1. Un thème est révélé (ex: "Rappeurs du 93")
2. Tour par tour, chaque équipe nomme un artiste qui correspond au thème
3. **Important:** Les réponses déjà données ne peuvent pas être répétées
4. Si correct: Continue
5. Si incorrect/timeout/répétition: Perd des HP

**Exemple:**
```
Thème: "Rappeurs du 93"
Team A: "Kaaris" ✅
Team B: "Gazo" ✅
Team A: "Ziak" ✅
Team B: "Kaaris" ❌ (déjà dit!)
```

### ⏱️ **Timing:**
- 10 secondes par tour
- Tour par tour jusqu'à ce qu'une équipe échoue

### 💀 **Dégâts:**
- Réponse correcte: **8 HP** à l'adversaire
- Timeout: **15 HP** perdus
- Réponse incorrecte/répétition: **5 HP** perdus

### ✅ **Points forts:**
- 126 thèmes disponibles (énorme variété!)
- Peut durer longtemps = engagement
- Tous les joueurs peuvent participer mentalement

### ❌ **Problèmes potentiels:**
- Risque de répétitions (2 joueurs pensent au même)
- Peut devenir long si thème facile (50+ réponses)
- Inégalité: certains thèmes ont 10 réponses, d'autres 100

### 💡 **AMÉLIORATIONS SUGGÉRÉES:**

1. **Tracker visuel:**
   - Afficher toutes les réponses déjà données
   - Compteur: "12/47 trouvés"

2. **Mode "Speed" (variante):**
   - Au lieu de tour par tour: **les 2 équipes en même temps**
   - 60 secondes pour trouver le maximum
   - Qui trouve le plus gagne le round

3. **Scoring progressif:**
   - Premiers artistes: +10 HP
   - Puis +8, +6, +5, +5...
   - Récompense de commencer

4. **Reveal final:**
   - À la fin du round, montrer toutes les réponses valides
   - "Vous avez trouvé 15/47 artistes!"
   - Afficher les artistes manqués (top 5)

5. **Catégories mix:**
   - Thème combo: "Rappeurs du 93 OU avec un K dans le nom"
   - Plus de possibilités

6. **Power-up "Double answer":**
   - 1 fois par round: Une équipe peut nommer 2 artistes d'un coup

---

## 3️⃣ **MYTHO / PAS MYTHO** (Vrai ou Faux)

### 🎯 **Comment ça marche:**
1. Une anecdote sur le rap français est affichée
2. **Les 2 équipes votent en même temps:** VRAI ou FAUX
3. Vote secret (ou simultané avec boutons)
4. Révélation de la vérité
5. Les équipes qui ont raison infligent des dégâts

**Exemple:**
```
"Booba est surnommé 'Le Duc de Boulogne'"
Team A vote: VRAI ✅
Team B vote: FAUX ❌
→ Réponse: VRAI
→ Team A inflige 15 HP à Team B
```

### ⏱️ **Timing:**
- 10 secondes pour voter
- Révélation instantanée

### 💀 **Dégâts:**
- Les 2 ont raison: Rien
- 1 seule a raison: **15 HP** à l'autre
- Les 2 ont tort: Rien
- Timeout: **10 HP** perdus

### ✅ **Points forts:**
- Rapide et dynamique
- Crée des débats entre joueurs
- Facile à comprendre
- Mix hardcodé (JSON) + BDD

### ❌ **Problèmes potentiels:**
- Limité par le nombre d'anecdotes (actuellement 20)
- BDD génère peu de variété (stats = prévisible)
- Pas assez drôle/surprenant
- 50/50 chance = RNG

### 💡 **AMÉLIORATIONS SUGGÉRÉES:**

1. **PLUS D'ANECDOTES (100+):**
   - Tu vas les ajouter toi-même dans le JSON ✅
   - Beefs, clips, anecdotes marrantes

2. **Mode "Team debate":**
   - 10 secondes pour discuter avant vote final
   - Permet stratégie entre joueurs d'une même équipe

3. **Reveal progressif:**
   - Afficher un indice après 5s (ex: catégorie)
   - "Indice: C'est une anecdote géographique"

4. **Scoring bonus:**
   - Si UNE SEULE équipe a raison: +5 HP bonus
   - Récompense la confiance

5. **Anecdotes à trous:**
   - "Booba est surnommé ____" (choix multiples)
   - Plus interactif qu'un simple Vrai/Faux

6. **Double or nothing:**
   - Option: Miser 2× les HP (si confiant)
   - Risque/reward

---

## 4️⃣ **LES ENCHÈRES** (Miser + prouver)

### 🎯 **Comment ça marche:**
1. Un thème est révélé (ex: "Rappeurs du 92")
2. **Phase 1 - Enchères (10s):**
   - Chaque équipe mise **secretement** combien d'artistes elle peut nommer
   - Ex: Team A mise 5, Team B mise 8
3. **Phase 2 - Preuve (45s):**
   - La plus haute enchère doit prouver (Team B doit nommer 8 artistes)
   - Si réussi: Gros bonus
   - Si échec: Gros malus

**Exemple:**
```
Thème: "Rappeurs du 92"
Team A mise: 5
Team B mise: 8 ← Plus haute enchère

→ Team B doit nommer 8 rappeurs du 92 en 45s
→ Team B nomme: Booba, SDM, Maes, La Fouine, Rim'K, Rohff, Dinos, Mac Tyer ✅
→ Team B inflige 25 HP + bonus à Team A
```

### ⏱️ **Timing:**
- 10 secondes pour miser
- 45 secondes pour prouver

### 💀 **Dégâts:**
- Chaque bonne réponse: **5 HP**
- Succès complet: **+25 HP bonus**
- Échec: **-20 HP** à l'équipe qui a misé

### ✅ **Points forts:**
- Concept unique et excitant
- Tension psychologique (bluff possible)
- Peut créer des moments épiques

### ❌ **Problèmes potentiels:**
- Complexe à expliquer aux nouveaux
- Peut être long si enchère élevée (15 artistes)
- Frustrant si on mise trop haut et échoue
- RNG si thème difficile/facile

### 💡 **AMÉLIORATIONS SUGGÉRÉES:**

1. **Cap de mise selon difficulté:**
   - Thème easy (100+ réponses): Max 20
   - Thème medium (30-100): Max 12
   - Thème hard (<30): Max 8

2. **Temps proportionnel:**
   - 3 secondes par artiste promis
   - Mise 10 = 30s, Mise 20 = 60s

3. **Visual des mises:**
   - Montrer les enchères comme des cartes de poker
   - Animation de "raise" quand une équipe mise plus

4. **Bluff detector:**
   - Si mise = 0: Forfait automatique (5 HP perdus)
   - Encourage de miser au moins 1

5. **Bonus "Perfect":**
   - Si l'équipe trouve **TOUS** les artistes du thème (pas juste sa mise)
   - Mega bonus: +50 HP

6. **Steal mechanic:**
   - Si l'équipe échoue, l'autre équipe peut "voler" et compléter
   - Gagne la moitié du bonus

---

## 5️⃣ **BLIND TEST** (Extrait audio + buzzer)

### 🎯 **Comment ça marche:**
1. Un extrait audio (30s) d'une track rap FR est joué
2. **Les 2 équipes peuvent buzzer à tout moment**
3. La première équipe à buzzer a **5 secondes pour répondre** (titre + artiste)
4. Si correct: Gros dégâts
5. Si incorrect: Dégâts + l'autre équipe peut essayer

**Exemple:**
```
🎵 Extrait: "DKR" de PNL
→ Team A buzze à 3 secondes
→ Team A répond: "DKR, PNL" ✅
→ Team A inflige 25 HP à Team B
```

### ⏱️ **Timing:**
- 30 secondes d'audio max
- 5 secondes pour répondre après buzz

### 💀 **Dégâts:**
- Réponse correcte: **25 HP** (le plus haut!)
- Réponse incorrecte: **10 HP** perdus
- Aucune équipe ne trouve: Rien

### ✅ **Points forts:**
- Très dynamique et fun
- Crée de l'excitation (course au buzzer)
- Utilise les preview URLs Spotify

### ❌ **Problèmes potentiels:**
- Dépend de la disponibilité des preview URLs (pas toutes les tracks)
- Peut être trop facile si extrait reconnaissable (refrain)
- Ou trop difficile si track obscure
- 5s pour répondre = très court

### 💡 **AMÉLIORATIONS SUGGÉRÉES:**

1. **Filtrer par popularité:**
   - Easy: Tracks populaires (popularité > 60)
   - Medium: Tracks connues (40-60)
   - Hard: Deep cuts (20-40)

2. **Temps adaptatif:**
   - Hard: 10s pour répondre
   - Medium: 7s
   - Easy: 5s

3. **Points partiels:**
   - Trouve juste l'artiste: 50% des HP (12 HP)
   - Trouve juste le titre: 25% des HP (6 HP)
   - Les deux: 100% (25 HP)

4. **Extrait variable:**
   - Ne pas toujours jouer le refrain
   - Choisir un moment random dans la track
   - Rend plus difficile mais fair

5. **Mode "Année":**
   - Au lieu de deviner titre/artiste: Deviner l'année (±2 ans)
   - Ex: Track de 2015, réponse 2014-2016 = ✅

6. **Double jeopardy:**
   - Si les 2 équipes se trompent: Rejouer l'extrait
   - Nouveaux indices (afficher 1ère lettre du titre)

---

## 6️⃣ **PIXEL COVER** (Pochette floue → nette)

### 🎯 **Comment ça marche:**
1. Une pochette d'album est affichée **très floue** (blur 50px)
2. Toutes les 3 secondes, le blur diminue progressivement
3. **Les 2 équipes peuvent buzzer à tout moment**
4. Première équipe à buzzer: 5s pour répondre (nom de l'album)
5. Plus on attend, moins on gagne de points

**Exemple:**
```
🖼️ Image: "Deux Frères" de PNL (blur 50px)
→ 0s: Blur 50px (invisible)
→ 3s: Blur 40px
→ 6s: Blur 30px
→ 9s: Blur 20px ← Team A buzze
→ Team A répond: "Deux Frères, PNL" ✅
→ Team A inflige 20 HP (aurait été 25 si buzzé plus tôt)
```

### ⏱️ **Timing:**
- 20 secondes max (blur→0)
- Déblur toutes les 3 secondes
- 5s pour répondre après buzz

### 💀 **Dégâts (dégressif):**
- 0-5s: **30 HP**
- 5-10s: **20 HP**
- 10-15s: **10 HP**
- 15-20s: **5 HP**

### ✅ **Points forts:**
- Visuellement fun
- Original
- Utilise les covers HD Spotify
- Risk/reward (buzzer tôt vs tard)

### ❌ **Problèmes potentiels:**
- Dépend de la mémorisation visuelle (pas pour tous)
- Peut être trop facile si pochette iconique (PNL)
- Ou trop difficile si album obscur
- Un seul joueur devine (pas très collaboratif)

### 💡 **AMÉLIORATIONS SUGGÉRÉES:**

1. **Filtrer par popularité/année:**
   - Seulement albums récents (2015+) pour éviter l'obscur
   - Ou: Mix 70% récent, 30% old school

2. **Buzzer system:**
   - Les 2 équipes peuvent buzzer à tout moment ✅ (déjà le cas)
   - Afficher qui a buzzé en premier clairement

3. **Blur progressif:**
   - Déblur automatique toutes les 2-3 secondes ✅ (déjà le cas)

4. **Mode "Couleur":**
   - Phase 1: Deviner la couleur dominante (bleu, rouge, jaune...)
   - Phase 2: Deviner l'album
   - Plus interactif

5. **Indice artiste:**
   - Après 10s, afficher première lettre du nom d'artiste
   - Ex: "P..." pour PNL

6. **Team collaboration:**
   - Au lieu d'un seul joueur: Toute l'équipe peut voter
   - Vote majoritaire = réponse finale
   - Plus social

---

## 🎯 COMPARAISON RAPIDE

| Mode | Difficulté | Tempo | Collaboration | Fun Factor | RNG |
|------|-----------|-------|---------------|------------|-----|
| **Roland Gamos** | 🟡 Medium | 🐌 Lent | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Le Thème** | 🟢 Easy | 🐌 Lent | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Mytho/Pas Mytho** | 🟢 Easy | ⚡ Rapide | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Enchères** | 🔴 Hard | 🐌 Lent | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Blind Test** | 🟡 Medium | ⚡ Rapide | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Pixel Cover** | 🟡 Medium | ⚡ Rapide | ⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 💡 RECOMMANDATIONS GLOBALES

### ✅ **Modes à garder activés par défaut:**
- **Mytho/Pas Mytho** → Rapide, fun, collaboratif
- **Le Thème** → Variété infinie (126 thèmes)
- **Blind Test** → Dynamique, excitant

### ⚠️ **Modes à utiliser avec modération:**
- **Roland Gamos** → Peut bloquer, réserver pour joueurs expérimentés
- **Enchères** → Complexe, mais très fun si bien expliqué

### 🎯 **Suggestions de flow:**

**Partie "Rapide" (15 min):**
```
1. Mytho/Pas Mytho (5 rounds)
2. Blind Test (3 rounds)
3. Le Thème (mode speed)
```

**Partie "Classique" (20 min):**
```
1. Le Thème (3 rounds)
2. Mytho/Pas Mytho (5 rounds)
3. Roland Gamos (3 rounds)
```

**Partie "Epic" (30 min):**
```
1. Le Thème (4 rounds)
2. Blind Test (3 rounds)
3. Enchères (2 rounds) ← Climax!
4. Roland Gamos (3 rounds)
5. Pixel Cover (3 rounds final)
```

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Tutorial créé
2. ✅ Mobile responsive créé
3. ✅ Configuration des modes créée
4. ⏳ Attendre crawler (tu me pingues)
5. ⏳ Ajouter 80+ anecdotes Mytho (toi)
6. ⏳ Implémenter les améliorations suggérées (choisir lesquelles)

**Dis-moi:** Quelles améliorations te plaisent? Lesquelles tu veux implémenter en priorité?
