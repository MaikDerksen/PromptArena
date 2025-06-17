
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from './loading-spinner';
import { ImageOff, EyeOff } from 'lucide-react';

interface ImageCardProps {
  playerName?: string;
  finalPrompt: string | null; 
  typingPrompt?: string | null; 
  imageUrl: string | null;
  isGenerating?: boolean;
  cardClassName?: string;
  imagesRevealed: boolean; 
  isLiveTypingView?: boolean; 
}

export default function ImageCard({ 
  playerName, 
  finalPrompt, 
  typingPrompt, 
  imageUrl, 
  isGenerating, 
  cardClassName,
  imagesRevealed,
  isLiveTypingView 
}: ImageCardProps) {

  let displayPromptText = "No prompt information available.";
  let displayPromptLabel = "Prompt Status:";

  if (isLiveTypingView) { // For Viewer page
    if (typingPrompt) {
      displayPromptLabel = `${playerName || 'Player'} is typing:`;
      displayPromptText = typingPrompt;
    } else if (finalPrompt) {
      displayPromptLabel = "Submitted Prompt:";
      displayPromptText = finalPrompt;
    } else {
      displayPromptLabel = "Prompt Status:";
      displayPromptText = "Waiting for player to type or submit...";
    }
  } else { // For player's own submission view or admin's view
    displayPromptLabel = "Submitted Prompt:";
    if (isGenerating && !finalPrompt) {
      displayPromptText = "Generating based on your input...";
    } else {
      displayPromptText = finalPrompt || "No prompt submitted yet.";
    }
  }
  
  // If actively generating from a submitted prompt, ensure the submitted prompt is shown
  if (isGenerating && finalPrompt && !imageUrl) {
     displayPromptText = finalPrompt; 
     if (!isLiveTypingView) displayPromptLabel = "Submitted Prompt (Generating):";
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

          {imageUrl && !isGenerating && (isLiveTypingView ? imagesRevealed : true) ? (
            <Image
              src={imageUrl}
              alt={finalPrompt || typingPrompt || 'Generated image'}
              layout="fill"
              objectFit="cover"
              data-ai-hint="abstract digital"
              className="transition-opacity duration-500 ease-in-out opacity-100 hover:opacity-80"
            />
          ) : imageUrl && !isGenerating && isLiveTypingView && !imagesRevealed ? (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <EyeOff className="w-16 h-16 mb-2" />
              <p>Image Hidden Until Admin Reveal</p>
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
