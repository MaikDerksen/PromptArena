
'use client';

import { useGame } from '@/hooks/use-game';
import LoadingSpinner from '@/components/loading-spinner';
import ImageCard from '@/components/image-card';
import GameStatusBadge from '@/components/game-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Tv } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ViewerPage() {
  const { game, loading, error } = useGame();

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

  return (
    <div className="space-y-8">
      <Card className="text-center shadow-xl border-primary border-2">
        <CardHeader>
          <CardTitle className="font-headline text-4xl flex items-center justify-center gap-3">
            <Tv className="w-10 h-10 text-primary"/> PromptArena Viewer
          </CardTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <CardDescription className="text-lg">Game Status:</CardDescription>
            <GameStatusBadge status={game.status} className="text-md px-4 py-1.5" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-1">Central Prompt:</p>
          <h2 className="text-3xl font-bold font-headline text-primary break-words">
            {game.prompt || "Waiting for admin to set a prompt..."}
          </h2>
           {game.status === 'active' && !game.imagesRevealed && (!!game.playerOneImage || !!game.playerTwoImage) && (
            <p className="text-sm text-accent mt-2 animate-pulse">Images are generated... Waiting for Admin to reveal them!</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
    </div>
  );
}
