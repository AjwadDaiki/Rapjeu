// ============================================
// MONGODB CONFIGURATION
// ============================================

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rapbattle';

let isConnected = false;

export async function connectDB(): Promise<void> {
  if (isConnected) {
    console.log('✅ MongoDB déjà connecté');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('🗄️  MongoDB connecté');
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error);
    // Ne pas bloquer le serveur si MongoDB échoue
    console.log('⚠️  Mode sans persistence activé');
  }
}

export function isDBConnected(): boolean {
  return isConnected;
}
