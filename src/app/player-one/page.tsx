
'use client';
import PlayerPromptForm from '@/components/player-prompt-form';
import AuthGuard from '@/components/auth-guard';

export default function PlayerOnePage() {
  return (
    <AuthGuard>
      <div>
        <PlayerPromptForm playerKey="playerOne" playerName="Player One" />
      </div>
    </AuthGuard>
  );
}
