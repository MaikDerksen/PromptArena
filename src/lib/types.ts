
import type { Timestamp } from 'firebase/firestore';

export type GameStatus = "waiting" | "active" | "completed";

export interface Game {
  id: string; // Firestore document ID
  prompt: string;
  playerOnePrompt: string;
  playerTwoPrompt: string;
  playerOneImage: string; // URL
  playerTwoImage: string; // URL
  status: GameStatus;
  createdAt: Timestamp | Date | null;
  updatedAt?: Timestamp | Date | null;
  
  playerOneTypingPrompt?: string;
  playerTwoTypingPrompt?: string;
  playerOneLastSeen?: Timestamp | Date | null;
  playerTwoLastSeen?: Timestamp | Date | null;
  imagesRevealed?: boolean;
  imageModel?: string;

  // New timer fields
  roundDuration?: number; // in seconds
  roundEndsAt?: Timestamp | Date | null;
}

export type PlayerKey = "playerOne" | "playerTwo";

export interface UserProfile {
  uid: string;
  email?: string | null; // Keep for legacy or future use
  phoneNumber: string | null; // Add phone number
  credits: number;
  createdAt: Timestamp | Date | null;
}
