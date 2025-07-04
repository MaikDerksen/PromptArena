
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { INITIAL_CREDITS, useAuth } from '@/contexts/auth-context';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingSpinner from '@/components/loading-spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import PhoneInput, { isPossiblePhoneNumber } from 'react-phone-number-input/input';

// Extend Window interface for reCAPTCHA verifier
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  phoneNumber: z.string().refine(value => isPossiblePhoneNumber(value || ''), { message: 'Please enter a valid phone number.' }),
});

const otpSchema = z.object({
  otp: z.string().min(6, { message: 'OTP must be 6 digits.' }).max(6, { message: 'OTP must be 6 digits.' }),
});

type LoginSchema = z.infer<typeof loginSchema>;
type SignUpSchema = z.infer<typeof signUpSchema>;
type OtpSchema = z.infer<typeof otpSchema>;

export default function AuthPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [signUpData, setSignUpData] = useState<SignUpSchema | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { auth, authLoading } = useAuth();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginSchema>({ resolver: zodResolver(loginSchema) });

  const {
    control: signUpControl,
    register: signUpRegister,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors },
  } = useForm<SignUpSchema>({ resolver: zodResolver(signUpSchema), mode: 'onBlur' });

  const {
    register: otpRegister,
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
  } = useForm<OtpSchema>({ resolver: zodResolver(otpSchema) });

  const setupRecaptcha = () => {
    if (!auth) {
      console.error("Auth object not available for reCAPTCHA setup.");
      return;
    }
    // Check if the verifier is already initialized to avoid re-rendering issues
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved.
        },
        'expired-callback': () => {
          toast({ title: 'reCAPTCHA Expired', description: 'Please try signing up again.', variant: 'destructive' });
          window.recaptchaVerifier?.clear();
        },
      });
    }
  };

  // Setup reCAPTCHA only when auth object is ready.
  useEffect(() => {
    if (!authLoading && auth) {
      setupRecaptcha();
    }
  }, [authLoading, auth]);

  const onSignUp: SubmitHandler<SignUpSchema> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const verifier = window.recaptchaVerifier;
      if (!verifier) {
        throw new Error("reCAPTCHA verifier not initialized. Please refresh the page.");
      }
      
      // Render reCAPTCHA before sending OTP
      await verifier.render();
      
      const result = await signInWithPhoneNumber(auth!, data.phoneNumber, verifier);
      setConfirmationResult(result);
      setSignUpData(data); // Store form data to use after OTP verification
      setIsOtpSent(true);
      toast({ title: 'Verification Code Sent', description: 'Please enter the code sent to your phone.' });
    } catch (error: any) {
      console.error("Error during phone number sign-in:", error);
      setFormError(error.message || 'Failed to send verification code. Please make sure the phone number is correct.');
      window.recaptchaVerifier?.clear();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp: SubmitHandler<OtpSchema> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);

    if (!confirmationResult || !signUpData) {
      setFormError('Something went wrong. Please try signing up again.');
      setIsSubmitting(false);
      return;
    }

    try {
      // First, confirm the OTP. This proves ownership of the phone number.
      // It also signs in the user anonymously with their phone. We will discard this session.
      await confirmationResult.confirm(data.otp);

      // Now, create the user with their chosen email and password.
      const userCredential = await createUserWithEmailAndPassword(auth!, signUpData.email, signUpData.password);
      const user = userCredential.user;

      if (user) {
        const userProfile: UserProfile = {
          uid: user.uid,
          email: user.email!,
          phoneNumber: signUpData.phoneNumber,
          credits: INITIAL_CREDITS,
          createdAt: serverTimestamp() as Timestamp,
        };
        await setDoc(doc(db, 'users', user.uid), userProfile);

        toast({ title: 'Sign Up Successful!', description: 'Your account is ready.' });
        router.push('/');
      }
    } catch (error: any) {
      console.error("Error during OTP verification or user creation:", error);
      let errorMessage = "An unknown error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use by another account.';
      } else if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'The verification code is invalid. Please try again.';
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
      await signInWithEmailAndPassword(auth!, data.email, data.password);
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
       <div id="recaptcha-container"></div>
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
              {!isOtpSent ? (
                <form onSubmit={handleSignUpSubmit(onSignUp)} className="space-y-4 pt-4">
                  {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Sign Up Failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" type="email" {...signUpRegister('email')} placeholder="you@example.com" />
                    {signUpErrors.email && <p className="text-red-500 text-xs mt-1">{signUpErrors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" {...signUpRegister('password')} placeholder="At least 6 characters" />
                    {signUpErrors.password && <p className="text-red-500 text-xs mt-1">{signUpErrors.password.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Controller
                      name="phoneNumber"
                      control={signUpControl}
                      render={({ field }) => (
                         <PhoneInput
                          {...field}
                          id="signup-phone"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          placeholder="Enter phone number"
                          defaultCountry="US"
                        />
                      )}
                    />
                    {signUpErrors.phoneNumber && <p className="text-red-500 text-xs mt-1">{signUpErrors.phoneNumber.message}</p>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    First-time users will receive {INITIAL_CREDITS} free credits!
                  </p>
                  <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Sending Code...</> : 'Sign Up & Verify Phone'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit(onVerifyOtp)} className="space-y-4 pt-4">
                  {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Verification Failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                  <p className="text-sm text-center text-muted-foreground">A verification code has been sent to {signUpData?.phoneNumber}.</p>
                  <div>
                    <Label htmlFor="otp">Verification Code (OTP)</Label>
                    <Input id="otp" type="text" {...otpRegister('otp')} placeholder="123456" maxLength={6} />
                    {otpErrors.otp && <p className="text-red-500 text-xs mt-1">{otpErrors.otp.message}</p>}
                  </div>
                   <Button type="button" variant="link" size="sm" onClick={() => {setIsOtpSent(false); setFormError(null);}} className="text-primary">
                    Use a different phone number?
                  </Button>
                  <Button type="submit" className="w-full" disabled={isSubmitting || authLoading}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Verifying & Creating Account...</> : 'Verify & Complete Sign Up'}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
