
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { LogoIcon } from "@/components/logo-icon";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <LogoIcon className="w-24 h-24 text-primary mb-6" />
      <h1 className="text-4xl md:text-5xl font-headline font-bold mb-4">
        Welcome to PromptArena!
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl">
        Engage in epic 2v2 text-to-image battles. Craft your prompts, witness AI magic, and compete for visual supremacy.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl">
        <Card className="hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="text-primary" /> Join as a Player
            </CardTitle>
            <CardDescription>Enter the arena and submit your creative prompts.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild className="w-full" variant="default">
              <Link href="/player-one">Player One</Link>
            </Button>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/player-two">Player Two</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="text-primary" /> Spectate the Battle
            </CardTitle>
            <CardDescription>Watch the prompts and AI-generated images unfold in real-time.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/viewer">Go to Viewer</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-primary/20 hover:shadow-lg transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-primary" /> Admin Controls
            </CardTitle>
            <CardDescription>Manage the game, set prompts, and oversee the battles.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/admin">Go to Admin Panel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
       <p className="text-sm text-muted-foreground mt-12">
        Powered by Firebase & Generative AI
      </p>
    </div>
  );
}
