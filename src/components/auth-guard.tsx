
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
    // If we allow session users, we don't need to redirect.
    // The component using this guard will handle the session logic.
    if (allowSession) return;

    if (!loading && !currentUser) {
      router.push('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
    }
  }, [currentUser, loading, router, allowSession]);
  
  // If we allow session users, we can render children immediately without waiting for auth.
  if (allowSession) {
    return <>{children}</>;
  }

  if (loading || !currentUser) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <LoadingSpinner className="w-12 h-12" />
        <p className="mt-4">Checking authentication...</p>
      </div>
    );
  }

  return <>{children}</>;
}
