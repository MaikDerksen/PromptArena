
'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
  const [isConnecting, setIsConnecting] = useState(false); // New state to manage connection process

  useEffect(() => {
    // If a regular user is logged in, they have access. No token needed.
    if (currentUser) {
      setIsValidated(true);
      return;
    }

    // If there's no token and no logged-in user, let AuthGuard handle redirect.
    if (!token) {
      setIsValidated(true); 
      return;
    }
    
    // If we are already in the process of connecting, do nothing and wait.
    if (isConnecting || gameLoading || !game) {
      return;
    }

    const expectedToken = playerKey === 'playerOne' ? game.playerOneAccessToken : game.playerTwoAccessToken;
    const isConnected = playerKey === 'playerOne' ? game.playerOneConnected : game.playerTwoConnected;

    if (token === expectedToken) {
      if (isConnected === false) {
        setIsConnecting(true); // Start the connection process
        const newSessionId = `session-${playerKey}-${Date.now()}`;
        
        connectPlayerWithToken(playerKey).then((success) => {
          if (success) {
            setSessionUserId(newSessionId);
            setIsValidated(true);
          } else {
            setAccessError('Failed to connect to the game session. The slot may now be taken.');
            setIsValidated(true);
          }
          setIsConnecting(false); // End the connection process
        });
      } else {
        // This slot is genuinely taken by someone else.
        setAccessError('This player slot is already taken. Please ask the admin for a new link.');
        setIsValidated(true);
      }
    } else {
      setAccessError('Invalid or expired access token. Please get a new QR code from the admin.');
      setIsValidated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, game, playerKey, currentUser, gameLoading]);


  useEffect(() => {
    // This effect handles cleanup when the component unmounts (e.g., user closes the tab)
    const handleBeforeUnload = () => {
      if (sessionUserId) {
        disconnectPlayer(playerKey);
      }
    };
    
    if (sessionUserId) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      if (sessionUserId) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        disconnectPlayer(playerKey);
      }
    };
  }, [sessionUserId, playerKey, disconnectPlayer]);


  if (gameLoading || !isValidated) {
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
