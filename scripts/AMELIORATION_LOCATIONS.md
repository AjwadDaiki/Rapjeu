# 🌍 Amélioration de la détection de localisation

## Problème

Le mode "Devine Qui" nécessite l'origine géographique des artistes comme indice.

Actuellement, le crawler détecte la localisation via des regex dans la bio Last.fm.
**Taux de succès estimé: 40-60%**

## Solution 1: Saisie manuelle pour top artistes (RECOMMANDÉ)

Créer un fichier `artist-locations-manual.json` avec les localisations des 100 top artistes:

```json
{
  "0VBc83GX4gb0l2sEfkLVWC": {
    "department": "92",
    "city": "Boulogne-Billancourt",
    "country": "FR",
    "displayName": "Boulogne (92)"
  },
  "1EjVjU6dG4n3k7Fje03L3E": {
    "department": "91",
    "city": "Corbeil-Essonnes",
    "country": "FR",
    "displayName": "Corbeil (91)"
  },
  "6LuN9FCkKOtWwN1qSd9GxI": {
    "department": "91",
    "city": "Longjumeau",
    "country": "FR",
    "displayName": "Longjumeau (91)"
  },
  "5E4f6QYMjZQqtQG3VdPE9j": {
    "department": "13",
    "city": "Marseille",
    "country": "FR",
    "displayName": "Marseille (13)"
  }
  // ... 96 autres
}
```

### Top 100 à documenter:

1. Booba → Boulogne (92)
2. PNL → Corbeil (91)
3. Ninho → Longjumeau (91)
4. SCH → Marseille (13)
5. Jul → Marseille (13)
6. Niska → Évry (91)
7. Kaaris → Sevran (93)
8. Damso → Bruxelles (Belgique)
9. Orelsan → Caen (14)
10. Nekfeu → Paris (75)
11. Freeze Corleone → Paris (75)
12. Alpha Wann → Paris (75)
13. Laylow → Toulouse (31)
14. Hamza → Bruxelles (Belgique)
15. Lomepal → Paris (75)
16. Rim'K → Paris (75)
17. Sofiane → Paris (75)
18. Koba LaD → Évry (91)
19. Gazo → Sevran (93)
20. Tiakola → Paris (75)
21. SDM → Creil (60)
22. Zola → Évry (91)
23. Maes → Sevran (93)
24. Soolking → Alger (Algérie)
25. Gradur → Roubaix (59)
26. Lacrim → Paris (75)
27. Kalash Criminel → Sevran (93)
28. Heuss L'Enfoiré → Paris (75)
29. PLK → Paris (75)
30. Leto → Paris (75)
31. Bramsito → Villeurbanne (69)
32. Alonzo → Marseille (13)
33. Soso Maness → Marseille (13)
34. Soprano → Marseille (13)
35. Naps → Marseille (13)
36. L'Algerino → Marseille (13)
37. Farruko → Puerto Rico
38. Djadja & Dinaz → Meaux (77)
39. MHD → Paris (75)
40. Dinos → Alfortville (94)

... (continuer jusqu'à 100)

### Intégration dans le crawler:

```javascript
// crawl-OVERNIGHT.js - Ajouter après ligne 340

const fs = require('fs');
const manualLocations = JSON.parse(fs.readFileSync('./artist-locations-manual.json', 'utf8'));

// Vérifier si location manuelle existe
if (manualLocations[artist.id]) {
  location = manualLocations[artist.id];
  console.log(`      📍 Location manuelle: ${location.displayName}`);
}
```

## Solution 2: Plus de patterns dans les regex

Ajouter dans `crawl-OVERNIGHT.js` ligne 172:

```javascript
const patterns = {
  // Départements IDF
  '91': /91|Essonne|Évry|Corbeil|Longjumeau|Sainte-Geneviève|Yerres|Athis-Mons/i,
  '92': /92|Hauts-de-Seine|Boulogne|Nanterre|Courbevoie|Levallois|Neuilly|Colombes/i,
  '93': /93|Seine-Saint-Denis|Sevran|Bondy|Montreuil|Bobigny|Aulnay|Pantin|Drancy|Noisy-le-Grand/i,
  '94': /94|Val-de-Marne|Créteil|Ivry|Vitry|Champigny|Saint-Maur|Fontenay|Alfortville/i,
  '95': /95|Val-d'Oise|Argenteuil|Cergy|Sarcelles|Garges|Pontoise|Bezons/i,
  '75': /Paris|75|capitale|parisien/i,

  // Autres grandes villes
  '13': /Marseille|13|Bouches-du-Rhône|phocéen|phocéenne|cité phocéenne/i,
  '69': /Lyon|69|Rhône|lyonnais|Villeurbanne/i,
  '59': /Lille|59|Nord|lillois|Roubaix|Tourcoing/i,
  '33': /Bordeaux|33|Gironde|bordelais/i,
  '31': /Toulouse|31|Haute-Garonne|toulousain/i,
  '44': /Nantes|44|Loire-Atlantique|nantais/i,
  '67': /Strasbourg|67|Bas-Rhin|strasbourgeois/i,
  '06': /Nice|06|Alpes-Maritimes|niçois|Cannes|Antibes/i,
  '14': /Caen|14|Calvados|Normandie/i,
  '77': /Seine-et-Marne|77|Meaux|Melun|Fontainebleau/i,
  '60': /Oise|60|Creil|Beauvais|Compiègne/i,

  // Pays étrangers
  'BE': /Bruxelles|Belgique|belge|Anvers/i,
  'DZ': /Alger|Algérie|algérien|Oran|Constantine/i,
  'MA': /Maroc|marocain|Casablanca|Rabat/i,
  'SN': /Dakar|Sénégal|sénégalais/i,
  'CM': /Cameroun|camerounais|Yaoundé|Douala/i,
  'CD': /Congo|Kinshasa|congolais/i,
};
```

## Solution 3: Wikidata API (AVANCÉ)

Pour les artistes sans location détectée, interroger Wikidata:

```javascript
async function getLocationFromWikidata(artistName) {
  const query = `
    SELECT ?item ?birthPlace ?birthPlaceLabel WHERE {
      ?item wdt:P31 wd:Q5 .
      ?item rdfs:label "${artistName}"@fr .
      ?item wdt:P19 ?birthPlace .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "fr" }
    }
    LIMIT 1
  `;

  const url = 'https://query.wikidata.org/sparql';
  const response = await axios.get(url, {
    params: { query, format: 'json' },
    headers: { 'User-Agent': 'RapBattle/1.0' }
  });

  const bindings = response.data?.results?.bindings || [];
  if (bindings.length > 0) {
    return bindings[0].birthPlaceLabel?.value;
  }

  return null;
}
```

## Solution 4: Fallback pour Devine Qui

Si un artiste n'a pas de location, le mode Devine Qui peut:

1. **Masquer complètement l'indice "Origine"** jusqu'à un certain nombre d'essais
2. **Afficher "France"** comme fallback générique
3. **Révéler progressivement:** "Europe" → "France" → "Île-de-France" → "92"
4. **Ne pas sélectionner cet artiste** pour Devine Qui (filtrer en amont)

Exemple d'implémentation dans le serveur de jeu:

```typescript
// Lors de la sélection d'un artiste pour Devine Qui
const validArtists = await artistsCol.find({
  isTopArtist: true,
  'location.department': { $exists: true, $ne: null }  // Obligatoire!
}).toArray();
```

## Recommandation finale

**Combiner Solution 1 + Solution 2 + Solution 4:**

1. ✅ Saisir manuellement les top 100 artistes (1-2h de travail)
2. ✅ Améliorer les regex pour détecter plus de villes
3. ✅ Pour Devine Qui, ne sélectionner QUE les artistes avec location valide
4. 💡 En bonus: Ajouter Wikidata pour les artistes manquants (optionnel)

Cela garantit:
- **100% de couverture pour les top 100** (les plus joués)
- **70-80% de couverture globale** (grâce aux regex améliorées)
- **0% d'erreurs dans Devine Qui** (filtrage strict)

## Fichier de démarrage

Créer `artist-locations-manual.json` avec au minimum les 20 top artistes:

```json
{
  "0VBc83GX4gb0l2sEfkLVWC": { "department": "92", "city": "Boulogne-Billancourt", "country": "FR", "displayName": "Boulogne (92)" },
  "1EjVjU6dG4n3k7Fje03L3E": { "department": "91", "city": "Corbeil-Essonnes", "country": "FR", "displayName": "Corbeil (91)" },
  "6LuN9FCkKOtWwN1qSd9GxI": { "department": "91", "city": "Longjumeau", "country": "FR", "displayName": "Longjumeau (91)" },
  "5E4f6QYMjZQqtQG3VdPE9j": { "department": "13", "city": "Marseille", "country": "FR", "displayName": "Marseille (13)" },
  "6fcTRFPq8YC3Ah0rKKWJcw": { "department": "13", "city": "Marseille", "country": "FR", "displayName": "Marseille (13)" },
  "comment": "Continuer avec les 95 autres top artistes..."
}
```

Puis l'intégrer au crawler comme montré ci-dessus.
