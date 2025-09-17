
'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp, updateDoc, Timestamp, runTransaction, collection, addDoc, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { Game, GameStatus, PlayerKey, GeneratedImage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateImage as genImageFlow } from '@/ai/flows/generate-image';
import { useAuth } from '@/contexts/auth-context';

const GAME_ID = "default-game"; 

export const IMAGE_MODELS = {
  'gemini-2.0-flash-preview-image-generation': {
    name: 'Gemini 2.0 Flash (Fast)',
    cost: 1,
  },
  'imagen-3.0-generate-002': {
    name: 'Imagen 3 (High Quality)',
    cost: 3,
  },
  'imagen-4.0-generate-preview-06-06': {
    name: 'Imagen 4 (Advanced)',
    cost: 5,
  },
  'imagen-4.0-ultra-generate-preview-06-06': {
    name: 'Imagen 4 Ultra (Top Tier)',
    cost: 8,
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
  imageModel: 'gemini-2.0-flash-preview-image-generation',
  roundDuration: 60,
  roundEndsAt: null,
  playerOneAccessToken: "",
  playerTwoAccessToken: "",
  playerOneConnected: false,
  playerTwoConnected: false,
  isGenerating: false,
};

export function useGame() {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { currentUser, userProfile, refreshUserProfile } = useAuth();

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

  const setImageModel = useCallback(async (modelId: string) => {
    await updateGameData({ imageModel: modelId });
    toast({title: "Model Updated", description: "Image generation model has been changed."});
  }, [updateGameData, toast]);

  const updatePlayerLastSeen = useCallback(async (player: PlayerKey, userId: string | null = null) => {
    if (!userId && !currentUser) return;
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    try {
      const gameDocRef = doc(db, "games", GAME_ID);
      await updateDoc(gameDocRef, { [lastSeenField]: serverTimestamp(), updatedAt: serverTimestamp() });
    } catch (e) {
      console.error("Error updating last seen:", e);
       toast({ title: "Error", description: "Failed to update player activity.", variant: "destructive" });
    }
  }, [currentUser, toast]);

  const updatePlayerTypingPrompt = useCallback(async (player: PlayerKey, typingPrompt: string, userId: string | null = null) => {
    if (!userId && !currentUser) return;
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

  const submitPlayerPrompt = useCallback(async (player: PlayerKey, playerPrompt: string, userId: string) => {
    const promptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    
    try {
        await updateGameData({ 
            [promptField]: playerPrompt,
            [typingField]: "",
            [lastSeenField]: serverTimestamp(),
        });
        toast({ title: "Prompt Submitted!", description: "Your prompt has been locked in. Waiting for admin to generate images." });
    } catch(e) {
        console.error("Error submitting prompt:", e);
        toast({ title: "Error", description: "Could not submit your prompt. Please try again.", variant: "destructive" });
        throw e;
    }
  }, [updateGameData, toast]);

   const endRoundAndFinalizePrompts = useCallback(async () => {
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      const gameSnap = await getDoc(gameDocRef);
      if (!gameSnap.exists()) {
        throw new Error("Game document does not exist!");
      }
      
      const currentGameData = gameSnap.data() as Game;
      const isTimeUp = currentGameData.roundEndsAt ? new Date() > (currentGameData.roundEndsAt as Timestamp).toDate() : false;

      // Only proceed if the round is active and time is up.
      if (currentGameData.status !== 'active' || !isTimeUp) {
        return; 
      }
      
      const updates: Partial<Game> = { status: 'completed', updatedAt: serverTimestamp() };

      if (!currentGameData.playerOnePrompt) {
        updates.playerOnePrompt = currentGameData.playerOneTypingPrompt || "No prompt submitted in time.";
        updates.playerOneTypingPrompt = "";
      }
      if (!currentGameData.playerTwoPrompt) {
        updates.playerTwoPrompt = currentGameData.playerTwoTypingPrompt || "No prompt submitted in time.";
        updates.playerTwoTypingPrompt = "";
      }
      
      await updateDoc(gameDocRef, updates);
      toast({ title: "Round Over!", description: "Prompts have been finalized automatically." });
    } catch (e: any) {
      console.error("Error finalizing round:", e);
      toast({ title: "Finalization Failed", description: e.message, variant: "destructive" });
      throw e;
    }
  }, [toast]);
  
  const generateImagesForPlayers = useCallback(async () => {
    if (!currentUser || !userProfile) {
      toast({ title: "Host Error", description: "The game host must be logged in to generate images.", variant: "destructive" });
      throw new Error("Game host not authenticated for image generation.");
    }
    
    if (!game || !game.playerOnePrompt || !game.playerTwoPrompt) {
      toast({ title: "Generation Error", description: "Both players must submit a prompt before generating images.", variant: "destructive" });
      throw new Error("Prompts are missing.");
    }

    const gameModel = game.imageModel || 'gemini-2.0-flash-preview-image-generation';
    const costPerImage = IMAGE_MODELS[gameModel as keyof typeof IMAGE_MODELS]?.cost || 1;
    const totalCost = costPerImage * 2;

    if (userProfile.credits < totalCost) {
      toast({ title: "Insufficient Credits", description: `The host needs at least ${totalCost} credits to generate both images.`, variant: "destructive" });
      throw new Error("Insufficient credits.");
    }

    await updateGameData({ isGenerating: true });

    try {
      const generateAndUpload = async (prompt: string, playerKey: PlayerKey): Promise<{url: string, imageData: GeneratedImage}> => {
        const { imageUrl: imageDataUri } = await genImageFlow({ prompt, model: gameModel });
        if (!imageDataUri) throw new Error(`Image generation failed for ${playerKey}.`);
        
        const imageFileName = `${playerKey}-${Date.now()}.png`;
        const imagePath = `user-images/${currentUser.uid}/default-game/${imageFileName}`;
        const sRef = storageRef(storage, imagePath);
        
        const uploadResult = await uploadString(sRef, imageDataUri, 'data_url');
        const downloadURL = await getDownloadURL(uploadResult.ref);

        const generatedImageData: GeneratedImage = {
            userId: currentUser.uid,
            imageUrl: downloadURL,
            prompt,
            playerKey,
            createdAt: Timestamp.now(),
            model: gameModel,
        };
        return { url: downloadURL, imageData: generatedImageData };
      };

      const [playerOneResult, playerTwoResult] = await Promise.all([
        generateAndUpload(game.playerOnePrompt, 'playerOne'),
        generateAndUpload(game.playerTwoPrompt, 'playerTwo')
      ]);

      const userDocRef = doc(db, 'users', currentUser.uid);
      const gameDocRef = doc(db, "games", GAME_ID);
      const p1ImageDocRef = collection(db, 'generated_images');
      const p2ImageDocRef = collection(db, 'generated_images');

      await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists() || userDocSnap.data().credits < totalCost) {
          throw new Error("Insufficient credits.");
        }
        
        transaction.update(userDocRef, { credits: userDocSnap.data().credits - totalCost });
        
        transaction.update(gameDocRef, { 
          playerOneImage: playerOneResult.url,
          playerTwoImage: playerTwoResult.url,
          isGenerating: false,
        });

        transaction.set(doc(p1ImageDocRef), playerOneResult.imageData);
        transaction.set(doc(p2ImageDocRef), playerTwoResult.imageData);
      });

      await refreshUserProfile();
      toast({ title: "Images Generated!", description: "Both images have been successfully generated." });

    } catch (e: any) {
      console.error("Error generating images for players:", e);
      toast({ title: "Image Generation Failed", description: e.message || "An unknown error occurred.", variant: "destructive" });
      await updateGameData({ isGenerating: false });
      throw e;
    }
  }, [currentUser, userProfile, game, toast, updateGameData, refreshUserProfile]);
  
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
      isGenerating: false,
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
        const imagesQuery = query(collection(db, 'generated_images'), where('userId', '!=', '')); 
        const imagesSnapshot = await getDocs(imagesQuery);
        const batch = writeBatch(db);
        
        let hostUid: string | null = null;
        if (!imagesSnapshot.empty) {
            hostUid = imagesSnapshot.docs[0].data().userId;
            imagesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        if (hostUid) {
            const gameStorageRef = storageRef(storage, `user-images/${hostUid}/default-game`);
            const files = await listAll(gameStorageRef);
            await Promise.all(files.items.map(fileRef => deleteObject(fileRef)));
        }

    } catch(e) {
        console.error("Could not clear previous game images, proceeding with game reset.", e);
    }

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


  const generateNewSessionCodes = useCallback(async () => {
    const generateToken = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const playerOneToken = generateToken();
    const playerTwoToken = generateToken();
    
    await updateGameData({
      playerOneAccessToken: playerOneToken,
      playerTwoAccessToken: playerTwoToken,
      playerOneConnected: false,
      playerTwoConnected: false,
    });
    
    toast({ title: "New Session Codes Generated", description: "Previous player links are now invalid." });
    return { playerOneToken, playerTwoToken };
  }, [updateGameData, toast]);

  const connectPlayerWithToken = useCallback(async (playerKey: PlayerKey) => {
    const gameDocRef = doc(db, "games", GAME_ID);
    const connectionField = playerKey === 'playerOne' ? 'playerOneConnected' : 'playerTwoConnected';
    const lastSeenField = playerKey === 'playerOne' ? 'playerOneLastSeen' : 'playerTwoLastSeen';
    try {
        await updateDoc(gameDocRef, { 
            [connectionField]: true,
            [lastSeenField]: serverTimestamp(),
            updatedAt: serverTimestamp() 
        });
        return true;
    } catch (e) {
        console.error("Failed to connect player:", e);
        return false;
    }
  }, []);

  const disconnectPlayer = useCallback(async (playerKey: PlayerKey) => {
    const gameDocRef = doc(db, "games", GAME_ID);
    const connectionField = playerKey === 'playerOne' ? 'playerOneConnected' : 'playerTwoConnected';
    try {
      await updateDoc(gameDocRef, { 
        [connectionField]: false,
        updatedAt: serverTimestamp() 
      });
    } catch (e) {
      console.error("Failed to disconnect player:", e);
    }
  }, []);


  return { game, loading, error, setCentralPrompt, submitPlayerPrompt, updatePlayerTypingPrompt, startRound, updateGameStatus, revealImages, resetRound, resetGame, updatePlayerLastSeen, setImageModel, generateNewSessionCodes, connectPlayerWithToken, disconnectPlayer, generateImagesForPlayers, endRoundAndFinalizePrompts };
}
