
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from './loading-spinner';
import { ImageOff, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  
  if (isGenerating && finalPrompt && !imageUrl) {
     displayPromptText = finalPrompt; 
     if (!isLiveTypingView) displayPromptLabel = "Submitted Prompt (Generating):";
  }


  return (
    <Card className={cn(cardClassName, "flex flex-col")}> {/* Card is flex col, allows it to stretch vertically */}
      {playerName && (
        <CardHeader className="flex-shrink-0"> {/* Header does not grow/shrink */}
          <CardTitle className="font-headline">{playerName}</CardTitle>
        </CardHeader>
      )}
      {/* CardContent takes up remaining vertical space and is a flex column */}
      <CardContent className="flex flex-col flex-grow p-6"> 
        
        {/* Prompt Section - this container will grow vertically */}
        <div className="flex flex-col flex-grow mb-4"> 
          <CardDescription className="mb-1 text-sm flex-shrink-0">{displayPromptLabel}</CardDescription>
          <p 
            className="text-base p-2 bg-muted rounded-md w-full flex-grow min-h-[60px] overflow-y-auto" // p tag grows, has min height, and scrolls if content overflows
            style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }} // Ensures long words without spaces also wrap
          >
            {displayPromptText}
          </p>
        </div>
        
        {/* Image Section - fixed aspect ratio, does not grow/shrink, pushed to bottom by prompt section's growth */}
        <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center overflow-hidden relative flex-shrink-0">
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
