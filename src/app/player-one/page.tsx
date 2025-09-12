
'use client';
import { Suspense } from 'react';
import PlayerPromptForm from '@/components/player-prompt-form';
import AuthGuard from '@/components/auth-guard';
import LoadingSpinner from '@/components/loading-spinner';
import SessionPlayerGuard from '@/components/session-player-guard';

function PlayerOnePageContent() {
  return (
    <SessionPlayerGuard playerKey="playerOne">
      {(sessionUserId) => (
        <AuthGuard>
          <PlayerPromptForm 
            playerKey="playerOne" 
            playerName="Player One" 
            sessionUserId={sessionUserId} 
          />
        </AuthGuard>
      )}
    </SessionPlayerGuard>
  );
}

export default function PlayerOnePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><LoadingSpinner /></div>}>
      <PlayerOnePageContent />
    </Suspense>
  );
}
