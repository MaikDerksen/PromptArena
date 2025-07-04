
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { Game, GameStatus, PlayerKey, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateImage as genImageFlow } from '@/ai/flows/generate-image';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

const GAME_ID = "default-game"; 

export const IMAGE_MODELS = {
  'vertexai/gemini-1.5-flash-preview-0514': {
    name: 'Gemini 1.5 Flash (Fast)',
    cost: 1,
  },
  'vertexai/imagen-3.0-generate-002': {
    name: 'Imagen 3 (High Quality)',
    cost: 3,
  },
};

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
  imageModel: 'vertexai/gemini-1.5-flash-preview-0514',
  roundDuration: 60,
  roundEndsAt: null,
};

export function useGame() {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser, userProfile, refreshUserProfile } = useAuth(); // Get user from AuthContext

  useEffect(() => {
    setLoading(true);
    const gameDocRef = doc(db, "games", GAME_ID);

    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setGame({ id: docSnap.id, ...docSnap.data() } as Game);
      } else {
        try {
          console.log("Game document not found, attempting to initialize...");
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
    if (!currentUser) {
        toast({ title: "Authentication Error", description: "You must be logged in to update game data.", variant: "destructive" });
        return;
    }
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      await updateDoc(gameDocRef, { ...data, updatedAt: serverTimestamp() });
    } catch (e: any) {
      console.error("Error updating game data:", e);
      toast({ title: "Error", description: "Failed to update game.", variant: "destructive" });
      throw e; 
    }
  }, [toast, currentUser]);

  const setCentralPrompt = useCallback(async (prompt: string) => {
    await updateGameData({ prompt });
  }, [updateGameData]);

  const setImageModel = useCallback(async (modelId: string) => {
    await updateGameData({ imageModel: modelId });
    toast({title: "Model Updated", description: "Image generation model has been changed."});
  }, [updateGameData, toast]);

  const updatePlayerLastSeen = useCallback(async (player: PlayerKey) => {
    if (!currentUser) return; 
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    try {
      const gameDocRef = doc(db, "games", GAME_ID);
      await updateDoc(gameDocRef, { [lastSeenField]: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Error updating last seen:", e);
       toast({ title: "Error", description: "Failed to update player activity.", variant: "destructive" });
    }
  }, [currentUser, toast]);

  const updatePlayerTypingPrompt = useCallback(async (player: PlayerKey, typingPrompt: string) => {
    if (!currentUser) return;
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    
    const updates: Partial<Game> = {
      [typingField]: typingPrompt,
      [lastSeenField]: serverTimestamp(),
    };
    
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
        await updateDoc(gameDocRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (e) {
        console.error("Error updating typing prompt:", e);
        toast({ title: "Error", description: "Failed to update typing progress.", variant: "destructive" });
    }
  }, [currentUser, toast]);


  const submitPlayerPrompt = useCallback(async (player: PlayerKey, playerPrompt: string) => {
    if (!currentUser || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to submit a prompt.", variant: "destructive" });
      throw new Error("User not authenticated");
    }
    
    const gameModel = game?.imageModel || 'vertexai/gemini-1.5-flash-preview-0514';
    const cost = IMAGE_MODELS[gameModel as keyof typeof IMAGE_MODELS]?.cost || 1;

    if (userProfile.credits < cost) {
      toast({ title: "Insufficient Credits", description: "You do not have enough credits to generate an image.", variant: "destructive" });
      throw new Error("Insufficient credits");
    }

    const promptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const imageField = player === "playerOne" ? "playerOneImage" : "playerTwoImage";
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";

    const gameDocRef = doc(db, "games", GAME_ID);
    await updateDoc(gameDocRef, { 
      [promptField]: playerPrompt,
      [imageField]: "", 
      [typingField]: "", 
      [lastSeenField]: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    try {
      const { imageUrl: imageDataUri } = await genImageFlow({ prompt: playerPrompt, model: gameModel });

      if (!imageDataUri) {
        throw new Error("Image generation returned no data.");
      }
      
      const imageFileName = `${player}-${Date.now()}.png`;
      const imagePath = `user-images/${currentUser.uid}/default-game/${imageFileName}`;
      const sRef = storageRef(storage, imagePath);
      
      const uploadResult = await uploadString(sRef, imageDataUri, 'data_url');
      const downloadURL = await getDownloadURL(uploadResult.ref);

      const userDocRef = doc(db, 'users', currentUser.uid);
      await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists()) {
          throw "User document does not exist!";
        }
        const currentCredits = userDocSnap.data().credits;
        if (currentCredits < cost) {
          throw "Insufficient credits. Please purchase more.";
        }
        transaction.update(userDocRef, { credits: currentCredits - cost });
        transaction.update(gameDocRef, { [imageField]: downloadURL, [lastSeenField]: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      
      await refreshUserProfile();
      toast({ title: "Submission Successful", description: "Image generated!" });
      return downloadURL;

    } catch (e: any) {
      console.error(`Error in submitPlayerPrompt transaction for ${player}:`, e);
      const errorMessage = e.message || "An unknown error occurred during image processing.";
      toast({ title: "Image Processing Failed", description: errorMessage, variant: "destructive" });
      await updateDoc(gameDocRef, { [promptField]: "", [lastSeenField]: serverTimestamp(), updatedAt: serverTimestamp() });
      throw new Error(errorMessage);
    }
  }, [currentUser, userProfile, toast, refreshUserProfile, game?.imageModel]);
  
  const startRound = useCallback(async (durationInSeconds: number) => {
    if (isNaN(durationInSeconds) || durationInSeconds <= 0) {
        toast({title: "Invalid Duration", description: "Please select a valid round duration.", variant: "destructive"});
        return;
    }
    const endTime = Timestamp.fromMillis(Date.now() + durationInSeconds * 1000);
    await updateGameData({
      status: 'active',
      roundDuration: durationInSeconds,
      roundEndsAt: endTime,
    });
    toast({title: "Round Started!", description: `Players have ${durationInSeconds} seconds to submit.`});
  }, [updateGameData, toast]);

  const updateGameStatus = useCallback(async (status: 'waiting' | 'completed') => {
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
      roundEndsAt: null,
      roundDuration: game?.roundDuration || defaultGameData.roundDuration,
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
  }, [updateGameData, toast, game?.prompt, game?.roundDuration]);

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


  return { game, loading, error, setCentralPrompt, submitPlayerPrompt, updatePlayerTypingPrompt, startRound, updateGameStatus, revealImages, resetRound, resetGame, updatePlayerLastSeen, setImageModel };
}
