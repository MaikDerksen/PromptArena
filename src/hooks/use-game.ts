
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
  imagesRevealed: false,
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
          // setGame(defaultGameData); // Set game state after initialization
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

  const updatePlayerLastSeen = useCallback(async (player: PlayerKey) => {
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    try {
      await updateGameData({ [lastSeenField]: serverTimestamp() });
    } catch (e) {
      // Error already handled by updateGameData
    }
  }, [updateGameData]);

  const updatePlayerTypingPrompt = useCallback(async (player: PlayerKey, typingPrompt: string) => {
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    const finalPromptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const imageField = player === "playerOne" ? "playerOneImage" : "playerTwoImage";
    
    const updates: Partial<Game> = {
      [typingField]: typingPrompt,
      [lastSeenField]: serverTimestamp(),
    };

    // If player clears input, also clear final prompt *and image* if no image is generated yet or if they are allowed to resubmit
    // Current logic in PlayerPromptForm handles enabling/disabling submit, this just ensures data consistency.
    if (typingPrompt === "" && game && !game[imageField]) { 
        // If they clear typing, and no image exists for their final prompt, 
        // clear the final prompt too. This means they abandoned that submission attempt.
        // The image field itself is not cleared here, only on new submission or reset.
      updates[finalPromptField] = ""; 
    }


    await updateGameData(updates);
  }, [updateGameData, game]);

  const submitPlayerPrompt = useCallback(async (player: PlayerKey, playerPrompt: string) => {
    const promptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const imageField = player === "playerOne" ? "playerOneImage" : "playerTwoImage";
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";

    // Clear previous image for this player before generating a new one
    await updateGameData({ 
      [promptField]: playerPrompt,
      [imageField]: "", // Clear existing image for this player
      [typingField]: "", // Clear typing prompt after submission
      [lastSeenField]: serverTimestamp()
    });

    try {
      const { imageUrl } = await genImageFlow({ prompt: playerPrompt });
      await updateGameData({ [imageField]: imageUrl, [lastSeenField]: serverTimestamp() }); // Update lastSeen again after image gen
      toast({ title: "Submission Successful", description: `${player === "playerOne" ? "Player One's" : "Player Two's"} image generated.` });
      return imageUrl;
    } catch (e: any) {
      console.error(`Error generating image for ${player}:`, e);
      toast({ title: "Image Generation Failed", description: e.message || "Could not generate image.", variant: "destructive" });
      // The image field was already cleared, so no need to clear it again on error here.
      // We might want to clear the promptField if generation fails and they should retry
      // await updateGameData({ [promptField]: "", [lastSeenField]: serverTimestamp() });
      throw e;
    }
  }, [updateGameData, toast]);
  
  const updateGameStatus = useCallback(async (status: GameStatus) => {
    await updateGameData({ status });
    toast({title: "Game Status Updated", description: `Status set to ${status}.`});
  }, [updateGameData, toast]);
  
  const revealImages = useCallback(async () => { 
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
      imagesRevealed: false, 
      status: "waiting",
      // Keep playerOneLastSeen and playerTwoLastSeen as they are, or set to null?
      // Setting to null might be better to indicate they are not "active" in the new round yet.
      playerOneLastSeen: null, 
      playerTwoLastSeen: null,
    };
    if (newCentralPrompt !== undefined && newCentralPrompt.trim() !== "") {
      updates.prompt = newCentralPrompt;
    } else if (game?.prompt) {
      updates.prompt = game.prompt; // Keep current prompt if no new one provided
    } else {
      updates.prompt = defaultGameData.prompt; // Fallback to default if nothing else
    }
    await updateGameData(updates);
    toast({title: "Round Reset", description: "Player submissions cleared, ready for a new round."});
  }, [updateGameData, toast, game?.prompt]);

  const resetGame = useCallback(async () => {
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      const existingCreatedAt = game?.createdAt || serverTimestamp(); // Preserve original creation time
      // Reset all fields to default, but keep createdAt
      const gameDataToSet = { ...defaultGameData, createdAt: existingCreatedAt, updatedAt: serverTimestamp()};
      await setDoc(gameDocRef, gameDataToSet);
      // setGame(gameDataToSet as Game); // Update local state immediately
      toast({ title: "Game Reset", description: "The entire game has been reset to defaults." });
    } catch (e:any) {
      console.error("Error resetting game:", e);
      toast({ title: "Error", description: "Failed to reset game.", variant: "destructive" });
    }
  }, [toast, game?.createdAt]);


  return { game, loading, error, updateGameData, setCentralPrompt, submitPlayerPrompt, updatePlayerTypingPrompt, updateGameStatus, revealImages, resetRound, resetGame, updatePlayerLastSeen };
}
