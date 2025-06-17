import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from './loading-spinner';
import { ImageOff, EyeOff } from 'lucide-react';

interface ImageCardProps {
  playerName?: string;
  finalPrompt: string | null; // The finalized, submitted prompt
  typingPrompt?: string | null; // For live typing view
  imageUrl: string | null;
  isGenerating?: boolean;
  cardClassName?: string;
  promptsRevealed?: boolean; // Is the admin allowing prompts to be seen by viewers?
  isLiveTypingView?: boolean; // True if this card is on the viewer page
}

export default function ImageCard({ 
  playerName, 
  finalPrompt, 
  typingPrompt, 
  imageUrl, 
  isGenerating, 
  cardClassName,
  promptsRevealed,
  isLiveTypingView 
}: ImageCardProps) {

  let displayPromptText = "No prompt information available.";
  let displayPromptLabel = "Prompt Status:";

  if (isLiveTypingView) {
    if (promptsRevealed) {
      displayPromptLabel = "Revealed Prompt:";
      displayPromptText = finalPrompt || "No prompt submitted or revealed yet.";
    } else {
      if (typingPrompt) {
        displayPromptLabel = `${playerName || 'Player'} is typing:`;
        displayPromptText = typingPrompt;
      } else {
        displayPromptLabel = "Prompt Status:";
        displayPromptText = "Prompt is currently hidden by admin. Waiting for player to type or admin to reveal.";
      }
    }
  } else { // For player's own submission view or admin's view of final submissions
    displayPromptLabel = "Submitted Prompt:";
    if (isGenerating && !finalPrompt) {
      displayPromptText = "Generating based on your input...";
    } else {
      displayPromptText = finalPrompt || "No prompt submitted yet.";
    }
  }
  
  if (isGenerating && finalPrompt && !imageUrl) { // If generating from a submitted prompt
     displayPromptText = finalPrompt; // Show the prompt that's being used for generation
  }


  return (
    <Card className={cardClassName}>
      {playerName && (
        <CardHeader>
          <CardTitle className="font-headline">{playerName}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div>
          <CardDescription className="mb-1 text-sm">{displayPromptLabel}</CardDescription>
          <p className="text-base min-h-[60px] p-2 bg-muted rounded-md break-words">
            {displayPromptText}
          </p>
        </div>
        
        <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center overflow-hidden relative">
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
              <LoadingSpinner className="w-12 h-12 text-primary" />
              <p className="mt-2 text-sm text-primary-foreground">Generating Image...</p>
            </div>
          )}
          {imageUrl && !isGenerating ? (
            <Image
              src={imageUrl}
              alt={finalPrompt || typingPrompt || 'Generated image'}
              layout="fill"
              objectFit="cover"
              data-ai-hint="abstract digital"
              className="transition-opacity duration-500 ease-in-out opacity-100 hover:opacity-80"
            />
          ) : !isGenerating && isLiveTypingView && !promptsRevealed && !typingPrompt ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <EyeOff className="w-16 h-16 mb-2" />
              <p>Image Hidden Until Reveal</p>
            </div>
          ) : !isGenerating && (
             <div className="flex flex-col items-center justify-center text-muted-foreground">
              <ImageOff className="w-16 h-16 mb-2" />
              <p>No Image Available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
