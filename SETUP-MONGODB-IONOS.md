# 🗄️ Setup MongoDB sur IONOS VPS

Guide complet pour installer et configurer MongoDB sur ton serveur IONOS.

---

## 📋 Prérequis

- VPS IONOS avec Ubuntu 20.04/22.04 ou Debian 10/11
- Accès SSH root ou sudo
- Au moins 5 GB d'espace disque libre
- Port 27017 disponible (firewall)

---

## 1️⃣ Installation MongoDB sur IONOS VPS

### Étape 1: Connexion SSH

```bash
ssh root@ton-ip-ionos
# ou
ssh ton-user@ton-ip-ionos
```

### Étape 2: Import des clés GPG MongoDB

```bash
# Ubuntu/Debian
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
   --dearmor
```

### Étape 3: Ajouter le repository MongoDB

**Pour Ubuntu 22.04:**
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

**Pour Ubuntu 20.04:**
```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

**Pour Debian 11:**
```bash
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### Étape 4: Installation

```bash
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### Étape 5: Démarrer MongoDB

```bash
# Démarrer le service
sudo systemctl start mongod

# Activer au démarrage
sudo systemctl enable mongod

# Vérifier le statut
sudo systemctl status mongod
```

**✅ MongoDB est maintenant installé!**

---

## 2️⃣ Configuration Sécurisée

### Créer un utilisateur admin

```bash
# Se connecter à MongoDB
mongosh

# Dans le shell MongoDB:
use admin

db.createUser({
  user: "admin",
  pwd: "TON_MOT_DE_PASSE_TRES_SECURISE",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" }, "readWriteAnyDatabase" ]
})

exit
```

### Créer un utilisateur pour l'app

```bash
mongosh

use rapbattle

db.createUser({
  user: "rapbattle_app",
  pwd: "MOT_DE_PASSE_APP_SECURISE",
  roles: [ { role: "readWrite", db: "rapbattle" } ]
})

exit
```

### Activer l'authentification

```bash
sudo nano /etc/mongod.conf
```

Ajouter/modifier ces lignes:
```yaml
security:
  authorization: enabled

net:
  port: 27017
  bindIp: 127.0.0.1  # Pour local uniquement (recommandé si app sur même serveur)
  # bindIp: 0.0.0.0  # Pour accès externe (ATTENTION: ouvrir firewall)
```

Redémarrer MongoDB:
```bash
sudo systemctl restart mongod
```

---

## 3️⃣ Créer la Base de Données

### Se connecter avec auth

```bash
mongosh -u admin -p TON_MOT_DE_PASSE_TRES_SECURISE --authenticationDatabase admin
```

### Créer la BDD et les collections

```javascript
use rapbattle

// Créer les collections
db.createCollection("artists")
db.createCollection("tracks")
db.createCollection("albums")
db.createCollection("collaborations")
db.createCollection("lyrics")
db.createCollection("punchlines")
db.createCollection("producers")

// Créer les index (CRUCIAL pour perfs!)
// Artists
db.artists.createIndex({ spotifyId: 1 }, { unique: true })
db.artists.createIndex({ name: "text", aliases: "text" })
db.artists.createIndex({ "location.department": 1 })
db.artists.createIndex({ "location.city": 1 })
db.artists.createIndex({ monthlyListeners: -1 })
db.artists.createIndex({ popularity: -1 })

// Tracks
db.tracks.createIndex({ spotifyId: 1 }, { unique: true })
db.tracks.createIndex({ artistId: 1 })
db.tracks.createIndex({ "featuring.artistId": 1 })
db.tracks.createIndex({ title: "text", artistName: "text" })
db.tracks.createIndex({ year: 1 })
db.tracks.createIndex({ popularity: -1 })
db.tracks.createIndex({ previewUrl: 1 })

// Albums
db.albums.createIndex({ spotifyId: 1 }, { unique: true })
db.albums.createIndex({ discogsId: 1 }, { sparse: true })
db.albums.createIndex({ artistId: 1 })
db.albums.createIndex({ year: 1 })
db.albums.createIndex({ title: "text", artistName: "text" })

// Collaborations
db.collaborations.createIndex({ artistAId: 1, artistBId: 1 })
db.collaborations.createIndex({ artistBId: 1, artistAId: 1 })
db.collaborations.createIndex({ trackId: 1 })

// Lyrics
db.lyrics.createIndex({ trackId: 1 })
db.lyrics.createIndex({ artistId: 1 })
db.lyrics.createIndex({ snippet: "text", fullLyrics: "text" })
db.lyrics.createIndex({ isPunchline: 1 })

// Punchlines
db.punchlines.createIndex({ artistId: 1 })
db.punchlines.createIndex({ text: "text" })
db.punchlines.createIndex({ popularity: -1 })
db.punchlines.createIndex({ votes: -1 })

// Producers
db.producers.createIndex({ name: 1 })
db.producers.createIndex({ trackId: 1 })
db.producers.createIndex({ artistId: 1 })

print("✅ Base de données 'rapbattle' créée avec tous les index!")
```

---

## 4️⃣ Firewall (si accès externe nécessaire)

**⚠️ Uniquement si tu veux accéder depuis l'extérieur du VPS!**

```bash
# Ouvrir le port MongoDB
sudo ufw allow 27017/tcp

# Ou restreindre à une IP spécifique (RECOMMANDÉ)
sudo ufw allow from TON_IP_LOCALE to any port 27017

# Vérifier
sudo ufw status
```

---

## 5️⃣ Configuration de l'Application

### Modifier `.env.local`

```bash
# MongoDB URI
MONGODB_URI=mongodb://rapbattle_app:MOT_DE_PASSE_APP_SECURISE@localhost:27017/rapbattle

# Ou si accès distant:
MONGODB_URI=mongodb://rapbattle_app:MOT_DE_PASSE_APP_SECURISE@ton-ip-ionos:27017/rapbattle
```

### Tester la connexion

Créer un fichier `test-mongo.js`:
```javascript
const { MongoClient } = require('mongodb');

const uri = "mongodb://rapbattle_app:MOT_DE_PASSE_APP_SECURISE@localhost:27017/rapbattle";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connexion MongoDB réussie!");

    const db = client.db("rapbattle");
    const collections = await db.listCollections().toArray();
    console.log("📚 Collections:", collections.map(c => c.name));

  } finally {
    await client.close();
  }
}

run().catch(console.dir);
```

Exécuter:
```bash
node test-mongo.js
```

---

## 6️⃣ Backup Automatique

Créer un script de backup quotidien:

```bash
sudo nano /usr/local/bin/backup-mongodb.sh
```

Contenu:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/mongodb"
mkdir -p $BACKUP_DIR

# Dump
mongodump --uri="mongodb://admin:TON_MOT_DE_PASSE_TRES_SECURISE@localhost:27017/rapbattle?authSource=admin" --out="$BACKUP_DIR/backup_$DATE"

# Garder seulement les 7 derniers backups
cd $BACKUP_DIR && ls -t | tail -n +8 | xargs rm -rf

echo "✅ Backup MongoDB complété: backup_$DATE"
```

Rendre exécutable:
```bash
sudo chmod +x /usr/local/bin/backup-mongodb.sh
```

Ajouter au cron (quotidien à 3h du matin):
```bash
sudo crontab -e
```

Ajouter:
```
0 3 * * * /usr/local/bin/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## 7️⃣ Monitoring

### Voir les stats

```bash
mongosh -u admin -p --authenticationDatabase admin

use rapbattle

// Stats de la BDD
db.stats()

// Compter les documents
db.artists.countDocuments()
db.tracks.countDocuments()
db.collaborations.countDocuments()

// Taille des collections
db.artists.stats().size
db.tracks.stats().size
```

### Logs MongoDB

```bash
# Voir les logs
sudo tail -f /var/log/mongodb/mongod.log

# Logs d'erreur seulement
sudo grep ERROR /var/log/mongodb/mongod.log
```

---

## 8️⃣ Performance Tuning

### Augmenter le cache size (si > 4GB RAM)

```bash
sudo nano /etc/mongod.conf
```

Ajouter:
```yaml
storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2  # 50% de ta RAM disponible
```

Redémarrer:
```bash
sudo systemctl restart mongod
```

---

## ✅ Checklist Finale

- [ ] MongoDB installé et démarré
- [ ] Utilisateur admin créé
- [ ] Utilisateur app créé
- [ ] Authentification activée
- [ ] Base `rapbattle` créée
- [ ] Tous les index créés
- [ ] Firewall configuré (si nécessaire)
- [ ] `.env.local` mis à jour
- [ ] Connexion testée
- [ ] Backup automatique configuré

---

## 🚀 Prochaine Étape

Une fois MongoDB configuré, lance le **script de crawling** pour remplir la BDD avec 100k+ données:

```bash
npm run crawl
```

Voir `scripts/crawl-rap-data.js` pour plus de détails.

---

## 🆘 Troubleshooting

### MongoDB ne démarre pas
```bash
sudo systemctl status mongod
sudo journalctl -u mongod
```

### Problème d'authentification
```bash
# Vérifier les users
mongosh
use admin
db.getUsers()
```

### Connexion refusée
```bash
# Vérifier que MongoDB écoute
sudo netstat -tuln | grep 27017
```

### Espace disque plein
```bash
# Vérifier l'espace
df -h

# Compacter la BDD
mongosh -u admin -p --authenticationDatabase admin
use rapbattle
db.runCommand({ compact: 'artists' })
db.runCommand({ compact: 'tracks' })
```
