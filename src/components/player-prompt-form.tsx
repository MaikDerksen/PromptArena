'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from './loading-spinner';
import type { PlayerKey } from '@/lib/types';
import { useGame } from '@/hooks/use-game';
import ImageCard from './image-card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface PlayerPromptFormProps {
  playerKey: PlayerKey;
  playerName: string;
}

export default function PlayerPromptForm({ playerKey, playerName }: PlayerPromptFormProps) {
  const { game, submitPlayerPrompt, loading: gameLoading } = useGame();
  const [promptInput, setPromptInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPrompt = playerKey === 'playerOne' ? game?.playerOnePrompt : game?.playerTwoPrompt;
  const currentImage = playerKey === 'playerOne' ? game?.playerOneImage : game?.playerTwoImage;

  useEffect(() => {
    // If game data loads and there's an existing prompt for this player,
    // populate the input. This is helpful if the player refreshes.
    // However, this might overwrite what they are currently typing if not careful.
    // Let's only do this if the input is currently empty.
    if (currentPrompt && promptInput === '') {
      // setPromptInput(currentPrompt); // Decided against this to avoid overwriting user input on re-renders.
    }
  }, [currentPrompt, promptInput]);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!promptInput.trim() || !game || game.status !== 'active') {
      if (game?.status !== 'active') {
        setError("Cannot submit prompt: The round is not active.");
      }
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitPlayerPrompt(playerKey, promptInput);
      // setPromptInput(''); // Optionally clear input after submission
    } catch (err: any) {
      setError(err.message || "Failed to submit prompt or generate image.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (gameLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner className="w-12 h-12" /> <span className="ml-2">Loading game...</span></div>;
  }

  if (!game) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Game data could not be loaded. Please try again later.</AlertDescription></Alert>;
  }
  
  const isRoundActive = game.status === 'active';

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{playerName}'s Turn</CardTitle>
          <CardDescription>The current central prompt is: <strong className="text-primary">{game.prompt}</strong></CardDescription>
          {!isRoundActive && (
            <Alert variant="default" className="mt-2 bg-secondary">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Round Not Active</AlertTitle>
              <AlertDescription>
                Please wait for the admin to start the round before submitting your prompt.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="prompt-input" className="text-lg">Your Creative Prompt</Label>
              <Textarea
                id="prompt-input"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="e.g., A futuristic cityscape at sunset, with flying cars..."
                rows={4}
                className="mt-1 text-base"
                disabled={isSubmitting || !isRoundActive}
                aria-describedby="prompt-help"
              />
              <p id="prompt-help" className="text-sm text-muted-foreground mt-1">
                Describe the image you want the AI to generate based on the central prompt.
              </p>
            </div>
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Submission Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <Button 
              type="submit" 
              className="w-full text-lg py-6" 
              disabled={!promptInput.trim() || isSubmitting || !isRoundActive}
            >
              {isSubmitting ? <><LoadingSpinner className="mr-2" /> Submitting & Generating...</> : 'Submit Prompt & Generate Image'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ImageCard
        playerName="Your Submission"
        prompt={currentPrompt || "Awaiting your submission..."}
        imageUrl={currentImage}
        isGenerating={isSubmitting && !currentImage} // Show generating on card if submitting and no image yet
        cardClassName="bg-card/50"
      />
    </div>
  );
}
