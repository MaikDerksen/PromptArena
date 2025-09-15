'use client';
import { Suspense } from 'react';
import PlayerPromptForm from '@/components/player-prompt-form';
import AuthGuard from '@/components/auth-guard';
import LoadingSpinner from '@/components/loading-spinner';
import SessionPlayerGuard from '@/components/session-player-guard';

function PlayerTwoPageContent() {
  return (
    <SessionPlayerGuard playerKey="playerTwo">
      {(sessionUserId) => (
        <AuthGuard allowSession={!!sessionUserId}>
          <PlayerPromptForm 
            playerKey="playerTwo" 
            playerName="Player Two" 
            sessionUserId={sessionUserId} 
          />
        </AuthGuard>
      )}
    </SessionPlayerGuard>
  );
}

export default function PlayerTwoPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64"><LoadingSpinner /></div>}>
      <PlayerTwoPageContent />
    </Suspense>
  );
}
