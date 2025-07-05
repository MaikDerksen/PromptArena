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
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { debounce } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import RoundTimer from './round-timer';

interface PlayerPromptFormProps {
  playerKey: PlayerKey;
  playerName: string;
}

export default function PlayerPromptForm({ playerKey, playerName }: PlayerPromptFormProps) {
  const { game, submitPlayerPrompt, updatePlayerTypingPrompt, updatePlayerLastSeen, loading: gameLoading } = useGame();
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [promptInput, setPromptInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalSubmittedPrompt = playerKey === 'playerOne' ? game?.playerOnePrompt : game?.playerTwoPrompt;
  const currentImage = playerKey === 'playerOne' ? game?.playerOneImage : game?.playerTwoImage;
  const hasSubmitted = !!finalSubmittedPrompt;

  useEffect(() => {
    if (currentUser) {
      updatePlayerLastSeen(playerKey);
    }
  }, [playerKey, updatePlayerLastSeen, currentUser]);
  
  useEffect(() => {
    // When a round is reset, the final prompt is cleared in Firestore.
    // This effect listens for that change and clears the local text input.
    if (!finalSubmittedPrompt) {
      setPromptInput('');
    }
  }, [finalSubmittedPrompt]);

  const debouncedUpdateTypingPrompt = useCallback(
    debounce((player: PlayerKey, pInput: string) => {
      if (currentUser && game?.status === 'active' && !hasSubmitted) { 
        updatePlayerTypingPrompt(player, pInput);
      }
    }, 500), 
    [updatePlayerTypingPrompt, game?.status, currentUser, hasSubmitted] 
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

    if (!promptInput.trim() || !game || !canSubmit) {
      if (game?.status !== 'active') {
        setError("Cannot submit prompt: The round is not active.");
      }
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitPlayerPrompt(playerKey, promptInput);
    } catch (err: any) {      
      setError(err.message || "Failed to submit prompt or generate image.");
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
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Access Denied</AlertTitle><AlertDescription>You must be logged in to access this page.</AlertDescription></Alert>;
  }
  
  const isRoundActive = game.status === 'active';
  const isTimeUp = game.roundEndsAt ? new Date() > (game.roundEndsAt as Timestamp).toDate() : false;
  const canSubmit = isRoundActive && !hasSubmitted && !isTimeUp;

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <CardTitle className="font-headline text-3xl">{playerName}'s Turn</CardTitle>
              <CardDescription>The current central prompt is: <strong className="text-primary">{game.prompt || "Waiting for admin..."}</strong></CardDescription>
            </div>
            {isRoundActive && <RoundTimer endTime={game.roundEndsAt ?? null} status={game.status} className="text-lg text-primary" />}
          </div>

          {!isRoundActive && game.status === 'waiting' && (
            <Alert variant="default" className="mt-4 bg-secondary">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Round Not Active</AlertTitle>
              <AlertDescription>
                Please wait for the admin to start the round before submitting your prompt.
              </AlertDescription>
            </Alert>
          )}
           {game.status === 'completed' && (
            <Alert variant="default" className="mt-4 bg-secondary">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Round Completed</AlertTitle>
              <AlertDescription>
                This round has ended. Wait for the admin to start a new one.
              </AlertDescription>
            </Alert>
          )}
           {isRoundActive && hasSubmitted && (
             <Alert variant="default" className="mt-4 bg-green-500/10 border-green-500/50">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle>Prompt Submitted & Locked!</AlertTitle>
                <AlertDescription>
                  Your submission is locked in for this round. Good luck!
                </AlertDescription>
            </Alert>
           )}
           {isRoundActive && isTimeUp && !hasSubmitted && (
            <Alert variant="destructive" className="mt-4">
              <Clock className="h-4 w-4"/>
              <AlertTitle>Time's Up!</AlertTitle>
              <AlertDescription>
                The time for this round has ended. You can no longer submit a prompt.
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
                disabled={isSubmitting || !canSubmit}
                aria-describedby="prompt-help"
              />
              <p id="prompt-help" className="text-sm text-muted-foreground mt-1">
                Describe the image you want the AI to generate. You only get one submission per round!
              </p>
            </div>
            {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Submission Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <Button 
              type="submit" 
              className="w-full text-lg py-6" 
              disabled={!promptInput.trim() || isSubmitting || !canSubmit}
            >
              {isSubmitting ? <><LoadingSpinner className="mr-2" /> Submitting & Generating...</> : 'Submit & Generate'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <ImageCard
        playerName={`Your Submission Preview (${playerName})`}
        finalPrompt={finalSubmittedPrompt || null} 
        typingPrompt={isRoundActive && !hasSubmitted ? promptInput : undefined} 
        imageUrl={currentImage || null}
        isGenerating={isSubmitting || (hasSubmitted && !currentImage)} 
        cardClassName="bg-card/50"
        imagesRevealed={true}
        isLiveTypingView={false} 
      />
    </div>
  );
}
