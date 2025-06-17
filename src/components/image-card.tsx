import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSpinner from './loading-spinner';
import { ImageOff } from 'lucide-react';

interface ImageCardProps {
  playerName?: string;
  prompt: string | null;
  imageUrl: string | null;
  isGenerating?: boolean;
  cardClassName?: string;
}

export default function ImageCard({ playerName, prompt, imageUrl, isGenerating, cardClassName }: ImageCardProps) {
  return (
    <Card className={cardClassName}>
      {playerName && (
        <CardHeader>
          <CardTitle className="font-headline">{playerName}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-4">
        <div>
          <CardDescription className="mb-1 text-sm">Submitted Prompt:</CardDescription>
          <p className="text-base min-h-[40px] p-2 bg-muted rounded-md break-words">
            {prompt || (isGenerating ? "Generating..." : "No prompt submitted yet.")}
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
              alt={prompt || 'Generated image'}
              layout="fill"
              objectFit="cover"
              data-ai-hint="abstract digital"
              className="transition-opacity duration-500 ease-in-out opacity-100 hover:opacity-80"
            />
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
