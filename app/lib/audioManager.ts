// ============================================
// AUDIO MANAGER - Howler.js Integration
// Gère tous les sons du jeu (SFX + music previews)
// ============================================

import { Howl, Howler } from 'howler';

export type SoundEffect =
  | 'combo2x'
  | 'combo3x'
  | 'critical_hit'
  | 'normal_hit'
  | 'victory'
  | 'defeat'
  | 'tick'
  | 'buzz'
  | 'wrong'
  | 'correct';

class AudioManager {
  private sfxSprite: Howl | null = null;
  private musicPlayer: Howl | null = null;
  private volume: number = 0.7;
  private muted: boolean = false;

  constructor() {
    this.loadSFXSprite();
    this.loadVolumeFromStorage();
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================

  private loadSFXSprite(): void {
    // TODO: Create audio sprite with all SFX
    // For now, we'll use individual sounds
    // this.sfxSprite = new Howl({
    //   src: ['/sounds/sfx-sprite.webm', '/sounds/sfx-sprite.mp3'],
    //   sprite: {
    //     combo2x: [0, 500],
    //     combo3x: [500, 700],
    //     // ...
    //   }
    // });
  }

  private loadVolumeFromStorage(): void {
    if (typeof window !== 'undefined') {
      const savedVolume = localStorage.getItem('game_volume');
      const savedMuted = localStorage.getItem('game_muted');

      if (savedVolume) this.volume = parseFloat(savedVolume);
      if (savedMuted) this.muted = savedMuted === 'true';

      Howler.volume(this.muted ? 0 : this.volume);
    }
  }

  // ==========================================
  // SFX PLAYBACK
  // ==========================================

  playSFX(effect: SoundEffect): void {
    if (this.muted) return;

    try {
      const sound = new Howl({
        src: [`/sounds/${effect}.mp3`, `/sounds/${effect}.webm`, `/sounds/${effect}.ogg`],
        volume: this.volume,
        onloaderror: (id, error) => {
          console.warn(`⚠️ Could not load SFX: ${effect}`, error);
        },
      });
      sound.play();
    } catch (error) {
      console.warn(`⚠️ Error playing SFX: ${effect}`, error);
    }
  }

  playComboSound(comboLevel: number): void {
    if (comboLevel === 2) this.playSFX('combo2x');
    else if (comboLevel >= 3) this.playSFX('combo3x');
  }

  playDamageSound(damage: number): void {
    if (damage >= 20) this.playSFX('critical_hit');
    else this.playSFX('normal_hit');
  }

  playCorrectSound(): void {
    this.playSFX('correct');
  }

  playWrongSound(): void {
    this.playSFX('wrong');
  }

  playVictorySound(): void {
    this.playSFX('victory');
  }

  playDefeatSound(): void {
    this.playSFX('defeat');
  }

  playTickSound(): void {
    this.playSFX('tick');
  }

  playBuzzSound(): void {
    this.playSFX('buzz');
  }

  // ==========================================
  // MUSIC PREVIEW (Blind Test)
  // ==========================================

  playMusicPreview(url: string, duration: number = 30000): Promise<void> {
    return new Promise((resolve, reject) => {
      // Stop any currently playing music
      this.stopMusicPreview();

      this.musicPlayer = new Howl({
        src: [url],
        html5: true, // Force HTML5 for streaming
        volume: this.muted ? 0 : this.volume,
        onload: () => {
          console.log('🎵 Music loaded successfully');
          resolve();
        },
        onloaderror: (id, error) => {
          console.error('❌ Music load failed:', error);
          reject(error);
        },
        onplay: () => {
          console.log('▶️ Music playing');
        },
        onend: () => {
          console.log('⏹️ Music ended');
          this.musicPlayer = null;
        },
      });

      this.musicPlayer.play();

      // Auto-stop after duration
      setTimeout(() => {
        this.stopMusicPreview();
      }, duration);
    });
  }

  stopMusicPreview(): void {
    if (this.musicPlayer) {
      this.musicPlayer.stop();
      this.musicPlayer.unload();
      this.musicPlayer = null;
    }
  }

  pauseMusicPreview(): void {
    if (this.musicPlayer) {
      this.musicPlayer.pause();
    }
  }

  resumeMusicPreview(): void {
    if (this.musicPlayer) {
      this.musicPlayer.play();
    }
  }

  // ==========================================
  // VOLUME CONTROLS
  // ==========================================

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.muted ? 0 : this.volume);

    if (typeof window !== 'undefined') {
      localStorage.setItem('game_volume', this.volume.toString());
    }
  }

  getVolume(): number {
    return this.volume;
  }

  mute(): void {
    this.muted = true;
    Howler.volume(0);

    if (typeof window !== 'undefined') {
      localStorage.setItem('game_muted', 'true');
    }
  }

  unmute(): void {
    this.muted = false;
    Howler.volume(this.volume);

    if (typeof window !== 'undefined') {
      localStorage.setItem('game_muted', 'false');
    }
  }

  toggleMute(): boolean {
    if (this.muted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  // ==========================================
  // CLEANUP
  // ==========================================

  cleanup(): void {
    this.stopMusicPreview();
    if (this.sfxSprite) {
      this.sfxSprite.unload();
      this.sfxSprite = null;
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Export default for easy import
export default audioManager;
