
'use client';
import PlayerPromptForm from '@/components/player-prompt-form';
import AuthGuard from '@/components/auth-guard';

export default function PlayerTwoPage() {
  return (
    <AuthGuard>
      <div>
        <PlayerPromptForm playerKey="playerTwo" playerName="Player Two" />
      </div>
    </AuthGuard>
  );
}
