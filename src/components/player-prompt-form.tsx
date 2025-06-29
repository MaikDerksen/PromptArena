
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
import { AlertCircle, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { debounce } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import { useToast } from '@/hooks/use-toast';


interface PlayerPromptFormProps {
  playerKey: PlayerKey;
  playerName: string;
}

export default function PlayerPromptForm({ playerKey, playerName }: PlayerPromptFormProps) {
  const { game, submitPlayerPrompt, updatePlayerTypingPrompt, updatePlayerLastSeen, loading: gameLoading } = useGame();
  const { currentUser, userProfile, loading: authLoading } = useAuth(); // Get user
  const { toast } = useToast();
  
  const [promptInput, setPromptInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalSubmittedPrompt = playerKey === 'playerOne' ? game?.playerOnePrompt : game?.playerTwoPrompt;
  const currentImage = playerKey === 'playerOne' ? game?.playerOneImage : game?.playerTwoImage;

  // Effect to update lastSeen when component mounts or user changes
  useEffect(() => {
    if (currentUser) {
      updatePlayerLastSeen(playerKey);
    }
  }, [playerKey, updatePlayerLastSeen, currentUser]);


  // Debounced function to update typing prompt in Firestore
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateTypingPrompt = useCallback(
    debounce((player: PlayerKey, pInput: string) => {
      if (currentUser && game?.status === 'active') { 
        updatePlayerTypingPrompt(player, pInput);
      }
    }, 500), 
    [updatePlayerTypingPrompt, game?.status, currentUser] 
  );


  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setPromptInput(newPrompt);
    if (currentUser && game?.status === 'active') {
      debouncedUpdateTypingPrompt(playerKey, newPrompt);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentUser || !userProfile) {
      toast({title: "Not Logged In", description: "You must be logged in to submit a prompt.", variant: "destructive"});
      return;
    }

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
      // setPromptInput(''); // Clear input after successful submission
    } catch (err: any) {      
      setError(err.message || "Failed to submit prompt or generate image.");
      // Toast is handled within submitPlayerPrompt for credit errors etc.
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const loading = gameLoading || authLoading;

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner className="w-12 h-12" /> <span className="ml-2">Loading game...</span></div>;
  }

  if (!game) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Game data could not be loaded. Please try again later.</AlertDescription></Alert>;
  }
   if (!currentUser || !userProfile) {
     // This case should ideally be handled by AuthGuard, but as a fallback:
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Access Denied</AlertTitle><AlertDescription>You must be logged in to access this page.</AlertDescription></Alert>;
  }
  
  const isRoundActive = game.status === 'active';
  const hasPlayerSubmittedThisSlot = !!(playerKey === 'playerOne' ? game.playerOnePrompt : game.playerTwoPrompt);

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="font-headline text-3xl">{playerName}'s Turn</CardTitle>
              <CardDescription>The current central prompt is: <strong className="text-primary">{game.prompt || "Waiting for admin..."}</strong></CardDescription>
            </div>
          </div>

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
           {isRoundActive && hasPlayerSubmittedThisSlot && !currentImage && !isSubmitting && (
             <Alert variant="default" className="mt-2 bg-blue-500/10 border-blue-500/50">
                <AlertCircle className="h-4 w-4 text-blue-500" />
                <AlertTitle>Prompt Submitted!</AlertTitle>
                <AlertDescription>
                Your prompt for {playerName} has been submitted. Waiting for the image to generate. You can edit and resubmit if needed before the image appears (this will use another credit).
                </AlertDescription>
            </Alert>
           )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="prompt-input" className="text-lg">Your Creative Prompt for {playerName}</Label>
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
        playerName={`Your Submission Preview (${playerName})`}
        finalPrompt={finalSubmittedPrompt || null} 
        typingPrompt={isRoundActive ? promptInput : undefined} 
        imageUrl={currentImage || null}
        isGenerating={isSubmitting || (hasPlayerSubmittedThisSlot && !currentImage && isRoundActive)} 
        cardClassName="bg-card/50"
        imagesRevealed={true} // Player always sees their own image attempts
        isLiveTypingView={false} 
      />
    </div>
  );
}
