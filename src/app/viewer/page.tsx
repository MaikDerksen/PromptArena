
'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/use-game';
import LoadingSpinner from '@/components/loading-spinner';
import ImageCard from '@/components/image-card';
import GameStatusBadge from '@/components/game-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Tv, QrCode } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RoundTimer from '@/components/round-timer';
import { QRCodeSVG } from 'qrcode.react';

export default function ViewerPage() {
  const { game, loading, error } = useGame();
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  if (loading) {
    return <div className="flex flex-col justify-center items-center min-h-[60vh]"><LoadingSpinner className="w-16 h-16 text-primary" /> <p className="mt-4 text-xl font-semibold">Loading Battle Arena...</p></div>;
  }

  if (error || !game) {
     return <div className="flex justify-center items-center min-h-[60vh]">
       <Alert variant="destructive" className="w-full max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Game Data</AlertTitle>
        <AlertDescription>{error || "Game data is currently unavailable. Please try refreshing the page."}</AlertDescription>
      </Alert>
     </div>;
  }

  const playerOneJoinUrl = baseUrl && game.playerOneAccessToken ? `${baseUrl}/player-one?token=${game.playerOneAccessToken}` : '';
  const playerTwoJoinUrl = baseUrl && game.playerTwoAccessToken ? `${baseUrl}/player-two?token=${game.playerTwoAccessToken}` : '';
  const noPlayersConnected = !game.playerOneConnected && !game.playerTwoConnected;

  return (
    <div className="space-y-8">
      <Card className="text-center shadow-xl border-primary border-2">
        <CardHeader>
          <CardTitle className="font-headline text-3xl md:text-4xl flex items-center justify-center gap-3">
            <Tv className="w-10 h-10 text-primary"/> PromptArena Viewer
          </CardTitle>
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-2 mt-2">
            <div className="flex items-center gap-2">
              <CardDescription className="text-lg">Status:</CardDescription>
              <GameStatusBadge status={game.status} className="text-md px-4 py-1.5" />
            </div>
            {game.status === 'active' && <RoundTimer endTime={game.roundEndsAt ?? null} status={game.status} className="text-primary text-lg"/>}
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-1">Central Prompt:</p>
          <h2 className="text-2xl md:text-3xl font-bold font-headline text-primary break-words">
            {game.prompt || "Waiting for admin to set a prompt..."}
          </h2>
           {game.status === 'active' && !game.imagesRevealed && (!!game.playerOneImage || !!game.playerTwoImage) && (
            <p className="text-sm text-accent mt-2 animate-pulse">Images are generated... Waiting for Admin to reveal them!</p>
          )}
        </CardContent>
      </Card>

      {noPlayersConnected && (playerOneJoinUrl || playerTwoJoinUrl) ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-2xl font-headline">
              <QrCode className="text-primary"/> Join the Game!
            </CardTitle>
            <CardDescription className="text-center">Scan a QR code with your mobile device to join as a player.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            <div className="text-center space-y-2 flex flex-col items-center">
              <h3 className="font-semibold text-lg">Player One</h3>
              {playerOneJoinUrl ? (
                <div className="p-4 bg-white rounded-lg inline-block">
                  <QRCodeSVG value={playerOneJoinUrl} size={160} />
                </div>
              ) : <p className="text-muted-foreground text-sm">Join code not available.</p>}
            </div>
            <div className="text-center space-y-2 flex flex-col items-center">
              <h3 className="font-semibold text-lg">Player Two</h3>
              {playerTwoJoinUrl ? (
                <div className="p-4 bg-white rounded-lg inline-block">
                  <QRCodeSVG value={playerTwoJoinUrl} size={160} />
                </div>
              ) : <p className="text-muted-foreground text-sm">Join code not available.</p>}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ImageCard
            playerName="Player One"
            finalPrompt={game.playerOnePrompt}
            typingPrompt={game.playerOneTypingPrompt}
            imageUrl={game.playerOneImage}
            cardClassName="lg:col-span-1 shadow-lg"
            imagesRevealed={!!game.imagesRevealed}
            isLiveTypingView={true}
            isGenerating={game.status === 'active' && !!game.playerOnePrompt && !game.playerOneImage}
          />

          <ImageCard
            playerName="Player Two"
            finalPrompt={game.playerTwoPrompt}
            typingPrompt={game.playerTwoTypingPrompt}
            imageUrl={game.playerTwoImage}
            cardClassName="lg:col-span-1 shadow-lg"
            imagesRevealed={!!game.imagesRevealed}
            isLiveTypingView={true}
            isGenerating={game.status === 'active' && !!game.playerTwoPrompt && !game.playerTwoImage}
          />
        </div>
      )}
    </div>
  );
}
