
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGame, IMAGE_MODELS } from '@/hooks/use-game';
import LoadingSpinner from '@/components/loading-spinner';
import ImageCard from '@/components/image-card';
import GameStatusBadge from '@/components/game-status-badge';
import { AlertCircle, Edit3, Play, RotateCcw, SkipForward, Eye, UserCheck, UserX, Image as ImageIcon, CheckCircle, Wifi, HelpCircle, CreditCard, Settings, Timer, Trash2, GalleryThumbnails, QrCode, Sparkles, CheckSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Timestamp } from 'firebase/firestore';
import { generateImage } from '@/ai/flows/generate-image'; 
import AuthGuard from '@/components/auth-guard';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RoundTimer from '@/components/round-timer';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';

const formatLastSeen = (lastSeen: Timestamp | Date | null): {text: string, icon: JSX.Element} => {
  if (!lastSeen) return { text: "Never active", icon: <UserX className="text-destructive h-4 w-4" /> };
  
  const now = new Date();
  const seenDate = lastSeen instanceof Timestamp ? lastSeen.toDate() : new Date(lastSeen);
  const diffMs = now.getTime() - seenDate.getTime();
  const diffMins = Math.round(diffMs / (1000 * 60));

  if (diffMins < 2) return { text: "Active just now", icon: <UserCheck className="text-green-500 h-4 w-4" /> };
  if (diffMins < 60) return { text: `Active ${diffMins} min ago`, icon: <UserCheck className="text-yellow-500 h-4 w-4" /> };
  
  return { text: `Last active: ${seenDate.toLocaleDateString()} ${seenDate.toLocaleTimeString()}`, icon: <UserX className="text-muted-foreground h-4 w-4" /> };
};


function AdminPageContent() {
  const { game, loading: gameLoading, error: gameError, setCentralPrompt, startRound, updateGameStatus, revealImages, resetRound, resetGame, setImageModel, generateNewSessionCodes, generateImagesForPlayers, endRoundAndFinalizePrompts } = useGame();
  const { userProfile, loading: authLoading, deleteCurrentUserAccount } = useAuth();
  const { toast } = useToast();
  
  const [newPrompt, setNewPrompt] = useState('');
  const [isSubmittingPrompt, setIsSubmittingPrompt] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRevealingImages, setIsRevealingImages] = useState(false);
  const [isStartingRound, setIsStartingRound] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isGeneratingCodes, setIsGeneratingCodes] = useState(false);

  const [roundDuration, setRoundDuration] = useState('60');

  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{success: boolean, message: string, imageUrl?: string, statusCode?: number} | null>(null);
  
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (game) {
      setNewPrompt(game.prompt);
      setRoundDuration(game.roundDuration?.toString() || '60');
    }
  }, [game]);

  const handleSetPrompt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;
    setIsSubmittingPrompt(true);
    try {
      await setCentralPrompt(newPrompt);
    } finally {
      setIsSubmittingPrompt(false);
    }
  };
  
  const handleStartRound = async () => {
    setIsStartingRound(true);
    try {
      await startRound(parseInt(roundDuration, 10));
    } finally {
      setIsStartingRound(false);
    }
  };
  
  const handleFinalizeRound = async () => {
    setIsFinalizing(true);
    try {
        await endRoundAndFinalizePrompts();
    } catch (e) {
        // Error toast is handled in the hook
    } finally {
        setIsFinalizing(false);
    }
  };

  const handleUpdateStatus = async (status: 'waiting' | 'completed') => {
    setIsUpdatingStatus(true);
    try {
      await updateGameStatus(status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleRevealImages = async () => {
    setIsRevealingImages(true);
    try {
      await revealImages();
    } finally {
      setIsRevealingImages(false);
    }
  };

  const handleResetRound = async () => {
    await resetRound(game?.prompt || "New round, new prompt!"); 
  };
  
  const handleResetGame = async () => {
    if (window.confirm("Are you sure you want to reset the entire game? This action cannot be undone.")) {
      await resetGame();
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteCurrentUserAccount();
      toast({ title: "Account Deleted", description: "Your account and all associated data have been permanently removed."});
    } catch (error: any) {
      toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleGenerateCodes = async () => {
    setIsGeneratingCodes(true);
    try {
      await generateNewSessionCodes();
    } catch (error: any) {
       toast({ title: "Code Generation Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsGeneratingCodes(false);
    }
  }

  const handleGenerateImages = async () => {
    setIsGeneratingImages(true);
    try {
      await generateImagesForPlayers();
    } catch (error: any) {
      // Error toast is handled within the hook
    } finally {
      setIsGeneratingImages(false);
    }
  }

  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);

    if (!game || !game.imageModel) {
        toast({
            title: "Test Error",
            description: "Game data or image model is not available.",
            variant: "destructive",
        });
        setApiTestResult({ success: false, message: "Cannot run test: Game data or image model not selected.", statusCode: 400 });
        setIsTestingApi(false);
        return;
    }

    try {
      const testPrompt = "Test image: a friendly robot waving";
      const result = await generateImage({ prompt: testPrompt, model: game.imageModel });
      if (result.imageUrl) {
        setApiTestResult({ success: true, message: "API connection successful! Image generated.", imageUrl: result.imageUrl, statusCode: 200 });
      } else {
        setApiTestResult({ success: false, message: "API call succeeded but no image URL was returned.", statusCode: 204 });
      }
    } catch (err: any) {
      console.error("API Test Error:", err);
      setApiTestResult({ 
        success: false, 
        message: `API Test Failed: ${err.message || 'Unknown error'}`,
        statusCode: 500
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  const loading = gameLoading || authLoading;

  if (loading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner className="w-12 h-12" /> <span className="ml-2">Loading Admin Panel...</span></div>;
  }

  if (gameError || !game) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>Failed to load game data for admin panel. Details: {gameError || "Game data unavailable."}</AlertDescription></Alert>;
  }
   if (!userProfile) {
    return <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>User profile not found. Please ensure you are logged in correctly.</AlertDescription></Alert>;
  }
  
  const playerOneActivity = formatLastSeen(game.playerOneLastSeen || null);
  const playerTwoActivity = formatLastSeen(game.playerTwoLastSeen || null);
  const canRevealImages = (!!game.playerOneImage || !!game.playerTwoImage) && !game.imagesRevealed;
  const canGenerateImages = !!game.playerOnePrompt && !!game.playerTwoPrompt && !game.playerOneImage && !game.playerTwoImage && !game.isGenerating;
  const isTimeUp = game.roundEndsAt ? new Date() > (game.roundEndsAt as Timestamp).toDate() : false;
  const canFinalize = game.status === 'active' && isTimeUp && (!game.playerOnePrompt || !game.playerTwoPrompt);


  const playerOneJoinUrl = baseUrl && game.playerOneAccessToken ? `${baseUrl}/player-one?token=${game.playerOneAccessToken}` : '';
  const playerTwoJoinUrl = baseUrl && game.playerTwoAccessToken ? `${baseUrl}/player-two?token=${game.playerTwoAccessToken}` : '';

  return (
    <div className="space-y-8">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl md:text-3xl">Admin Control Panel</CardTitle>
          <div className="flex items-center justify-between mt-2 flex-wrap gap-y-2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <CardDescription>Status:</CardDescription>
                <GameStatusBadge status={game.status} />
              </div>
              {game.status === 'active' && <RoundTimer endTime={game.roundEndsAt ?? null} status={game.status} className="text-primary" />}
            </div>
            <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-5 w-5 text-primary"/>
                <span className="font-medium">Your Credits:</span> 
                <span className="font-bold text-lg text-primary">{userProfile.credits}</span>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><QrCode className="text-primary"/> QR Code Session Management</CardTitle>
          <CardDescription>Generate unique QR codes for players to join without an account. New codes invalidate old ones and disconnect current players.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateCodes} disabled={isGeneratingCodes}>
            {isGeneratingCodes ? <><LoadingSpinner className="mr-2"/> Generating...</> : 'Generate New Session Codes'}
          </Button>
          {(game.playerOneAccessToken || game.playerTwoAccessToken) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Player One Join Link</h3>
                {playerOneJoinUrl ? (
                  <>
                    <div className="p-4 bg-white rounded-lg inline-block">
                      <QRCodeSVG value={playerOneJoinUrl} size={160} />
                    </div>
                    <p className={cn("text-xs font-mono break-all p-2 bg-muted rounded-md", { 'text-green-500': game.playerOneConnected, 'text-red-500': !game.playerOneConnected })}>
                      Status: {game.playerOneConnected ? 'Connected' : 'Waiting for Player'}
                    </p>
                  </>
                ) : <LoadingSpinner />}
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Player Two Join Link</h3>
                 {playerTwoJoinUrl ? (
                  <>
                    <div className="p-4 bg-white rounded-lg inline-block">
                      <QRCodeSVG value={playerTwoJoinUrl} size={160} />
                    </div>
                     <p className={cn("text-xs font-mono break-all p-2 bg-muted rounded-md", { 'text-green-500': game.playerTwoConnected, 'text-red-500': !game.playerTwoConnected })}>
                      Status: {game.playerTwoConnected ? 'Connected' : 'Waiting for Player'}
                    </p>
                  </>
                ) : <LoadingSpinner />}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Edit3 className="text-primary"/> Set Central Prompt</CardTitle>
            <CardDescription>Enter the central theme or idea for the current round.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetPrompt} className="space-y-4">
              <div>
                <Label htmlFor="central-prompt">Central Prompt</Label>
                <Textarea
                  id="central-prompt"
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  placeholder="e.g., A mythical creature in a cyberpunk city"
                  rows={3}
                  className="mt-1"
                  disabled={isSubmittingPrompt}
                />
              </div>
              <Button type="submit" disabled={isSubmittingPrompt || !newPrompt.trim()}>
                {isSubmittingPrompt ? <><LoadingSpinner className="mr-2" /> Updating...</> : 'Set/Update Prompt'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="text-primary"/> Image Generation Settings</CardTitle>
            <CardDescription>Select the AI model and round duration. Higher quality models cost more credits.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="image-model-select">Image Generation Model</Label>
              <Select
                value={game.imageModel || 'gemini-2.0-flash-preview-image-generation'}
                onValueChange={(value) => setImageModel(value)}
              >
                <SelectTrigger id="image-model-select" className="w-full">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMAGE_MODELS).map(([modelId, { name, cost }]) => (
                    <SelectItem key={modelId} value={modelId}>
                      {name} ({cost} credit{cost > 1 ? 's' : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div>
                <Label htmlFor="duration-select">Round Duration</Label>
                <Select value={roundDuration} onValueChange={setRoundDuration} disabled={game.status === 'active'}>
                    <SelectTrigger id="duration-select">
                        <SelectValue placeholder="Set duration" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                        <SelectItem value="90">90 seconds</SelectItem>
                        <SelectItem value="120">120 seconds</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wifi className="text-primary"/> Player Activity</CardTitle>
          <CardDescription>Monitor player connection and recent activity. Updates when players load their page or type.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {playerOneActivity.icon}
            <span className="font-medium">Player One:</span>
            <span>{playerOneActivity.text}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
            {playerTwoActivity.icon}
            <span className="font-medium">Player Two:</span>
            <span>{playerTwoActivity.text}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="text-primary"/> API & System Health</CardTitle>
          <CardDescription>Test the connection to the image generation API. This test does not consume credits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleTestApi} disabled={isTestingApi}>
            {isTestingApi ? <><LoadingSpinner className="mr-2"/>Testing API...</> : 'Test Image Generation API'}
          </Button>
          {isTestingApi && <p className="text-sm text-muted-foreground">Sending request to image generation service...</p>}
          {apiTestResult && (
            <Alert variant={apiTestResult.success ? "default" : "destructive"} className={apiTestResult.success ? "bg-green-500/10 border-green-500/50" : ""}>
              {apiTestResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertTitle className="flex items-center gap-2">
                {apiTestResult.success ? "API Test Successful" : "API Test Failed"}
                {apiTestResult.statusCode && <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Status: {apiTestResult.statusCode}</span>}
              </AlertTitle>
              <AlertDescription>{apiTestResult.message}</AlertDescription>
              {apiTestResult.imageUrl && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Test Image:</p>
                  <Image src={apiTestResult.imageUrl} alt="API Test Image" width={200} height={200} className="rounded-md border" data-ai-hint="test abstract" />
                </div>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Controls</CardTitle>
          <CardDescription>Manage the game flow and player states.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {canFinalize ? (
             <Button onClick={handleFinalizeRound} disabled={isFinalizing} className="w-full bg-orange-600 hover:bg-orange-700">
                <CheckSquare className="mr-2 h-4 w-4"/> Finalize & Prepare Generation
            </Button>
          ) : (
            <Button onClick={handleStartRound} disabled={isStartingRound || game.status === 'active'} className="w-full bg-green-600 hover:bg-green-700">
              <Play className="mr-2 h-4 w-4"/> Start Round
            </Button>
          )}
           <Button onClick={handleGenerateImages} disabled={!canGenerateImages} className="w-full bg-blue-600 hover:bg-blue-700">
            {game.isGenerating ? <><LoadingSpinner className="mr-2"/>Generating...</> : <><Sparkles className="mr-2 h-4 w-4"/> Generate Images</>}
          </Button>
          <Button onClick={handleRevealImages} disabled={isRevealingImages || !canRevealImages} className="w-full">
            {isRevealingImages ? <><LoadingSpinner className="mr-2"/>Revealing...</> : <><ImageIcon className="mr-2 h-4 w-4"/> Reveal Images</>}
          </Button>
          <Button onClick={() => handleUpdateStatus('waiting')} disabled={isUpdatingStatus || game.status === 'waiting'} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
            Pause Round
          </Button>
          <Button onClick={handleResetRound} variant="outline" disabled={isUpdatingStatus} className="w-full">
           <SkipForward className="mr-2 h-4 w-4"/> Next Round
          </Button>
          <Button onClick={handleResetGame} variant="destructive" className="w-full">
           <RotateCcw className="mr-2 h-4 w-4"/> Reset Entire Game
          </Button>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">"Generate Images" will appear when both players have submitted prompts. "Next Round" clears submissions, hides images, sets status to 'waiting'.</p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Player Submissions (Admin View)</CardTitle>
          <CardDescription>View final prompts and generated images from players. These are always visible to admin.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <ImageCard
            playerName="Player One"
            finalPrompt={game.playerOnePrompt}
            imageUrl={game.playerOneImage}
            isLiveTypingView={false} 
            imagesRevealed={true} 
            isGenerating={game.isGenerating}
          />
          <ImageCard
            playerName="Player Two"
            finalPrompt={game.playerTwoPrompt}
            imageUrl={game.playerTwoImage}
            isLiveTypingView={false} 
            imagesRevealed={true} 
            isGenerating={game.isGenerating}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>View your generated images or permanently delete your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
            <Button asChild>
                <Link href="/gallery" className="flex items-center gap-2">
                    <GalleryThumbnails className="h-4 w-4"/> Go to My Image Gallery
                </Link>
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                        <Trash2 className="h-4 w-4"/> Delete My Account
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is irreversible. It will permanently delete your account,
                            your credits, and all of your generated images.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeletingAccount} className="bg-destructive hover:bg-destructive/80">
                            {isDeletingAccount ? <><LoadingSpinner className="mr-2"/> Deleting...</> : "Yes, Delete My Account"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Note: Deleting your account may require you to log in again for security purposes.</p>
        </CardFooter>
      </Card>

    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminPageContent />
    </AuthGuard>
  );
}
