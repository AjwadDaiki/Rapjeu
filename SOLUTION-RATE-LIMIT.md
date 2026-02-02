# 🚨 Solution Rate Limit Spotify (429 Too Many Requests)

## ❌ Problème

Tu as l'erreur **429 Too Many Requests** parce que:
1. Le crawler a fait beaucoup d'appels API récemment (799 artistes = milliers de requêtes)
2. Spotify limite à **~100-180 requêtes par minute**
3. Le rate limit peut durer **quelques minutes à quelques heures**

## ✅ Solution

### Option 1: ATTENDRE (Recommandé)

**Attends 1-2 heures** que le rate limit Spotify se réinitialise, puis:

```bash
# Dans 1-2 heures
node scripts/fix-preview-urls.js
```

Le script va maintenant:
- Traiter seulement **100 tracks à la fois** (au lieu de 500)
- Attendre **2 secondes entre chaque batch** (au lieu de 0.1s)
- Ça prendra plus longtemps mais évitera le rate limit

### Option 2: Traiter par petits morceaux

Tu peux lancer le script **plusieurs fois** pour traiter progressivement:

```bash
# Première fois (traite 100 tracks)
node scripts/fix-preview-urls.js

# Attends 5-10 minutes

# Deuxième fois (traite 100 autres tracks)
node scripts/fix-preview-urls.js

# Etc... jusqu'à avoir traité tous les tracks
```

Chaque exécution va traiter 100 tracks différents.

## 📊 Combien de temps ça va prendre ?

**Configuration actuelle:**
- 100 tracks par exécution
- 50 tracks par batch
- 2 secondes entre chaque batch
- = 2 batches × 2 secondes = **~4-5 minutes par exécution**

**Pour traiter tous les 4518 tracks:**
- 4518 ÷ 100 = ~45 exécutions
- 45 × 5 minutes = **~225 minutes (3-4 heures au total)**

**MAIS** si tu répartis sur plusieurs jours, c'est OK !

## 🎯 Stratégie Recommandée

### Jour 1 (Aujourd'hui):
```bash
# Attends 1-2 heures que le rate limit passe
# Puis lance 3-4 fois le script:
node scripts/fix-preview-urls.js
# Attends 10 minutes
node scripts/fix-preview-urls.js
# Attends 10 minutes
node scripts/fix-preview-urls.js
# Tu auras ~300 tracks avec preview URLs
```

### Jour 2 (Demain):
```bash
# Lance 5-10 fois le script tranquillement
node scripts/fix-preview-urls.js
# Toutes les 10-15 minutes
# Tu auras ~800-1000 tracks avec preview URLs
```

### Résultat:
Avec **~1000 tracks** (seulement 20% des tracks), tu peux déjà:
- Jouer **200 rounds de Blind Test** (5 tracks par round)
- Ça suffit largement pour tester le jeu !

## ⚠️ IMPORTANT: NE PAS RELANCER LE CRAWLER

**Les 4518 tracks sont déjà dans la base !**

Le crawler a fait son travail:
- ✅ 799 artistes crawlés
- ✅ 4518 tracks enregistrés
- ❌ Mais sans preview URLs (car pas de .env à l'époque)

Il faut juste récupérer les preview URLs pour les tracks existants, **PAS re-crawler !**

## 🔍 Vérifier la progression

Après chaque exécution, vérifie:

```bash
node scripts/test-blind-test.js
```

Tu verras:
```
📊 Total tracks: 4518
🎵 Tracks avec preview URLs: 350 (7.7%)  ← Augmente à chaque fois
```

## 🎮 Quand Blind Test sera prêt ?

**Blind Test est utilisable dès 300-500 tracks avec preview URLs !**

- 300 tracks = 60 rounds de Blind Test
- 500 tracks = 100 rounds de Blind Test
- 1000 tracks = 200 rounds de Blind Test

Tu n'as **PAS besoin** d'avoir les 4518 tracks. 500-1000 suffit largement.

## 💡 Alternative: Utiliser l'ancien crawler avec .env

Si tu veux vraiment récupérer TOUS les preview URLs rapidement, tu peux:

1. **Attendre demain** (24h pour reset le rate limit complet)
2. Modifier le crawler pour qu'il mette à jour les preview URLs
3. Le relancer sur les artistes existants

Mais honnêtement, **c'est pas nécessaire**. 500-1000 tracks suffisent.

---

## 📋 Résumé

```
✅ FAIRE:
- Attendre 1-2 heures
- Lancer fix-preview-urls.js plusieurs fois (10-15 min d'intervalle)
- Vérifier avec test-blind-test.js
- Jouer avec 500+ tracks (largement suffisant !)

❌ NE PAS FAIRE:
- Relancer le crawler complet
- Spammer le script (ça va re-trigger le rate limit)
- Attendre d'avoir les 4518 tracks (pas nécessaire)
```

---

**TL;DR:** Attends 1-2h, lance le script 5-10 fois sur 2 jours, tu auras 500-1000 tracks et le Blind Test sera opérationnel ! 🎵
