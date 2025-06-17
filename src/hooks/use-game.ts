
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage, app } from '@/lib/firebase'; // Added storage and app
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

    if (typingPrompt === "" && game && !game[imageField]) { 
      updates[finalPromptField] = ""; 
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
      [imageField]: "", 
      [typingField]: "", 
      [lastSeenField]: serverTimestamp()
    });

    try {
      // 1. Generate image (returns a base64 data URI)
      const { imageUrl: imageDataUri } = await genImageFlow({ prompt: playerPrompt });

      if (!imageDataUri) {
        throw new Error("Image generation returned no data.");
      }
      
      // 2. Upload image data URI to Firebase Storage
      const imageFileName = `${player}-${Date.now()}.png`;
      const imagePath = `game-images/${GAME_ID}/${imageFileName}`;
      const sRef = storageRef(storage, imagePath);
      
      const uploadResult = await uploadString(sRef, imageDataUri, 'data_url');
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // 3. Update Firestore with the download URL
      await updateGameData({ [imageField]: downloadURL, [lastSeenField]: serverTimestamp() });
      toast({ title: "Submission Successful", description: `${player === "playerOne" ? "Player One's" : "Player Two's"} image generated and stored.` });
      return downloadURL;

    } catch (e: any) {
      console.error(`Error processing image for ${player}:`, e);
      toast({ title: "Image Processing Failed", description: e.message || "Could not generate or store image.", variant: "destructive" });
      // Optionally clear the prompt if submission fails critically
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
      playerOneLastSeen: null, 
      playerTwoLastSeen: null,
    };
    if (newCentralPrompt !== undefined && newCentralPrompt.trim() !== "") {
      updates.prompt = newCentralPrompt;
    } else if (game?.prompt) {
      updates.prompt = game.prompt; 
    } else {
      updates.prompt = defaultGameData.prompt; 
    }
    await updateGameData(updates);
    toast({title: "Round Reset", description: "Player submissions cleared, ready for a new round."});
  }, [updateGameData, toast, game?.prompt]);

  const resetGame = useCallback(async () => {
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      const existingCreatedAt = game?.createdAt || serverTimestamp(); 
      const gameDataToSet = { ...defaultGameData, createdAt: existingCreatedAt, updatedAt: serverTimestamp()};
      await setDoc(gameDocRef, gameDataToSet);
      toast({ title: "Game Reset", description: "The entire game has been reset to defaults." });
    } catch (e:any) {
      console.error("Error resetting game:", e);
      toast({ title: "Error", description: "Failed to reset game.", variant: "destructive" });
    }
  }, [toast, game?.createdAt]);


  return { game, loading, error, updateGameData, setCentralPrompt, submitPlayerPrompt, updatePlayerTypingPrompt, updateGameStatus, revealImages, resetRound, resetGame, updatePlayerLastSeen };
}
