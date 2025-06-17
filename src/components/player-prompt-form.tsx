
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { debounce } from '@/lib/utils';

interface PlayerPromptFormProps {
  playerKey: PlayerKey;
  playerName: string;
}

export default function PlayerPromptForm({ playerKey, playerName }: PlayerPromptFormProps) {
  const { game, submitPlayerPrompt, updatePlayerTypingPrompt, updatePlayerLastSeen, loading: gameLoading } = useGame();
  const [promptInput, setPromptInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalSubmittedPrompt = playerKey === 'playerOne' ? game?.playerOnePrompt : game?.playerTwoPrompt;
  const currentImage = playerKey === 'playerOne' ? game?.playerOneImage : game?.playerTwoImage;

  // Effect to update lastSeen when component mounts
  useEffect(() => {
    updatePlayerLastSeen(playerKey);
  }, [playerKey, updatePlayerLastSeen]);


  // Debounced function to update typing prompt in Firestore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateTypingPrompt = useCallback(
    debounce((player: PlayerKey, pInput: string) => {
      if (game?.status === 'active') { // Only update if round is active
        updatePlayerTypingPrompt(player, pInput); // This also updates lastSeen
      }
    }, 500), 
    [updatePlayerTypingPrompt, game?.status] 
  );


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPromptInput(newPrompt);
    if (game?.status === 'active') {
      debouncedUpdateTypingPrompt(playerKey, newPrompt);
    }
  };

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
      // Optionally clear input: setPromptInput(''); // Keeping it for now so player sees what they submitted
    } catch (err: any) {      setError(err.message || "Failed to submit prompt or generate image.");
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
  const hasPlayerSubmitted = !!(playerKey === 'playerOne' ? game.playerOnePrompt : game.playerTwoPrompt);

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{playerName}'s Turn</CardTitle>
          <CardDescription>The current central prompt is: <strong className="text-primary">{game.prompt || "Waiting for admin..."}</strong></CardDescription>
          {!isRoundActive && game.status === 'waiting' && (
            <Alert variant="default" className="mt-2 bg-secondary">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Round Not Active</AlertTitle>
              <AlertDescription>
                Please wait for the admin to start the round before submitting your prompt.
              </AlertDescription>
            </Alert>
          )}
           {game.status === 'completed' && (
            <Alert variant="default" className="mt-2 bg-secondary">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Round Completed</AlertTitle>
              <AlertDescription>
                This round has ended. Wait for the admin to start a new one.
              </AlertDescription>
            </Alert>
          )}
           {isRoundActive && hasPlayerSubmitted && !currentImage && !isSubmitting && (
             <Alert variant="default" className="mt-2 bg-blue-500/10 border-blue-500/50">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertTitle>Prompt Submitted!</AlertTitle>
                <AlertDescription>
                Your prompt has been submitted. Waiting for the image to generate. You can edit and resubmit if needed before the image appears.
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
                onChange={handleInputChange}
                placeholder="e.g., A futuristic cityscape at sunset, with flying cars..."
                rows={4}
                className="mt-1 text-base"
                disabled={isSubmitting || !isRoundActive}
                aria-describedby="prompt-help"
              />
              <p id="prompt-help" className="text-sm text-muted-foreground mt-1">
                Describe the image you want the AI to generate based on the central prompt. Your typing progress is shared live with viewers!
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
        playerName="Your Submission Preview"
        finalPrompt={finalSubmittedPrompt} // Show the submitted prompt
        typingPrompt={promptInput} // Show current input as typing prompt for immediate feedback
        imageUrl={currentImage}
        isGenerating={isSubmitting || (hasPlayerSubmitted && !currentImage)} // Generating if submitting OR submitted but no image yet
        cardClassName="bg-card/50"
        imagesRevealed={true} // Player always sees their own image attempts
        isLiveTypingView={false} 
      />
    </div>
  );
}
