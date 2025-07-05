
'use client';

import type { User as FirebaseUser, Auth } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, deleteUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import type { UserProfile } from '@/lib/types';
import LoadingSpinner from '@/components/loading-spinner';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  deleteCurrentUserAccount: () => Promise<void>;
  auth: Auth;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const INITIAL_CREDITS = 10;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data() as UserProfile);
      }
    }
  };

  const deleteCurrentUserAccount = async () => {
    if (!currentUser) {
      throw new Error("No user is currently logged in to delete.");
    }
    const userToDelete = currentUser; // Capture user before potential re-auth
    const uid = userToDelete.uid;

    try {
      // 1. Delete all images from Storage
      const userStorageRef = ref(storage, `user-images/${uid}`);
      const allRounds = await listAll(userStorageRef);
      for (const roundFolder of allRounds.prefixes) {
        const roundFiles = await listAll(roundFolder);
        await Promise.all(roundFiles.items.map(fileRef => deleteObject(fileRef)));
      }

      // 2. Delete all image documents from Firestore
      const imagesQuery = query(collection(db, 'generated_images'), where('userId', '==', uid));
      const imagesSnapshot = await getDocs(imagesQuery);
      const batch = writeBatch(db);
      imagesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      
      // 3. Delete user profile from Firestore
      const userDocRef = doc(db, 'users', uid);
      await deleteDoc(userDocRef);

      // 4. Delete user from Firebase Auth
      await deleteUser(userToDelete);
      
      // Clear local state
      setCurrentUser(null);
      setUserProfile(null);

    } catch (error: any) {
      console.error("Error deleting user account:", error);
      if (error.code === 'auth/requires-recent-login') {
        throw new Error("This is a sensitive operation and requires you to have recently logged in. Please log out and log back in to proceed.");
      }
      throw new Error("Failed to delete account. " + error.message);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner className="w-12 h-12" />
        <span className="ml-2">Loading authentication...</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading, logout, refreshUserProfile, auth, deleteCurrentUserAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
