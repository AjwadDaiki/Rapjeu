import { Suspense } from 'react';
import LobbyClient from './LobbyClient';

export default function LobbyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">Chargement...</div>}>
      <LobbyClient />
    </Suspense>
  );
}
