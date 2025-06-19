
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function AppHeader() {
  const { currentUser, userProfile, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/'); 
    } catch (error) {
      toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
          <Gamepad2 className="h-8 w-8" />
          <h1 className="text-2xl font-headline font-bold">PromptArena</h1>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {currentUser && userProfile && (
             <span className="text-sm text-muted-foreground mr-2 hidden sm:inline">Credits: {userProfile.credits}</span>
          )}
          <Button variant="ghost" asChild>
            <Link href="/viewer">Viewer</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/player-one">Player 1</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/player-two">Player 2</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin">Admin</Link>
          </Button>
          {currentUser ? (
            <Button variant="ghost" onClick={handleLogout} className="text-red-500 hover:text-red-400">
              <LogOut className="mr-1 h-4 w-4" /> Logout
            </Button>
          ) : (
            <Button variant="default" asChild>
              <Link href="/auth"><LogIn className="mr-1 h-4 w-4" />Login</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
