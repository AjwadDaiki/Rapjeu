// ============================================
// TYPES COMMUNS POUR LES APIs
// ============================================

export interface Track {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  previewUrl: string | null;
  coverUrl: string | null;
  duration: number;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  bio?: string;
  listeners?: number;
  playcount?: number;
}

export interface Album {
  id: string;
  name: string;
  artistName: string;
  coverUrl: string | null;
  year?: number;
}

// Pour le Blind Test
export interface BlindTestTrack extends Track {
  // Pour éviter les doublons dans une partie
  usedInRound?: boolean;
}

// Pour le Pixel Cover
export interface PixelCoverItem {
  id: string;
  imageUrl: string;
  artistName: string;
  albumName?: string;
  // Pour le floutage progressif
  blurLevels?: number[];
}
