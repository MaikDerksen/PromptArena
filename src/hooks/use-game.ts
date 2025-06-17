import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, onSnapshot, Timestamp, serverTimestamp, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Game, GameStatus, PlayerKey } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateImage as genImageFlow } from '@/ai/flows/generate-image';

const GAME_ID = "default-game"; // Using a fixed game ID for simplicity

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
        // Initialize game if it doesn't exist
        try {
          await setDoc(gameDocRef, { ...defaultGameData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          // The snapshot listener will pick up the new doc, or we can set it directly
          // setGame(defaultGameData); // This might cause a flicker if snapshot is fast
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
      toast({ title: "Success", description: "Game updated successfully." });
    } catch (e: any) {
      console.error("Error updating game data:", e);
      toast({ title: "Error", description: "Failed to update game.", variant: "destructive" });
      throw e; // Re-throw to allow specific error handling in components
    }
  }, [toast]);

  const setCentralPrompt = useCallback(async (prompt: string) => {
    await updateGameData({ prompt });
  }, [updateGameData]);

  const submitPlayerPrompt = useCallback(async (player: PlayerKey, playerPrompt: string) => {
    const promptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const imageField = player === "playerOne" ? "playerOneImage" : "playerTwoImage";

    await updateGameData({ [promptField]: playerPrompt });

    try {
      const { imageUrl } = await genImageFlow({ prompt: playerPrompt });
      await updateGameData({ [imageField]: imageUrl });
      return imageUrl;
    } catch (e: any) {
      console.error(`Error generating image for ${player}:`, e);
      toast({ title: "Image Generation Failed", description: e.message || "Could not generate image.", variant: "destructive" });
      // Clear the prompt if image generation fails? Or leave it to show the attempt?
      // For now, leave it.
      throw e;
    }
  }, [updateGameData, toast]);
  
  const updateGameStatus = useCallback(async (status: GameStatus) => {
    await updateGameData({ status });
  }, [updateGameData]);

  const resetRound = useCallback(async (newCentralPrompt?: string) => {
    const updates: Partial<Game> = {
      playerOnePrompt: "",
      playerOneImage: "",
      playerTwoPrompt: "",
      playerTwoImage: "",
      status: "waiting",
    };
    if (newCentralPrompt !== undefined) {
      updates.prompt = newCentralPrompt;
    }
    await updateGameData(updates);
  }, [updateGameData]);

  const resetGame = useCallback(async () => {
    // This will reset to default structure but keep createdAt.
    // Or we can delete and re-initialize, but update is simpler.
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      await setDoc(gameDocRef, { ...defaultGameData, createdAt: game?.createdAt || serverTimestamp(), updatedAt: serverTimestamp() });
      toast({ title: "Game Reset", description: "The game has been reset." });
    } catch (e:any) {
      console.error("Error resetting game:", e);
      toast({ title: "Error", description: "Failed to reset game.", variant: "destructive" });
    }
  }, [toast, game?.createdAt]);


  return { game, loading, error, updateGameData, setCentralPrompt, submitPlayerPrompt, updateGameStatus, resetRound, resetGame };
}
