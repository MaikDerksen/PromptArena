
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');


  const router = useRouter();
  const { toast } = useToast();
  const { auth, loading } = useAuth();

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
    reset: resetOtpForm,
  } = useForm<OtpSchema>({ resolver: zodResolver(otpSchema) });

  useEffect(() => {
    if (isOtpSent) {
      resetOtpForm();
    }
  }, [isOtpSent, resetOtpForm]);

  const onSignUp: SubmitHandler<SignUpSchema> = async (data) => {
    setIsSubmitting(true);
    setFormError(null);

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where("phoneNumber", "==", data.phoneNumber));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            setFormError("This phone number is already registered. Please use a different one or log in.");
            setIsSubmitting(false);
            return;
        }
    } catch(e) {
        console.error("Error checking phone number uniqueness:", e);
        setFormError("Could not verify phone number. Please try again later.");
        setIsSubmitting(false);
        return;
    }

    try {
      // Create a new verifier instance for each sign-up attempt.
      const verifier = new RecaptchaVerifier(auth!, 'recaptcha-container', {
        'size': 'invisible', 'callback': () => {}, 'expired-callback': () => {}
      });
      window.recaptchaVerifier = verifier;
      
      const result = await signInWithPhoneNumber(auth!, data.phoneNumber, verifier);
      setConfirmationResult(result);
      setSignUpData(data);
      setIsOtpSent(true);
      toast({ title: 'Verification Code Sent', description: 'Please enter the code sent to your phone.' });
    } catch (error: any) {
      console.error("Error during phone number sign-in:", error);
      setFormError(error.message || 'Failed to send verification code.');
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
      await confirmationResult.confirm(data.otp);
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
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({ title: 'Error', description: 'Please enter your email address.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ title: 'Password Reset Email Sent', description: 'Please check your inbox to reset your password.' });
      setIsResetPasswordDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
                  <Input id="login-email" type="email" {...loginRegister('email')} placeholder="you@example.com" autoComplete="email"/>
                  {loginErrors.email && <p className="text-red-500 text-xs mt-1">{loginErrors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="login-password">Password</Label>
                  <Input id="login-password" type="password" {...loginRegister('password')} placeholder="••••••••" autoComplete="current-password" />
                  {loginErrors.password && <p className="text-red-500 text-xs mt-1">{loginErrors.password.message}</p>}
                </div>
                <div className="flex justify-end">
                    <Button type="button" variant="link" size="sm" onClick={() => setIsResetPasswordDialogOpen(true)} className="p-0 h-auto">
                        Forgot Password?
                    </Button>
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
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
                    <Input id="signup-email" type="email" {...signUpRegister('email')} placeholder="you@example.com" autoComplete="email" />
                    {signUpErrors.email && <p className="text-red-500 text-xs mt-1">{signUpErrors.email.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" {...signUpRegister('password')} placeholder="At least 6 characters" autoComplete="new-password"/>
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
                  <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Sending Code...</> : 'Sign Up & Verify Phone'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit(onVerifyOtp)} className="space-y-4 pt-4">
                  {formError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Verification Failed</AlertTitle><AlertDescription>{formError}</AlertDescription></Alert>}
                  <p className="text-sm text-center text-muted-foreground">A verification code has been sent to {signUpData?.phoneNumber}.</p>
                  <div>
                    <Label htmlFor="otp">Verification Code (OTP)</Label>
                    <Input id="otp" type="text" {...otpRegister('otp')} placeholder="123456" maxLength={6} autoComplete="one-time-code" />
                    {otpErrors.otp && <p className="text-red-500 text-xs mt-1">{otpErrors.otp.message}</p>}
                  </div>
                   <Button type="button" variant="link" size="sm" onClick={() => { setIsOtpSent(false); setFormError(null); if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); } }} className="text-primary">
                    Use a different phone number?
                  </Button>
                  <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                    {isSubmitting ? <><LoadingSpinner className="mr-2" />Verifying...</> : 'Verify & Complete Sign Up'}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address below. If an account exists, we will send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handlePasswordReset} disabled={isSubmitting}>
              {isSubmitting ? <><LoadingSpinner className="mr-2" /> Sending...</> : 'Send Reset Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
