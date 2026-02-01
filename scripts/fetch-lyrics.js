#!/usr/bin/env node

// ============================================
// FETCH LYRICS - Récupère les textes depuis Genius
// À lancer APRÈS le crawler principal
// Usage: node scripts/fetch-lyrics.js [--limit 200]
// ============================================
// Scrape les pages Genius pour extraire les lyrics
// Stocke dans la collection 'lyrics'
// Utilisé pour le mode "Continue les paroles"
// ============================================

const { MongoClient } = require('mongodb');
const axios = require('axios');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/rapbattle';
const GENIUS_ACCESS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

const SCRAPE_DELAY = 1500;  // 1.5s entre chaque page Genius (respectueux)
const BATCH_SIZE = 50;       // Traiter par lots de 50

// ==========================================
// GENIUS LYRICS SCRAPING
// ==========================================

/**
 * Récupère les lyrics depuis une page Genius
 * Genius utilise <div data-lyrics-container="true"> pour les paroles
 */
async function scrapeLyricsFromGenius(geniusUrl) {
  try {
    const response = await axios.get(geniusUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      timeout: 20000,
    });

    const html = response.data;

    // Méthode 1: data-lyrics-container (nouveau format Genius)
    const containerRegex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
    let lyrics = '';
    let match;

    while ((match = containerRegex.exec(html)) !== null) {
      let chunk = match[1];
      // Remplacer <br> par des sauts de ligne
      chunk = chunk.replace(/<br\s*\/?>/gi, '\n');
      // Supprimer les balises HTML
      chunk = chunk.replace(/<[^>]+>/g, '');
      // Décoder les entités HTML
      chunk = decodeHTMLEntities(chunk);
      lyrics += chunk + '\n';
    }

    // Méthode 2: fallback - chercher dans Lyrics__Container
    if (!lyrics.trim()) {
      const fallbackRegex = /class="Lyrics__Container[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
      while ((match = fallbackRegex.exec(html)) !== null) {
        let chunk = match[1];
        chunk = chunk.replace(/<br\s*\/?>/gi, '\n');
        chunk = chunk.replace(/<[^>]+>/g, '');
        chunk = decodeHTMLEntities(chunk);
        lyrics += chunk + '\n';
      }
    }

    if (!lyrics.trim()) return null;

    // Nettoyer
    lyrics = lyrics
      .replace(/\[.*?\]/g, '\n')         // Supprimer les annotations [Couplet 1], [Refrain], etc.
      .replace(/\n{3,}/g, '\n\n')         // Max 2 sauts de ligne consécutifs
      .trim();

    return lyrics;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 429) {
      console.warn(`   ⏳ Genius bloqué (${error.response.status}), attente 30s...`);
      await new Promise(r => setTimeout(r, 30000));
      return null;
    }
    return null;
  }
}

function decodeHTMLEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ');
}

/**
 * Extrait des snippets mémorables pour le mode "Continue les paroles"
 * Sélectionne des paires de lignes consécutives (question + réponse)
 */
function extractLyricsSnippets(fullLyrics, artistName, trackTitle) {
  const lines = fullLyrics
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 10 && l.length < 200);  // Lignes de taille raisonnable

  if (lines.length < 4) return [];

  const snippets = [];

  // Prendre des paires de lignes consécutives
  for (let i = 0; i < lines.length - 1; i++) {
    const prompt = lines[i];
    const answer = lines[i + 1];

    // Filtrer les lignes trop courtes ou répétitives
    if (prompt.length < 15 || answer.length < 15) continue;
    if (prompt === answer) continue;
    // Éviter les lignes qui sont juste des ad-libs ou des interjections
    if (/^(yeah|oh|ah|uh|hey|woo|ayy|skrt|brr|gang|pew)/i.test(prompt)) continue;
    if (/^(yeah|oh|ah|uh|hey|woo|ayy|skrt|brr|gang|pew)/i.test(answer)) continue;

    snippets.push({
      prompt,
      answer,
      lineIndex: i,
      artistName,
      trackTitle,
    });
  }

  // Limiter à 5-10 snippets par track (les meilleurs)
  // Préférer les lignes du milieu (souvent plus mémorables que l'intro)
  const midStart = Math.floor(snippets.length * 0.2);
  const midEnd = Math.floor(snippets.length * 0.8);
  const midSnippets = snippets.slice(midStart, midEnd);

  // Prendre max 8 snippets bien répartis
  const step = Math.max(1, Math.floor(midSnippets.length / 8));
  const selected = [];
  for (let i = 0; i < midSnippets.length && selected.length < 8; i += step) {
    selected.push(midSnippets[i]);
  }

  return selected;
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.indexOf('--limit');
  const limit = limitArg !== -1 ? parseInt(args[limitArg + 1]) || 200 : 200;

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║        📝 FETCH LYRICS (Genius Scraping)                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  if (!GENIUS_ACCESS_TOKEN) {
    console.error('❌ GENIUS_ACCESS_TOKEN manquant dans .env');
    process.exit(1);
  }

  console.log(`📊 Limite: ${limit} tracks\n`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connecté à MongoDB\n');

    const db = client.db();
    const tracksCol = db.collection('tracks');
    const lyricsCol = db.collection('lyrics');

    // Créer index
    await lyricsCol.createIndex({ trackId: 1 }, { unique: true });
    await lyricsCol.createIndex({ artistName: 1 });
    await lyricsCol.createIndex({ popularity: -1 });

    // Tracks avec Genius URL, triées par popularité, pas encore scrapées
    const existingLyricsIds = await lyricsCol.distinct('trackId');

    const tracksToScrape = await tracksCol
      .find({
        geniusUrl: { $ne: null, $exists: true },
        spotifyId: { $nin: existingLyricsIds },
      })
      .sort({ popularity: -1 })
      .limit(limit)
      .toArray();

    console.log(`🎵 ${tracksToScrape.length} tracks à scraper\n`);

    if (tracksToScrape.length === 0) {
      console.log('✅ Toutes les lyrics ont déjà été récupérées!');
      return;
    }

    let scraped = 0;
    let failed = 0;
    let snippetsTotal = 0;

    for (let i = 0; i < tracksToScrape.length; i++) {
      const track = tracksToScrape[i];

      await new Promise(r => setTimeout(r, SCRAPE_DELAY));

      const lyrics = await scrapeLyricsFromGenius(track.geniusUrl);

      if (lyrics) {
        // Extraire les snippets pour "Continue les paroles"
        const snippets = extractLyricsSnippets(lyrics, track.artistName, track.title);

        await lyricsCol.updateOne(
          { trackId: track.spotifyId },
          {
            $set: {
              trackId: track.spotifyId,
              trackTitle: track.title,
              artistId: track.artistId,
              artistName: track.artistName,
              albumName: track.albumName || null,
              geniusUrl: track.geniusUrl,
              popularity: track.popularity || 0,

              fullLyrics: lyrics,
              lyricsLength: lyrics.length,
              lineCount: lyrics.split('\n').filter(l => l.trim()).length,

              // Snippets pour "Continue les paroles"
              snippets,
              snippetCount: snippets.length,

              scrapedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        scraped++;
        snippetsTotal += snippets.length;

        const linesCount = lyrics.split('\n').filter(l => l.trim()).length;
        console.log(`   ✅ ${scraped}. ${track.artistName} - ${track.title} (${linesCount} lignes, ${snippets.length} snippets, pop: ${track.popularity})`);
      } else {
        failed++;
        console.log(`   ❌ ${track.artistName} - ${track.title} (scraping échoué)`);
      }

      // Progress
      if ((i + 1) % 25 === 0) {
        console.log(`\n   📈 Progress: ${i + 1}/${tracksToScrape.length} | OK: ${scraped} | Failed: ${failed} | Snippets: ${snippetsTotal}\n`);
      }
    }

    // Stats finales
    const totalLyrics = await lyricsCol.countDocuments();
    const totalSnippets = await lyricsCol.aggregate([
      { $group: { _id: null, total: { $sum: '$snippetCount' } } }
    ]).toArray();

    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║               📊 RÉSULTATS                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log(`   Scrapées     : ${scraped}`);
    console.log(`   Échouées     : ${failed}`);
    console.log(`   Total en BDD : ${totalLyrics}`);
    console.log(`   Snippets     : ${totalSnippets[0]?.total || snippetsTotal}`);
    console.log();

    if (totalLyrics >= 50) {
      console.log('   ✅ Mode "Continue les paroles" PRÊT!\n');
    } else {
      console.log(`   ⚠️  Besoin de plus de lyrics. Relance avec --limit ${limit + 200}\n`);
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await client.close();
    console.log('✅ Déconnecté de MongoDB');
  }
}

main().catch(console.error);
