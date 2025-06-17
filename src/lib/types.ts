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
}

export type PlayerKey = "playerOne" | "playerTwo";
