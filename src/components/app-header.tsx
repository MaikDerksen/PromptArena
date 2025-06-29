
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, LogIn, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AppHeader() {
  const { currentUser, userProfile, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/'); 
    } catch (error) {
      toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  };

  const isAdminPage = pathname === '/admin';

  return (
    <header className="bg-card border-b border-border shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
          <Gamepad2 className="h-8 w-8" />
          <h1 className="text-2xl font-headline font-bold">PromptArena</h1>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {currentUser && (
            <>
              {isAdminPage && userProfile && (
                 <Button variant="ghost" size="sm" asChild>
                    <Link href="/buy-credits" className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4" /> Credits: {userProfile.credits}
                    </Link>
                  </Button>
              )}
            </>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/viewer">Viewer</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/player-one">Player 1</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/player-two">Player 2</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">Admin</Link>
          </Button>
          {currentUser ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-400">
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </Button>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link href="/auth"><LogIn className="mr-1 h-4 w-4" />Login</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
