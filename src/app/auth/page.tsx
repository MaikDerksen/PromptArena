
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { INITIAL_CREDITS, useAuth } from '@/contexts/auth-context';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingSpinner from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

// Simplified sign-up schema without phone number
const signUpSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

type LoginSchema = z.infer<typeof loginSchema>;
type SignUpSchema = z.infer<typeof signUpSchema>;


export default function AuthPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { authLoading } = useAuth();

  const {
    register: signUpRegister,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
  } = useForm<SignUpSchema>({ resolver: zodResolver(signUpSchema), mode: 'onBlur' });
  
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) });


  const onSignUp: SubmitHandler<SignUpSchema> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        // Create user profile directly without phone verification
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          phoneNumber: null, // Phone number is not collected for now
          credits: INITIAL_CREDITS,
          createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(doc(db, 'users', user.uid), userProfile);

        toast({ title: 'Sign Up Successful!', description: 'Your account is ready.' });
        router.push('/');
      }
    } catch (error: any) {
      console.error("Error during sign-up:", error);
      let errorMessage = "An unknown error occurred. Please try again.";
       if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const onLogin: SubmitHandler<LoginSchema> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      toast({ title: 'Login Successful', description: 'Welcome back!' });
      router.push('/');
    } catch (error: any) {
      setFormError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="flex justify-center items-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to PromptArena</CardTitle>
          <CardDescription>
            Log in or create an account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4 pt-4">
                 {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Login Failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" type="email" {...loginRegister('email')} placeholder="you@example.com" />
                    {loginErrors.email && <p className="text-red-500 text-xs mt-1">{loginErrors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="login-password">Password</Label>
                    <Input id="login-password" type="password" {...loginRegister('password')} placeholder="••••••••" />
                     {loginErrors.password && <p className="text-red-500 text-xs mt-1">{loginErrors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Logging In...</> : 'Login'}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUpSubmit(onSignUp)} className="space-y-4 pt-4">
                  {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Sign Up Failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" {...signUpRegister('email')} placeholder="you@example.com"/>
                    {signUpErrors.email && <p className="text-red-500 text-xs mt-1">{signUpErrors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" {...signUpRegister('password')} placeholder="At least 6 characters" />
                    {signUpErrors.password && <p className="text-red-500 text-xs mt-1">{signUpErrors.password.message}</p>}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    First-time users will receive {INITIAL_CREDITS} free credits!
                  </p>
                  <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Signing Up...</> : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
