
'use client';

import { useEffect, useState, type ReactNode, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGame } from '@/hooks/use-game';
import type { PlayerKey } from '@/lib/types';
import LoadingSpinner from './loading-spinner';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

interface SessionPlayerGuardProps {
  playerKey: PlayerKey;
  children: (sessionUserId: string | null) => ReactNode;
}

export default function SessionPlayerGuard({ playerKey, children }: SessionPlayerGuardProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { game, loading: gameLoading, connectPlayerWithToken, disconnectPlayer } = useGame();
  const { currentUser } = useAuth();
  
  const [isValidated, setIsValidated] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    // Regular logged-in users don't need token validation.
    if (currentUser) {
      setIsValidated(true);
      return;
    }

    // If there's no token and no user, they can't proceed.
    if (!token) {
      setIsValidated(true); // Let AuthGuard handle the redirect.
      return;
    }
    
    // Wait for game data to be available before checking the token.
    if (gameLoading || !game) {
      return;
    }

    const expectedToken = playerKey === 'playerOne' ? game.playerOneAccessToken : game.playerTwoAccessToken;

    if (token === expectedToken) {
      const newSessionId = `session-${playerKey}-${token.slice(0, 8)}`;
      
      connectPlayerWithToken(playerKey).then((success) => {
        if (success) {
          setSessionUserId(newSessionId);
          setIsValidated(true);
        } else {
          setAccessError('Failed to connect to the game session.');
          setIsValidated(true);
        }
      });
    } else {
      setAccessError('Invalid or expired access token. Please get a new QR code from the admin.');
      setIsValidated(true);
    }

    // This effect should only run once when the token and game are available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, gameLoading, currentUser]);


  // This separate effect handles cleanup ONLY when the component unmounts.
  useEffect(() => {
    // Only set up the cleanup if we have a valid session user.
    if (sessionUserId) {
      // This function will be returned and called ONLY on unmount.
      return () => {
        disconnectPlayer(playerKey);
      };
    }
  // The stable disconnectPlayer function is a dependency.
  }, [sessionUserId, playerKey, disconnectPlayer]);


  if (gameLoading || (!isValidated && !accessError)) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <LoadingSpinner className="w-12 h-12" />
        <p className="mt-4">Validating session...</p>
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>{accessError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children(sessionUserId)}</>;
}
