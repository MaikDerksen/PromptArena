
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import AuthGuard from '@/components/auth-guard';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { GeneratedImage } from '@/lib/types';
import LoadingSpinner from '@/components/loading-spinner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Download, Image as ImageIcon, User, Quote, Palette } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function GalleryPageContent() {
  const { currentUser } = useAuth();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!currentUser) return;
      setLoading(true);
      setError(null);
      try {
        const q = query(
          collection(db, 'generated_images'),
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetchedImages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GeneratedImage));
        setImages(fetchedImages);
      } catch (err: any) {
        console.error("Error fetching images:", err);
        setError(err.message || 'Failed to load your images.');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [currentUser]);

  const handleDownload = (imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    // To bypass potential CORS issues for direct download, we can fetch as blob
    // However, for Firebase Storage URLs, a simple download attribute often works if configured correctly.
    // For wider compatibility, opening in a new tab is a reliable fallback.
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = `promptarena-image-${Date.now()}.png`; // Suggested filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <LoadingSpinner className="w-16 h-16 text-primary" />
        <p className="mt-4 text-xl font-semibold">Loading Your Gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Alert variant="destructive" className="w-full max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Gallery</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="text-center shadow-xl border-primary border-2">
        <CardHeader>
          <CardTitle className="font-headline text-4xl flex items-center justify-center gap-3">
            <Palette className="w-10 h-10 text-primary" /> My Image Gallery
          </CardTitle>
          <CardDescription>A collection of all the images you have generated in PromptArena.</CardDescription>
        </CardHeader>
      </Card>

      {images.length === 0 ? (
        <Alert>
          <ImageIcon className="h-4 w-4" />
          <AlertTitle>Your Gallery is Empty</AlertTitle>
          <AlertDescription>
            You haven't generated any images yet. Go to a player page and submit a prompt to start your collection!
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {images.map(image => (
            <Card
              key={image.id}
              className="group overflow-hidden cursor-pointer relative transition-all duration-300 hover:shadow-primary/40 hover:shadow-lg hover:-translate-y-1"
              onClick={() => setSelectedImage(image)}
            >
              <div className="aspect-square w-full">
                <Image
                  src={image.imageUrl}
                  alt={image.prompt}
                  layout="fill"
                  objectFit="cover"
                  className="transition-transform duration-300 group-hover:scale-105"
                  data-ai-hint="gallery abstract"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-2">
                <p className="text-white text-xs line-clamp-2">{image.prompt}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={(isOpen) => !isOpen && setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Image Details</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="aspect-square w-full bg-muted rounded-md flex items-center justify-center overflow-hidden relative">
                    <Image 
                        src={selectedImage.imageUrl} 
                        alt={selectedImage.prompt} 
                        layout="fill"
                        objectFit="contain"
                    />
                </div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary"/>Created By</h3>
                        <p className="text-muted-foreground">{selectedImage.playerKey === 'playerOne' ? 'Player One' : 'Player Two'}</p>
                    </div>
                     <div className="space-y-1">
                        <h3 className="font-semibold flex items-center gap-2"><Quote className="h-4 w-4 text-primary"/>Prompt</h3>
                        <p className="p-3 bg-muted rounded-md text-muted-foreground break-words">{selectedImage.prompt}</p>
                    </div>
                    <Button onClick={() => handleDownload(selectedImage.imageUrl)} className="w-full">
                        <Download className="mr-2 h-4 w-4"/> Download Image
                    </Button>
                </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <AuthGuard>
      <GalleryPageContent />
    </AuthGuard>
  );
}
