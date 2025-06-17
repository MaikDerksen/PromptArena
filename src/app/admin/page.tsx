'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useGame } from '@/hooks/use-game';
import LoadingSpinner from '@/components/loading-spinner';
import ImageCard from '@/components/image-card';
import GameStatusBadge from '@/components/game-status-badge';
import { AlertCircle, Edit3, Play, RotateCcw, SkipForward, Eye, UserCheck, UserX } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Timestamp } from 'firebase/firestore';

const formatLastSeen = (lastSeen: Timestamp | Date | null): {text: string, icon: JSX.Element} => {
  if (!lastSeen) return { text: "Never active", icon: <UserX className="text-destructive h-4 w-4" /> };
  
  const now = new Date();
  const seenDate = lastSeen instanceof Timestamp ? lastSeen.toDate() : new Date(lastSeen); // Handle both Timestamp and Date
  const diffMs = now.getTime() - seenDate.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins < 2) return { text: "Active just now", icon: <UserCheck className="text-green-500 h-4 w-4" /> };
  if (diffMins < 60) return { text: `Active ${diffMins} min ago`, icon: <UserCheck className="text-yellow-500 h-4 w-4" /> };
  
  return { text: `Last active: ${seenDate.toLocaleDateString()}`, icon: <UserX className="text-muted-foreground h-4 w-4" /> };
};


export default function AdminPage() {
  const { game, loading, error: gameError, setCentralPrompt, updateGameStatus, revealPrompts, resetRound, resetGame } = useGame();
  const [newPrompt, setNewPrompt] = useState('');
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (game?.prompt) {
      setNewPrompt(game.prompt);
    }
  }, [game?.prompt]);

  const handleSetPrompt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    setIsSubmittingPrompt(true);
    try {
      await setCentralPrompt(newPrompt);
    } finally {
      setIsSubmittingPrompt(false);
    }
  };

  const handleUpdateStatus = async (status: 'active' | 'waiting' | 'completed') => {
    setIsUpdatingStatus(true);
    try {
      await updateGameStatus(status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleRevealPrompts = async () => {
    setIsRevealing(true);
    try {
      await revealPrompts();
    } finally {
      setIsRevealing(false);
    }
  };

  const handleResetRound = async () => {
    await resetRound(game?.prompt || "New round, new prompt!"); 
  };
  
  const handleResetGame = async () => {
    if (window.confirm("Are you sure you want to reset the entire game? This action cannot be undone.")) {
      await resetGame();
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner className="w-12 h-12" /> <span className="ml-2">Loading Admin Panel...</span></div>;
  }

  if (gameError || !game) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load game data for admin panel. Details: {gameError || "Game data unavailable."}</AlertDescription></Alert>;
  }
  
  const playerOneActivity = formatLastSeen(game.playerOneLastSeen || null);
  const playerTwoActivity = formatLastSeen(game.playerTwoLastSeen || null);

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Admin Control Panel</CardTitle>
          <div className="flex items-center gap-2 mt-2">
            <CardDescription>Current Game Status:</CardDescription>
            <GameStatusBadge status={game.status} />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Edit3 className="text-primary"/> Set Central Prompt</CardTitle>
          <CardDescription>Enter the central theme or idea for the current round.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSetPrompt} className="space-y-4">
            <div>
              <Label htmlFor="central-prompt">Central Prompt</Label>
              <Textarea
                id="central-prompt"
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="e.g., A mythical creature in a cyberpunk city"
                rows={3}
                className="mt-1"
                disabled={isSubmittingPrompt}
              />
            </div>
            <Button type="submit" disabled={isSubmittingPrompt || !newPrompt.trim()}>
              {isSubmittingPrompt ? <><LoadingSpinner className="mr-2" /> Updating...</> : 'Set/Update Prompt'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Player Activity</CardTitle>
          <CardDescription>Monitor player connection and recent activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {playerOneActivity.icon}
            <span className="font-medium">Player One:</span>
            <span>{playerOneActivity.text}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {playerTwoActivity.icon}
            <span className="font-medium">Player Two:</span>
            <span>{playerTwoActivity.text}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Controls</CardTitle>
          <CardDescription>Manage the game flow and player states.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Button onClick={() => handleUpdateStatus('active')} disabled={isUpdatingStatus || game.status === 'active'} className="w-full bg-green-600 hover:bg-green-700">
            <Play className="mr-2 h-4 w-4"/> Start Round
          </Button>
          <Button onClick={() => handleUpdateStatus('waiting')} disabled={isUpdatingStatus || game.status === 'waiting'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
            Pause Round (Waiting)
          </Button>
          <Button onClick={() => handleUpdateStatus('completed')} disabled={isUpdatingStatus || game.status === 'completed'} className="w-full">
            End Round (Completed)
          </Button>
          <Button onClick={handleRevealPrompts} disabled={isRevealing || game.promptsRevealed || (game.status !== 'active' && game.status !== 'completed')} className="w-full">
            {isRevealing ? <><LoadingSpinner className="mr-2"/>Revealing...</> : <><Eye className="mr-2 h-4 w-4"/> Reveal Prompts to Viewers</>}
          </Button>
          <Button onClick={handleResetRound} variant="outline" disabled={isUpdatingStatus} className="w-full">
           <SkipForward className="mr-2 h-4 w-4"/> Next Round (Clear Submissions)
          </Button>
          <Button onClick={handleResetGame} variant="destructive" className="w-full">
           <RotateCcw className="mr-2 h-4 w-4"/> Reset Entire Game
          </Button>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">"Next Round" clears submissions, hides prompts, sets status to 'waiting'. "Reset Game" clears all data.</p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Player Submissions (Admin View)</CardTitle>
          <CardDescription>View final prompts and generated images from players. These are always visible to admin.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <ImageCard
            playerName="Player One"
            finalPrompt={game.playerOnePrompt}
            imageUrl={game.playerOneImage}
            isLiveTypingView={false} // Admin sees final submitted prompt
            isGenerating={game.status === 'active' && !!game.playerOnePrompt && !game.playerOneImage}
          />
          <ImageCard
            playerName="Player Two"
            finalPrompt={game.playerTwoPrompt}
            imageUrl={game.playerTwoImage}
            isLiveTypingView={false} // Admin sees final submitted prompt
            isGenerating={game.status === 'active' && !!game.playerTwoPrompt && !game.playerTwoImage}
          />
        </CardContent>
      </Card>
    </div>
  );
}
