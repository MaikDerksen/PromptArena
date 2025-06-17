
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Game, GameStatus, PlayerKey } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateImage as genImageFlow } from '@/ai/flows/generate-image';

const GAME_ID = "default-game"; 

const defaultGameData: Game = {
  id: GAME_ID,
  prompt: "A cat riding a unicorn on the moon",
  playerOnePrompt: "",
  playerTwoPrompt: "",
  playerOneImage: "",
  playerTwoImage: "",
  status: "waiting",
  createdAt: null,
  updatedAt: null,
  playerOneTypingPrompt: "",
  playerTwoTypingPrompt: "",
  playerOneLastSeen: null,
  playerTwoLastSeen: null,
  imagesRevealed: false, // Changed from promptsRevealed
};

export function useGame() {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const gameDocRef = doc(db, "games", GAME_ID);

    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setGame({ id: docSnap.id, ...docSnap.data() } as Game);
      } else {
        try {
          await setDoc(gameDocRef, { ...defaultGameData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        } catch (e: any) {
          console.error("Error initializing game:", e);
          setError("Failed to initialize game data.");
          toast({ title: "Error", description: "Failed to initialize game data.", variant: "destructive" });
        }
      }
      setLoading(false);
    }, (e) => {
      console.error("Error fetching game data:", e);
      setError("Failed to fetch game data.");
      toast({ title: "Error", description: "Failed to fetch game data.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const updateGameData = useCallback(async (data: Partial<Game>) => {
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      await updateDoc(gameDocRef, { ...data, updatedAt: serverTimestamp() });
    } catch (e: any) {
      console.error("Error updating game data:", e);
      toast({ title: "Error", description: "Failed to update game.", variant: "destructive" });
      throw e; 
    }
  }, [toast]);

  const setCentralPrompt = useCallback(async (prompt: string) => {
    await updateGameData({ prompt });
  }, [updateGameData]);

  const updatePlayerTypingPrompt = useCallback(async (player: PlayerKey, typingPrompt: string) => {
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    // If player clears input, also clear final prompt if no image is generated yet
    // This allows re-submission before image generation if they clear the input
    const finalPromptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const imageField = player === "playerOne" ? "playerOneImage" : "playerTwoImage";
    
    const updates: Partial<Game> = {
      [typingField]: typingPrompt,
      [lastSeenField]: serverTimestamp(),
    };

    if (typingPrompt === "" && game && !game[imageField]) {
      updates[finalPromptField] = ""; // Allow clearing final prompt if no image yet
    }

    await updateGameData(updates);
  }, [updateGameData, game]);

  const submitPlayerPrompt = useCallback(async (player: PlayerKey, playerPrompt: string) => {
    const promptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const imageField = player === "playerOne" ? "playerOneImage" : "playerTwoImage";
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";

    await updateGameData({ 
      [promptField]: playerPrompt,
      [typingField]: "", 
      [lastSeenField]: serverTimestamp()
    });

    try {
      const { imageUrl } = await genImageFlow({ prompt: playerPrompt });
      await updateGameData({ [imageField]: imageUrl });
      toast({ title: "Submission Successful", description: `${player === "playerOne" ? "Player One's" : "Player Two's"} image generated.` });
      return imageUrl;
    } catch (e: any) {
      console.error(`Error generating image for ${player}:`, e);
      toast({ title: "Image Generation Failed", description: e.message || "Could not generate image.", variant: "destructive" });
      // Clear the image field if generation fails so it doesn't show a broken/old one
      await updateGameData({ [imageField]: "" });
      throw e;
    }
  }, [updateGameData, toast]);
  
  const updateGameStatus = useCallback(async (status: GameStatus) => {
    await updateGameData({ status });
    toast({title: "Game Status Updated", description: `Status set to ${status}.`});
  }, [updateGameData, toast]);
  
  const revealImages = useCallback(async () => { // Renamed from revealPrompts
    await updateGameData({ imagesRevealed: true });
    toast({title: "Images Revealed", description: "Player images are now visible to viewers."});
  }, [updateGameData, toast]);

  const resetRound = useCallback(async (newCentralPrompt?: string) => {
    const updates: Partial<Game> = {
      playerOnePrompt: "",
      playerOneImage: "",
      playerTwoPrompt: "",
      playerTwoImage: "",
      playerOneTypingPrompt: "",
      playerTwoTypingPrompt: "",
      playerOneLastSeen: null,
      playerTwoLastSeen: null,
      imagesRevealed: false, // Changed from promptsRevealed
      status: "waiting",
    };
    if (newCentralPrompt !== undefined) {
      updates.prompt = newCentralPrompt;
    }
    await updateGameData(updates);
    toast({title: "Round Reset", description: "Player submissions cleared, ready for a new round."});
  }, [updateGameData, toast]);

  const resetGame = useCallback(async () => {
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      const existingCreatedAt = game?.createdAt || serverTimestamp();
      await setDoc(gameDocRef, { ...defaultGameData, createdAt: existingCreatedAt, updatedAt: serverTimestamp() });
      toast({ title: "Game Reset", description: "The entire game has been reset to defaults." });
    } catch (e:any) {
      console.error("Error resetting game:", e);
      toast({ title: "Error", description: "Failed to reset game.", variant: "destructive" });
    }
  }, [toast, game?.createdAt]);


  return { game, loading, error, updateGameData, setCentralPrompt, submitPlayerPrompt, updatePlayerTypingPrompt, updateGameStatus, revealImages, resetRound, resetGame };
}
