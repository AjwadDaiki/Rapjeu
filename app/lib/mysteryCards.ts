// ============================================
// MYSTERY CARDS - Cartes mystères entre manches
// Ajoute du chaos et des comebacks
// ============================================

export type CardEffect =
  | 'damage_enemy'    // Enlève HP à l'adversaire
  | 'heal_self'       // Donne HP à nous
  | 'damage_self'     // Enlève HP à nous (malus)
  | 'heal_enemy'      // Donne HP à l'adversaire (malus)
  | 'nothing'         // Ne fait rien (troll)
  | 'steal_points'    // Vole des points du dernier round
  | 'double_damage'   // Prochain round compte double
  | 'reverse'         // Inverse les dégâts du prochain round
  | 'skip_turn'       // L'adversaire saute un round
  | 'both_damage';    // Les deux équipes perdent HP

export interface MysteryCard {
  id: string;
  name: string;
  description: string;
  effect: CardEffect;
  value: number; // HP ou multiplicateur
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  icon: string;
}

// ==========================================
// CATALOGUE DES CARTES
// ==========================================

export const MYSTERY_CARDS: MysteryCard[] = [
  // COMMON (60% chance)
  {
    id: 'light_attack',
    name: '💥 Attaque Légère',
    description: 'Inflige 10 HP de dégâts à l\'adversaire',
    effect: 'damage_enemy',
    value: 10,
    rarity: 'common',
    color: '#FF6B6B',
    icon: '👊',
  },
  {
    id: 'light_heal',
    name: '💚 Soin Léger',
    description: 'Récupère 10 HP',
    effect: 'heal_self',
    value: 10,
    rarity: 'common',
    color: '#51CF66',
    icon: '💊',
  },
  {
    id: 'nothing',
    name: '🤷 Carte Vide',
    description: 'Ne fait absolument rien (trollé !)',
    effect: 'nothing',
    value: 0,
    rarity: 'common',
    color: '#868E96',
    icon: '💨',
  },
  {
    id: 'self_damage',
    name: '😱 Carte Maudite',
    description: 'Tu perds 15 HP (aïe !)',
    effect: 'damage_self',
    value: 15,
    rarity: 'common',
    color: '#862E9C',
    icon: '💀',
  },

  // RARE (25% chance)
  {
    id: 'medium_attack',
    name: '⚡ Attaque Puissante',
    description: 'Inflige 20 HP de dégâts à l\'adversaire',
    effect: 'damage_enemy',
    value: 20,
    rarity: 'rare',
    color: '#FF8C00',
    icon: '⚔️',
  },
  {
    id: 'medium_heal',
    name: '✨ Soin Magique',
    description: 'Récupère 20 HP',
    effect: 'heal_self',
    value: 20,
    rarity: 'rare',
    color: '#4DABF7',
    icon: '✨',
  },
  {
    id: 'steal_points',
    name: '🦹 Vol de Points',
    description: 'Vole 15 HP du dernier round adverse',
    effect: 'steal_points',
    value: 15,
    rarity: 'rare',
    color: '#F59F00',
    icon: '💰',
  },
  {
    id: 'gift_enemy',
    name: '🎁 Cadeau Empoisonné',
    description: 'Donne 15 HP à l\'adversaire (oups)',
    effect: 'heal_enemy',
    value: 15,
    rarity: 'rare',
    color: '#9775FA',
    icon: '🎁',
  },

  // EPIC (12% chance)
  {
    id: 'critical_attack',
    name: '💀 Attaque Critique',
    description: 'Inflige 30 HP de dégâts massifs !',
    effect: 'damage_enemy',
    value: 30,
    rarity: 'epic',
    color: '#E03131',
    icon: '💣',
  },
  {
    id: 'full_heal',
    name: '🌟 Guérison Totale',
    description: 'Récupère 40 HP !',
    effect: 'heal_self',
    value: 40,
    rarity: 'epic',
    color: '#20C997',
    icon: '🌈',
  },
  {
    id: 'double_damage',
    name: '🔥 Dégâts Doublés',
    description: 'Prochain round compte DOUBLE',
    effect: 'double_damage',
    value: 2,
    rarity: 'epic',
    color: '#FA5252',
    icon: '🔥',
  },
  {
    id: 'reverse',
    name: '🔄 Carte Inversée',
    description: 'Inverse les dégâts du prochain round',
    effect: 'reverse',
    value: 1,
    rarity: 'epic',
    color: '#7950F2',
    icon: '🔄',
  },

  // LEGENDARY (3% chance)
  {
    id: 'ultimate_attack',
    name: '☄️ ULTIMATE ATTACK',
    description: 'Inflige 50 HP de dégâts DÉVASTATEURS !!!',
    effect: 'damage_enemy',
    value: 50,
    rarity: 'legendary',
    color: '#FFD700',
    icon: '👑',
  },
  {
    id: 'skip_turn',
    name: '⏭️ Saut de Tour',
    description: 'L\'adversaire saute le prochain round !',
    effect: 'skip_turn',
    value: 1,
    rarity: 'legendary',
    color: '#339AF0',
    icon: '⏭️',
  },
  {
    id: 'both_damage',
    name: '💥 Destruction Mutuelle',
    description: 'Les DEUX équipes perdent 25 HP (chaos total)',
    effect: 'both_damage',
    value: 25,
    rarity: 'legendary',
    color: '#F06595',
    icon: '💥',
  },
];

// ==========================================
// RARITY WEIGHTS (pour random selection)
// ==========================================

const RARITY_WEIGHTS = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Tire une carte aléatoire selon les rarités
 */
export function drawRandomCard(): MysteryCard {
  // Calculer total weight
  const totalWeight = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);

  // Random dans la plage
  let random = Math.random() * totalWeight;

  // Déterminer la rarity
  let selectedRarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      selectedRarity = rarity as any;
      break;
    }
  }

  // Filtrer les cartes de cette rarity
  const cardsOfRarity = MYSTERY_CARDS.filter(c => c.rarity === selectedRarity);

  // Random parmi ces cartes
  const randomIndex = Math.floor(Math.random() * cardsOfRarity.length);
  return cardsOfRarity[randomIndex];
}

/**
 * Applique l'effet d'une carte
 */
export function applyCardEffect(
  card: MysteryCard,
  currentHpA: number,
  currentHpB: number,
  pullingTeam: 'A' | 'B'
): { newHpA: number; newHpB: number; message: string } {
  let newHpA = currentHpA;
  let newHpB = currentHpB;
  let message = '';

  const isTeamA = pullingTeam === 'A';

  switch (card.effect) {
    case 'damage_enemy':
      if (isTeamA) {
        newHpB = Math.max(0, newHpB - card.value);
        message = `💥 Team A inflige ${card.value} HP à Team B !`;
      } else {
        newHpA = Math.max(0, newHpA - card.value);
        message = `💥 Team B inflige ${card.value} HP à Team A !`;
      }
      break;

    case 'heal_self':
      if (isTeamA) {
        newHpA = Math.min(100, newHpA + card.value);
        message = `💚 Team A récupère ${card.value} HP !`;
      } else {
        newHpB = Math.min(100, newHpB + card.value);
        message = `💚 Team B récupère ${card.value} HP !`;
      }
      break;

    case 'damage_self':
      if (isTeamA) {
        newHpA = Math.max(0, newHpA - card.value);
        message = `😱 Team A perd ${card.value} HP (carte maudite) !`;
      } else {
        newHpB = Math.max(0, newHpB - card.value);
        message = `😱 Team B perd ${card.value} HP (carte maudite) !`;
      }
      break;

    case 'heal_enemy':
      if (isTeamA) {
        newHpB = Math.min(100, newHpB + card.value);
        message = `🎁 Team A donne ${card.value} HP à Team B (oups) !`;
      } else {
        newHpA = Math.min(100, newHpA + card.value);
        message = `🎁 Team B donne ${card.value} HP à Team A (oups) !`;
      }
      break;

    case 'nothing':
      message = `🤷 ${pullingTeam === 'A' ? 'Team A' : 'Team B'} n'a rien obtenu !`;
      break;

    case 'steal_points':
      if (isTeamA) {
        newHpB = Math.max(0, newHpB - card.value);
        newHpA = Math.min(100, newHpA + card.value);
        message = `🦹 Team A vole ${card.value} HP à Team B !`;
      } else {
        newHpA = Math.max(0, newHpA - card.value);
        newHpB = Math.min(100, newHpB + card.value);
        message = `🦹 Team B vole ${card.value} HP à Team A !`;
      }
      break;

    case 'both_damage':
      newHpA = Math.max(0, newHpA - card.value);
      newHpB = Math.max(0, newHpB - card.value);
      message = `💥 DESTRUCTION MUTUELLE ! Les deux équipes perdent ${card.value} HP !`;
      break;

    case 'double_damage':
      message = `🔥 ${pullingTeam === 'A' ? 'Team A' : 'Team B'} : Prochain round DOUBLE DÉGÂTS !`;
      break;

    case 'reverse':
      message = `🔄 ${pullingTeam === 'A' ? 'Team A' : 'Team B'} : Prochain round INVERSÉ !`;
      break;

    case 'skip_turn':
      message = `⏭️ ${pullingTeam === 'A' ? 'Team B' : 'Team A'} saute le prochain round !`;
      break;
  }

  return { newHpA, newHpB, message };
}

/**
 * Obtenir 3 cartes aléatoires pour le choix
 */
export function draw3Cards(): MysteryCard[] {
  const cards: MysteryCard[] = [];

  for (let i = 0; i < 3; i++) {
    cards.push(drawRandomCard());
  }

  return cards;
}
