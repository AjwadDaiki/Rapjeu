# RAPJEU – Compte-rendu technique & produit (état actuel)

## 1) Résumé rapide
RAPJEU est un jeu web multijoueur en temps réel (Socket.IO) avec 2 équipes qui s’affrontent sur plusieurs modes. Le cœur du jeu repose sur les données MongoDB (crawl), et certains modes utilisent des JSON locaux (Mytho/Pas Mytho, Continue les Paroles). L’UI suit désormais une identité **bleu/jaune** avec un **split central en forme d’éclair**, typographie épaisse et éléments cohérents (inputs, boutons, badges).

**Statut global :**
- Le build passe (Next.js).  
- Les flux de rooms + lobby + démarrage sont fonctionnels.  
- Tous les modes sont branchés côté serveur et UI, mais **une validation complète “jeu entre potes” doit être faite mode par mode** (voir checklist de test en fin de doc).

---

## 2) Architecture globale

### 2.1 Backend temps réel
- **Socket.IO** (server.ts)
- **RoomManager** = moteur de jeu / état / timers / transitions
- Le serveur est autoritaire : il gère les timers, les scores, les transitions de phases.

### 2.2 State machine (phases)
- lobby → vs_intro → mode_roulette → mode_intro → playing → round_result → final_score
- Les transitions sont gérées par RoomManager et diffusées au client.

### 2.3 Base de données
- **MongoDB** (collections principales) :
  - artists
  - tracks
  - albums
  - collaborations

### 2.4 Contenu préchargé
Le serveur précharge du contenu au démarrage (contentAggregator).  
Un paramètre `MONGO_POOL_LIMIT` permet de charger **tout** ou une portion :
- `MONGO_POOL_LIMIT=0` → charge toute la base (par défaut)
- `MONGO_POOL_LIMIT=2000` → limite volontaire

---

## 3) Data sources par mode

### Roland Gamos (chain de featurings)
- Source : MongoDB (collaborations + artists)
- Validation : vérifie feat entre artiste courant et réponse
- **Pas de limite de chaîne imposée**

### Le Thème
- Source : thèmes dynamiques (app/lib/themeService + Mongo)
- Validation : réponse dans le thème + pas déjà utilisée
- Thèmes **doivent être vérifiables par la BDD** (ex : localisation, lettres, années, etc.)

### Mytho / Pas Mytho
- Source : JSON local
- Fichier : `app/data/mytho-anecdotes.json`
- Format attendu :
```json
{
  "anecdotes": [
    {
      "id": "m1",
      "statement": "Booba a déjà fait un feat avec Kaaris",
      "isTrue": true,
      "explanation": "Track: ...",
      "difficulty": "easy",
      "category": "collab"
    }
  ]
}
```

### Enchères
- Source : thèmes (même base que Le Thème)
- Flow : chaque équipe mise → gagnant doit prouver en donnant X réponses

### Blind Test
- Source principale : MongoDB tracks (previewUrl)
- Fallback : Spotify / LastFM
- **Nécessite des previews audio**

### Pixel Cover
- Source principale : MongoDB albums (coverUrl)
- Fallback : Discogs / Spotify / LastFM

### Devine Qui
- Source : MongoDB artists
- Utilise : albums, streams, letters, yearDebut, origin

### Continue les Paroles
- Source : JSON local
- Fichier : `app/data/continue_paroles.json`
- Format attendu :
```json
[
  {
    "prompt": "J'arrive dans le game comme un ___ au Bataclan",
    "answer": "missile",
    "artist": "Booba",
    "title": "DKR"
  }
]
```
(les clés `text/missingWord` ou `artistName/trackTitle` sont aussi acceptées)

---

## 4) Flow complet d’une partie
1) Joueur entre un pseudo
2) Création ou join de room
3) Lobby : équipes, config, readiness
4) Hôte lance la partie
5) Phase VS → roulette mode → intro → jeu
6) Chaque mode joue 1 round (dégâts limités par round)
7) Résultat round + reveal
8) Enchaînement jusqu’à `totalRounds`
9) Score final

---

## 5) Design / UI (nouvelle direction)

### Identité
- **Bleu / Jaune** en couleurs principales
- Fond **split** avec **éclair central**
- Typo plus épaisse (Archivo Black + Space Grotesk)

### Fichiers clés UI
- `app/globals.css` (variables + split background)
- `app/components/RetrowaveBackground.tsx` (fond split)
- `app/styles/gta-sa.css` (styles lobby v2)
- `app/components/NeonButton.tsx` (inputs/boutons)

### Choix à respecter
✅ Garder le split bleu/jaune comme identité
✅ Boutons et inputs alignés sur la palette
✅ Pas d’effets neon
✅ Typo épaisse / lisible

---

## 6) Feedback gameplay (clarte)

**Objectif :** on doit TOUJOURS savoir si c’est bon, faux, ou “déjà dit”.

Mis en place :
- “Notice” en haut (résultat + dégâts)
- Historique central A/B
- Reveal de réponse après round (Pixel, Blind, Devine Qui, etc.)

---

## 7) Ce qu’il faut FAIRE / AJOUTER (toi)

### Obligatoire
- Remplir `app/data/mytho-anecdotes.json`
- Remplir `app/data/continue_paroles.json`
- Vérifier que MongoDB contient bien previews / covers

### Recommandé
- Vérifier que les thèmes (Le Thème / Enchères) sont **réalistes** et “jouables”
- Ajuster difficulté (popularité min, blur pixel cover, etc.)

---

## 8) Ce qu’il ne faut PAS faire
- Ne pas remettre de JSON hardcodé côté modes reliés à Mongo
- Ne pas inventer des thèmes impossibles à valider
- Ne pas casser l’identité split bleu/jaune

---

## 9) Checklist de test (mode par mode)

**Roland Gamos**
- Réponse correcte → validée + dégâts
- Mauvaise → pénalité
- Skip → passe bien de tour

**Le Thème**
- Réponse valide → OK
- Doublon → “déjà dit”

**Mytho / Pas Mytho**
- Vrai / faux bien affiché
- Explication affichée

**Enchères**
- Mise → révélation → phase preuve
- Mauvais → dégâts + fin du round

**Blind Test**
- Buzz OK
- Mauvaise réponse -> dégâts
- Son preview fonctionne

**Pixel Cover**
- Flou -> reveal
- Bonne réponse = score

**Devine Qui**
- Indices cohérents
- Good/bad feedback clair

**Continue Paroles**
- Bonne ligne validée
- Mauvaise = pénalité
- Titre/artist cohérents (via JSON)

---

## 10) Variables d’environnement utiles
- MONGODB_URI
- SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET (si utilisé)
- LASTFM_API_KEY
- GENIUS_ACCESS_TOKEN
- DISCOGS_TOKEN
- MONGO_POOL_LIMIT=0 (par défaut)

---

## 11) Résumé final
- Structure solide (RoomManager, SocketIO, Mongo).
- Design modernisé et cohérent avec l’image fournie.
- Tous les modes sont branchés, mais **tu dois remplir les JSON locaux** pour Mytho et Continue Paroles.
- Reste la validation fine mode par mode (test réel entre potes).  

Si tu veux je peux continuer la QA active (test + corrections) sur chaque mode.
