
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, CreditCard, Menu, Eye, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { LogoIcon } from './logo-icon';

export default function AppHeader() {
  const { currentUser, userProfile, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      setIsSheetOpen(false);
      router.push('/');
    } catch (error) {
      toast({ title: 'Logout Failed', description: 'Could not log you out. Please try again.', variant: 'destructive' });
    }
  };
  
  const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <SheetClose asChild>
      <Link href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
        {children}
      </Link>
    </SheetClose>
  );

  return (
    <header className="bg-card border-b border-border shadow-md sticky top-0 z-30">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
          <LogoIcon className="h-8 w-8" />
          <h1 className="text-xl sm:text-2xl font-headline font-bold">PromptArena</h1>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          {currentUser && userProfile && (
             <Button variant="ghost" size="sm" asChild>
                <Link href="/buy-credits" className="flex items-center gap-1">
                  <CreditCard className="h-4 w-4" /> Credits: {userProfile.credits}
                </Link>
              </Button>
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

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetDescription className="sr-only">Main navigation links for PromptArena.</SheetDescription>
              </SheetHeader>
              <nav className="grid gap-4 text-lg font-medium mt-8">
                <SheetClose asChild>
                    <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors mb-4">
                        <LogoIcon className="h-8 w-8" />
                        <h1 className="text-2xl font-headline font-bold">PromptArena</h1>
                    </Link>
                </SheetClose>
                
                <NavLink href="/viewer"><Eye className="h-5 w-5" />Viewer</NavLink>
                <NavLink href="/player-one"><User className="h-5 w-5" />Player 1</NavLink>
                <NavLink href="/player-two"><User className="h-5 w-5" />Player 2</NavLink>
                <NavLink href="/admin"><ShieldCheck className="h-5 w-5" />Admin Panel</NavLink>
                
                <Separator className="my-2" />
                
                {currentUser && userProfile && (
                    <NavLink href="/buy-credits"><CreditCard className="h-5 w-5" />Credits: {userProfile.credits}</NavLink>
                )}

                {currentUser ? (
                    <SheetClose asChild>
                        <Button variant="ghost" onClick={handleLogout} className="flex items-center justify-start gap-3 rounded-lg px-3 py-2 text-red-500 hover:text-red-400">
                           <LogOut className="h-5 w-5" /> Logout
                        </Button>
                    </SheetClose>
                ) : (
                    <NavLink href="/auth"><LogIn className="h-5 w-5" />Login</NavLink>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
