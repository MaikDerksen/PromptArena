
import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, serverTimestamp, updateDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { ref as storageRef, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import type { Game, GameStatus, PlayerKey, UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { generateImage as genImageFlow } from '@/ai/flows/generate-image';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

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
  const { currentUser, userProfile, refreshUserProfile } = useAuth(); // Get user from AuthContext

  useEffect(() => {
    setLoading(true);
    const gameDocRef = doc(db, "games", GAME_ID);

    const unsubscribe = onSnapshot(gameDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        setGame({ id: docSnap.id, ...docSnap.data() } as Game);
      } else {
        try {
          // Only attempt to initialize if no game doc exists
          // This prevents re-initialization on every listener trigger if doc is deleted
          if (!game) { 
            await setDoc(gameDocRef, { ...defaultGameData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          }
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
  }, [toast, game]); // Added game to dependency array to handle re-initialization case

  const updateGameData = useCallback(async (data: Partial<Game>) => {
    if (!currentUser) { // Ensure user is logged in for most updates
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
    // Admin action, assumes admin is logged in (checked by AuthGuard on admin page)
    await updateGameData({ prompt });
  }, [updateGameData]);

  const updatePlayerLastSeen = useCallback(async (player: PlayerKey) => {
    // This action doesn't strictly need auth for game data, but good practice
    if (!currentUser) return; 
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";
    try {
      // Use Firestore updateDoc for this specific field without needing full updateGameData context
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
    const finalPromptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    
    const updates: Partial<Game> = {
      [typingField]: typingPrompt,
      [lastSeenField]: serverTimestamp(),
    };

    // If typing prompt is cleared and the player hasn't submitted a final prompt yet, clear their final prompt too
    // This is to ensure the viewer doesn't see a stale final prompt if player clears input before submitting
    const currentGame = game; // Get current game state
    if (typingPrompt === "" && currentGame && !currentGame[finalPromptField as keyof Game]) {
       // Only clear final prompt if it was never set (i.e., no image generated for it)
       // This might need more nuanced logic based on game flow
    }
    
    // Use Firestore updateDoc directly for responsiveness
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
        await updateDoc(gameDocRef, { ...updates, updatedAt: serverTimestamp() });
    } catch (e) {
        console.error("Error updating typing prompt:", e);
        toast({ title: "Error", description: "Failed to update typing progress.", variant: "destructive" });
    }
  }, [currentUser, game, toast]);


  const submitPlayerPrompt = useCallback(async (player: PlayerKey, playerPrompt: string) => {
    if (!currentUser || !userProfile) {
      toast({ title: "Authentication Error", description: "You must be logged in to submit a prompt.", variant: "destructive" });
      throw new Error("User not authenticated");
    }

    if (userProfile.credits <= 0) {
      toast({ title: "Insufficient Credits", description: "You do not have enough credits to generate an image.", variant: "destructive" });
      throw new Error("Insufficient credits");
    }

    const promptField = player === "playerOne" ? "playerOnePrompt" : "playerTwoPrompt";
    const imageField = player === "playerOne" ? "playerOneImage" : "playerTwoImage";
    const typingField = player === "playerOne" ? "playerOneTypingPrompt" : "playerTwoTypingPrompt";
    const lastSeenField = player === "playerOne" ? "playerOneLastSeen" : "playerTwoLastSeen";

    // Update game doc with the final prompt first
    const gameDocRef = doc(db, "games", GAME_ID);
    await updateDoc(gameDocRef, { 
      [promptField]: playerPrompt,
      [imageField]: "", // Clear previous image for this player slot
      [typingField]: "", 
      [lastSeenField]: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Attempt to delete old image if exists for this player slot from global game
    // This is tricky because the image URL might be from a different user if multiple users play on same game doc
    // For now, we will not delete old images from storage to keep it simple, but this could be a future enhancement.

    try {
      const { imageUrl: imageDataUri } = await genImageFlow({ prompt: playerPrompt });

      if (!imageDataUri) {
        throw new Error("Image generation returned no data.");
      }
      
      const imageFileName = `${player}-${Date.now()}.png`;
      // User-specific storage path
      const imagePath = `user-images/${currentUser.uid}/default-game/${imageFileName}`;
      const sRef = storageRef(storage, imagePath);
      
      const uploadResult = await uploadString(sRef, imageDataUri, 'data_url');
      const downloadURL = await getDownloadURL(uploadResult.ref);

      // Deduct credit and update image URL in Firestore Transaction
      const userDocRef = doc(db, 'users', currentUser.uid);
      await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userDocRef);
        if (!userDocSnap.exists()) {
          throw "User document does not exist!";
        }
        const currentCredits = userDocSnap.data().credits;
        if (currentCredits <= 0) {
          throw "Insufficient credits (checked again in transaction).";
        }
        transaction.update(userDocRef, { credits: currentCredits - 1 });
        transaction.update(gameDocRef, { [imageField]: downloadURL, [lastSeenField]: serverTimestamp(), updatedAt: serverTimestamp() });
      });
      
      await refreshUserProfile(); // Refresh user profile to show updated credits
      toast({ title: "Submission Successful", description: `Image generated! 1 credit used. Remaining: ${userProfile.credits - 1}` });
      return downloadURL;

    } catch (e: any) {
      console.error(`Error processing image for ${player}:`, e);
      toast({ title: "Image Processing Failed", description: e.message || "Could not generate or store image.", variant: "destructive" });
      // Revert prompt submission in game doc if image processing failed
       await updateDoc(gameDocRef, { [promptField]: "", [lastSeenField]: serverTimestamp(), updatedAt: serverTimestamp() });
      throw e;
    }
  }, [currentUser, userProfile, updateGameData, toast, refreshUserProfile]); // Added refreshUserProfile
  
  const updateGameStatus = useCallback(async (status: GameStatus) => {
    // Admin action
    await updateGameData({ status });
    toast({title: "Game Status Updated", description: `Status set to ${status}.`});
  }, [updateGameData, toast]);
  
  const revealImages = useCallback(async () => { 
    // Admin action
    await updateGameData({ imagesRevealed: true });
    toast({title: "Images Revealed", description: "Player images are now visible to viewers."});
  }, [updateGameData, toast]);

  const resetRound = useCallback(async (newCentralPrompt?: string) => {
    // Admin action
    const updates: Partial<Game> = {
      playerOnePrompt: "",
      playerOneImage: "",
      playerTwoPrompt: "",
      playerTwoImage: "",
      playerOneTypingPrompt: "",
      playerTwoTypingPrompt: "",
      imagesRevealed: false, 
      status: "waiting",
      // Keep lastSeen null or update if needed by game logic for admin view
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
    // Admin action
    const gameDocRef = doc(db, "games", GAME_ID);
    try {
      const existingCreatedAt = game?.createdAt || serverTimestamp(); 
      const gameDataToSet = { ...defaultGameData, createdAt: existingCreatedAt, updatedAt: serverTimestamp()};
      // For global game reset, we don't need the currentUser check of updateGameData
      await setDoc(gameDocRef, gameDataToSet); 
      toast({ title: "Game Reset", description: "The entire game has been reset to defaults." });
    } catch (e:any) {
      console.error("Error resetting game:", e);
      toast({ title: "Error", description: "Failed to reset game.", variant: "destructive" });
    }
  }, [toast, game?.createdAt]);


  return { game, loading, error, setCentralPrompt, submitPlayerPrompt, updatePlayerTypingPrompt, updateGameStatus, revealImages, resetRound, resetGame, updatePlayerLastSeen };
}
