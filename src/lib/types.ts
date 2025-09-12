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

  // Timer fields
  roundDuration?: number; // in seconds
  roundEndsAt?: Timestamp | Date | null;

  // QR Code Session fields
  playerOneAccessToken?: string;
  playerTwoAccessToken?: string;
  playerOneConnected?: boolean;
  playerTwoConnected?: boolean;
}

export type PlayerKey = "playerOne" | "playerTwo";

export interface UserProfile {
  uid: string;
  email: string; // Changed to required
  phoneNumber: string | null;
  credits: number;
  createdAt: Timestamp | Date | null;
}

export interface GeneratedImage {
  id?: string;
  userId: string;
  imageUrl: string;
  prompt: string;
  playerKey: PlayerKey;
  createdAt: Timestamp;
  model?: string;
}
