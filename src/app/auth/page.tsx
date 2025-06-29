
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  linkWithPhoneNumber,
  type ConfirmationResult,
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
import { INITIAL_CREDITS } from '@/contexts/auth-context';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingSpinner from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  phone: z.string().min(10, { message: 'A valid phone number is required.' }),
});

type LoginSchema = z.infer<typeof loginSchema>;
type SignUpSchema = z.infer<typeof signUpSchema>;


export default function AuthPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const {
    control: signUpControl,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
  } = useForm<SignUpSchema>({ resolver: zodResolver(signUpSchema), mode: 'onBlur' });
  
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) });

  // This useEffect handles the setup and cleanup of the RecaptchaVerifier.
  // It ensures the verifier is ready when needed and cleaned up properly,
  // preventing it from being destroyed by React re-renders.
  useEffect(() => {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
    });
  
    // Cleanup function to be called when the component unmounts.
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
    };
  }, []); // The empty dependency array ensures this runs only once on mount.

  const onSignUp: SubmitHandler<SignUpSchema> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);

    // Use the stable verifier instance that was created on mount.
    const verifier = window.recaptchaVerifier;
    if (!verifier) {
      setFormError("reCAPTCHA verifier not initialized. Please refresh and try again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      if (user) {
        toast({ title: 'Account Created', description: 'Now verifying your phone number...' });
        
        // Pass the stable verifier instance to the linking function.
        const confirmationResult = await linkWithPhoneNumber(user, data.phone, verifier);
        window.confirmationResult = confirmationResult;
        
        // This state change will now happen AFTER the async reCAPTCHA part is complete.
        setShowOtpInput(true);
      }
    } catch (error: any) {
      console.error("Error during sign-up or phone linking:", error);
      let errorMessage = "An unknown error occurred. Please try again.";
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'The phone number you entered is not valid. Please check and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'We have blocked all requests from this device due to unusual activity. Try again later.';
      } else if (error.code) {
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

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || !window.confirmationResult) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await window.confirmationResult.confirm(otp);
      const user = auth.currentUser;
      if (!user) throw new Error("User not found after verification.");
      
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        phoneNumber: user.phoneNumber,
        credits: INITIAL_CREDITS,
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', user.uid), userProfile);

      toast({ title: 'Sign Up Successful!', description: 'Your account is ready.' });
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
            {showOtpInput ? 'Enter the code sent to your phone.' : 'Log in or create an account.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showOtpInput ? (
            <form onSubmit={onVerifyOtp} className="space-y-4">
              {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
              <div>
                <Label htmlFor="otp-input">Verification Code</Label>
                <Input
                  id="otp-input"
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="Enter 6-digit code"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <><LoadingSpinner className="mr-2"/>Verifying...</> : 'Verify & Complete Sign Up'}
              </Button>
            </form>
          ) : (
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
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Logging In...</> : 'Login'}
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignUpSubmit(onSignUp)} className="space-y-4 pt-4">
                  {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Sign Up Failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" {...signUpControl.register('email')} placeholder="you@example.com"/>
                    {signUpErrors.email && <p className="text-red-500 text-xs mt-1">{signUpErrors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" {...signUpControl.register('password')} placeholder="At least 6 characters" />
                    {signUpErrors.password && <p className="text-red-500 text-xs mt-1">{signUpErrors.password.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone-input">Phone Number for Verification</Label>
                     <Controller
                        name="phone"
                        control={signUpControl}
                        rules={{ required: true }}
                        render={({ field }) => (
                           <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                              <PhoneInput
                                  {...field}
                                  id="phone-input"
                                  defaultCountry="US"
                                  disabled={isSubmitting}
                                  withCountryCallingCode
                              />
                           </div>
                        )}
                      />
                     {signUpErrors.phone && <p className="text-red-500 text-xs mt-1">{signUpErrors.phone.message}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    First-time users will receive {INITIAL_CREDITS} free credits!
                  </p>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Signing Up...</> : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
      {/* This div must be present in the DOM for the invisible reCAPTCHA to work. */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
