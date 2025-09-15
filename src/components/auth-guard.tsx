
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import LoadingSpinner from '@/components/loading-spinner';

interface AuthGuardProps {
  children: ReactNode;
  allowSession?: boolean; // New prop to allow session-based access
}

export default function AuthGuard({ children, allowSession = false }: AuthGuardProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If we are not loading, and there's no logged-in user, AND we are NOT allowing a session user,
    // then it's time to redirect to the authentication page.
    if (!loading && !currentUser && !allowSession) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
    }
  }, [currentUser, loading, router, allowSession]);

  // If a session user is allowed, they don't need to be authenticated,
  // so we can render the children immediately without waiting for the auth state to resolve.
  if (allowSession) {
    return <>{children}</>;
  }
  
  // For standard protected routes (not allowing session users):
  // If authentication is still loading OR if there is no current user yet, show the loading spinner.
  // This prevents a flash of content and ensures we wait for the auth check to complete.
  if (loading || !currentUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <LoadingSpinner className="w-12 h-12" />
        <p className="mt-4">Checking authentication...</p>
      </div>
    );
  }

  // If loading is complete and we have a current user, render the protected content.
  return <>{children}</>;
}
