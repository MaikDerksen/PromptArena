import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2 } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="bg-card border-b border-border shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary hover:text-primary/90 transition-colors">
          <Gamepad2 className="h-8 w-8" />
          <h1 className="text-2xl font-headline font-bold">PromptArena</h1>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
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
        </nav>
      </div>
    </header>
  );
}
