// ============================================
// BASE DE DONNÉES ARTISTES - RAP FR & US
// Graph de featurings pour Roland Gamos (VRAI)
// CORRECTIONS: départements exacts, villes réelles
// ============================================

export interface Artist {
  id: string;
  name: string;
  aliases: string[];
  department?: string;
  city?: string;
  country: 'FR' | 'US';
  crews: string[];
  labels: string[];
  albums: AlbumEntry[];
  era: ('90s' | '2000s' | '2010s' | '2020s')[];
  popularity: number;
}

export interface AlbumEntry {
  title: string;
  year: number;
  aliases: string[];
  coverUrl?: string;
}

export interface FeaturingLink {
  artistA: string;
  artistB: string;
  track: string;
  year?: number;
}

// ARTISTES FR (départements corrigés)
export const ARTISTS_FR: Artist[] = [
  {
    id: 'booba',
    name: 'Booba',
    aliases: ['B2O', 'Kopp', 'Le Duc', 'Elie Yaffa', 'B2OBA'],
    department: '92',
    city: 'Boulogne-Billancourt',
    country: 'FR',
    crews: ['Lunatic', '92i'],
    labels: ['92i', 'Tallac Records'],
    albums: [
      { title: 'Temps mort', year: 2002, aliases: [] },
      { title: 'Panthéon', year: 2004, aliases: [] },
      { title: 'Ouest Side', year: 2006, aliases: ['OS'] },
      { title: '0.9', year: 2008, aliases: [] },
      { title: 'Futur', year: 2012, aliases: [] },
      { title: 'Trône', year: 2017, aliases: [] },
      { title: 'Ultra', year: 2021, aliases: [] },
    ],
    era: ['2000s', '2010s', '2020s'],
    popularity: 95,
  },
  {
    id: 'kaaris',
    name: 'Kaaris',
    aliases: ['Okou Gnakouri', 'Gnakouri', 'Le Binks'],
    department: '93',
    city: 'Sevran',
    country: 'FR',
    crews: [],
    labels: ['Therapy Music'],
    albums: [
      { title: 'Or Noir', year: 2013, aliases: [] },
      { title: 'Le bruit de mon âme', year: 2015, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 80,
  },
  {
    id: 'ninho',
    name: 'Ninho',
    aliases: ['N.I', 'NI'],
    department: '91',
    city: 'Évry',
    country: 'FR',
    crews: [],
    labels: ['Mal Luné Music', 'Rec. 118'],
    albums: [
      { title: 'Comme prévu', year: 2017, aliases: [] },
      { title: 'M.I.L.S', year: 2017, aliases: ['MILS'] },
      { title: 'Destin', year: 2019, aliases: [] },
      { title: 'Jefe', year: 2021, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 93,
  },
  {
    id: 'damso',
    name: 'Damso',
    aliases: ['Dems', 'William Kalubi'],
    department: undefined,
    city: 'Bruxelles',
    country: 'FR',
    crews: ['92i'],
    labels: ['92i', 'Universal'],
    albums: [
      { title: 'Batterie faible', year: 2016, aliases: [] },
      { title: 'Ipséité', year: 2017, aliases: [] },
      { title: 'QALF', year: 2020, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 92,
  },
  {
    id: 'sch',
    name: 'SCH',
    aliases: ['Julien Schwarzer'],
    department: '13',
    city: 'Marseille',
    country: 'FR',
    crews: [],
    labels: ['Music Music'],
    albums: [
      { title: 'A7', year: 2015, aliases: [] },
      { title: 'Anarchie', year: 2016, aliases: [] },
      { title: 'JVLIVS', year: 2019, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 90,
  },
  {
    id: 'jul',
    name: 'Jul',
    aliases: ['Julien Mari', 'Liga One', 'Le J'],
    department: '13',
    city: 'Marseille',
    country: 'FR',
    crews: [],
    labels: ['Liga One Industry'],
    albums: [
      { title: 'Dans ma paranoïa', year: 2014, aliases: [] },
      { title: 'My World', year: 2015, aliases: [] },
      { title: 'La machine', year: 2018, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 93,
  },
  {
    id: 'alonzo',
    name: 'Alonzo',
    aliases: ['Zo', 'Alonzo Psy 4'],
    department: '13',
    city: 'Marseille',
    country: 'FR',
    crews: ['Psy 4 de la Rime'],
    labels: ['Dor et de platine'],
    albums: [
      { title: 'Amour, Gloire et Cité', year: 2014, aliases: ['AGC'] },
      { title: 'Stone', year: 2021, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 72,
  },
  {
    id: 'nekfeu',
    name: 'Nekfeu',
    aliases: ['Nek', 'Ken Samaras'],
    department: '75',
    city: 'Paris',
    country: 'FR',
    crews: ['Entourage', 'S-Crew', '1995'],
    labels: ['Seine Zoo'],
    albums: [
      { title: 'Feu', year: 2015, aliases: [] },
      { title: 'Cyborg', year: 2016, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 88,
  },
  {
    id: 'orelsan',
    name: 'Orelsan',
    aliases: ['Orel', 'Aurélien Cotentin'],
    department: '14',
    city: 'Caen',
    country: 'FR',
    crews: ['Casseurs Flowters'],
    labels: ['7th Magnitude'],
    albums: [
      { title: 'Le chant des sirènes', year: 2011, aliases: [] },
      { title: 'La fête est finie', year: 2017, aliases: [] },
      { title: 'Civilisation', year: 2021, aliases: [] },
    ],
    era: ['2000s', '2010s', '2020s'],
    popularity: 90,
  },
];

// ARTISTES US
export const ARTISTS_US: Artist[] = [
  {
    id: 'drake',
    name: 'Drake',
    aliases: ['Drizzy', '6 God', 'Aubrey Graham'],
    city: 'Toronto',
    country: 'US',
    crews: ['OVO'],
    labels: ['OVO Sound'],
    albums: [
      { title: 'Take Care', year: 2011, aliases: [] },
      { title: 'Nothing Was the Same', year: 2013, aliases: [] },
      { title: 'Views', year: 2016, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 98,
  },
  {
    id: 'kendrick',
    name: 'Kendrick Lamar',
    aliases: ['K-Dot', 'Kung Fu Kenny'],
    city: 'Compton',
    country: 'US',
    crews: ['TDE'],
    labels: ['TDE'],
    albums: [
      { title: 'good kid, m.A.A.d city', year: 2012, aliases: ['GKMC'] },
      { title: 'To Pimp a Butterfly', year: 2015, aliases: ['TPAB'] },
      { title: 'DAMN.', year: 2017, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 96,
  },
  {
    id: 'jayz',
    name: 'Jay-Z',
    aliases: ['Hova', 'Jigga', 'Shawn Carter'],
    city: 'New York',
    country: 'US',
    crews: ['Roc-A-Fella'],
    labels: ['Roc Nation'],
    albums: [
      { title: 'The Blueprint', year: 2001, aliases: [] },
      { title: 'The Black Album', year: 2003, aliases: [] },
    ],
    era: ['90s', '2000s', '2010s'],
    popularity: 92,
  },
  {
    id: 'kanye',
    name: 'Kanye West',
    aliases: ['Ye', 'Yeezy'],
    city: 'Chicago',
    country: 'US',
    crews: ['GOOD Music'],
    labels: ['Def Jam'],
    albums: [
      { title: 'The College Dropout', year: 2004, aliases: [] },
      { title: 'Late Registration', year: 2005, aliases: [] },
      { title: 'My Beautiful Dark Twisted Fantasy', year: 2010, aliases: ['MBDTF'] },
    ],
    era: ['2000s', '2010s', '2020s'],
    popularity: 95,
  },
  {
    id: 'eminem',
    name: 'Eminem',
    aliases: ['Slim Shady', 'Marshall Mathers'],
    city: 'Detroit',
    country: 'US',
    crews: ['D12'],
    labels: ['Shady Records'],
    albums: [
      { title: 'The Slim Shady LP', year: 1999, aliases: [] },
      { title: 'The Marshall Mathers LP', year: 2000, aliases: [] },
    ],
    era: ['90s', '2000s', '2010s'],
    popularity: 94,
  },
  {
    id: 'travis',
    name: 'Travis Scott',
    aliases: ['La Flame', 'Cactus Jack'],
    city: 'Houston',
    country: 'US',
    crews: ['Cactus Jack'],
    labels: ['Epic'],
    albums: [
      { title: 'Rodeo', year: 2015, aliases: [] },
      { title: 'Astroworld', year: 2018, aliases: [] },
    ],
    era: ['2010s', '2020s'],
    popularity: 93,
  },
];

// FEATURINGS - Graph de collaborations
export const FEATURINGS: FeaturingLink[] = [
  // BOOBA
  { artistA: 'booba', artistB: 'kaaris', track: 'Kalash', year: 2012 },
  { artistA: 'booba', artistB: 'damso', track: 'Pinocchio', year: 2017 },
  { artistA: 'booba', artistB: 'sch', track: 'Rolex', year: 2022 },
  { artistA: 'booba', artistB: 'ninho', track: 'Coffre plein', year: 2020 },
  { artistA: 'booba', artistB: 'niska', track: 'Médicament', year: 2016 },
  
  // DAMSO
  { artistA: 'damso', artistB: 'orelsan', track: 'Maison', year: 2017 },
  { artistA: 'damso', artistB: 'nekfeu', track: 'Macarena', year: 2016 },
  { artistA: 'damso', artistB: 'sch', track: 'Mannschaft', year: 2022 },
  
  // SCH
  { artistA: 'sch', artistB: 'jul', track: 'La Bandite', year: 2019 },
  { artistA: 'sch', artistB: 'ninho', track: 'Carbozo', year: 2021 },
  { artistA: 'sch', artistB: 'alonzo', track: 'Tout va bien', year: 2021 },
  
  // US
  { artistA: 'drake', artistB: 'travis', track: 'Sicko Mode', year: 2018 },
  { artistA: 'drake', artistB: 'kanye', track: 'Forever', year: 2009 },
  { artistA: 'drake', artistB: 'jayz', track: 'Pound Cake', year: 2013 },
  { artistA: 'kendrick', artistB: 'jayz', track: 'Bitch Dont Kill My Vibe', year: 2013 },
  { artistA: 'kendrick', artistB: 'drake', track: 'Poetic Justice', year: 2012 },
  { artistA: 'jayz', artistB: 'kanye', track: 'Otis', year: 2011 },
  { artistA: 'kanye', artistB: 'jayz', track: 'N***** in Paris', year: 2011 },
  { artistA: 'travis', artistB: 'kendrick', track: 'goosebumps', year: 2016 },
];

export const ALL_ARTISTS: Artist[] = [...ARTISTS_FR, ...ARTISTS_US];

// UTILITAIRES GRAPH
let _adjacencyMap: Map<string, Set<string>> | null = null;

function buildAdjacencyMap(): Map<string, Set<string>> {
  if (_adjacencyMap) return _adjacencyMap;
  _adjacencyMap = new Map();
  
  for (const feat of FEATURINGS) {
    if (!_adjacencyMap.has(feat.artistA)) _adjacencyMap.set(feat.artistA, new Set());
    if (!_adjacencyMap.has(feat.artistB)) _adjacencyMap.set(feat.artistB, new Set());
    _adjacencyMap.get(feat.artistA)!.add(feat.artistB);
    _adjacencyMap.get(feat.artistB)!.add(feat.artistA);
  }
  return _adjacencyMap;
}

export function getFeaturingPartners(artistId: string): string[] {
  const map = buildAdjacencyMap();
  const partners = map.get(artistId);
  return partners ? Array.from(partners) : [];
}

export function hasFeaturingWith(artistA: string, artistB: string): boolean {
  const map = buildAdjacencyMap();
  const partners = map.get(artistA);
  return partners ? partners.has(artistB) : false;
}

export function getGoodStartingArtists(minFeats: number = 3): Artist[] {
  const map = buildAdjacencyMap();
  return ALL_ARTISTS.filter(a => {
    const partners = map.get(a.id);
    return partners && partners.size >= minFeats;
  });
}

export function resolveArtistByName(input: string): Artist | null {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!normalized) return null;

  for (const artist of ALL_ARTISTS) {
    const names = [artist.name, ...artist.aliases];
    for (const name of names) {
      const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (norm === normalized) return artist;
    }
  }
  return null;
}
