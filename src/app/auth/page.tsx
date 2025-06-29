
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { INITIAL_CREDITS } from '@/contexts/auth-context';
import PhoneInput from 'react-phone-number-input/react-hook-form-input';
import 'react-phone-number-input/style.css';
import { useForm } from 'react-hook-form';
import LoadingSpinner from '@/components/loading-spinner';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function AuthPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const { control, handleSubmit: handlePhoneSubmit } = useForm<{ phone: string }>();


  useEffect(() => {
    // This function sets up the reCAPTCHA verifier
    const setupRecaptcha = () => {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved, allow signInWithPhoneNumber.
          },
        });
      }
    };
    setupRecaptcha();
  }, []);

  const onSendOtp = async (data: { phone: string }) => {
    setIsSubmitting(true);
    try {
      const verifier = window.recaptchaVerifier!;
      const confirmationResult = await signInWithPhoneNumber(auth, data.phone, verifier);
      window.confirmationResult = confirmationResult;
      setOtpSent(true);
      toast({ title: 'OTP Sent', description: 'Please check your phone for the verification code.' });
    } catch (error: any) {
      toast({ title: 'OTP Send Failed', description: error.message, variant: 'destructive' });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setIsSubmitting(true);
    try {
      const confirmationResult = window.confirmationResult;
      if (!confirmationResult) {
        throw new Error("No confirmation result found. Please request OTP again.");
      }
      const userCredential = await confirmationResult.confirm(otp);
      const user = userCredential.user;

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: user.uid,
        phoneNumber: user.phoneNumber,
        credits: INITIAL_CREDITS,
        createdAt: serverTimestamp() as Timestamp,
      };
      await setDoc(doc(db, 'users', user.uid), userProfile, { merge: true });

      toast({ title: 'Sign Up/Login Successful', description: 'Welcome! You are now logged in.' });
      router.push('/'); // Redirect to home or dashboard
    } catch (error: any) {
      toast({ title: 'Verification Failed', description: error.message, variant: 'destructive' });
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
            {otpSent
              ? 'Enter the code sent to your phone.'
              : 'Sign up or log in with your phone number.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handlePhoneSubmit(onSendOtp)} className="space-y-4">
              <div>
                <Label htmlFor="phone-input">Phone Number</Label>
                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm">
                  <PhoneInput
                    name="phone"
                    control={control}
                    rules={{ required: true }}
                    id="phone-input"
                    international
                    defaultCountry="US"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                First-time users will receive {INITIAL_CREDITS} free credits!
              </p>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <LoadingSpinner className="mr-2" /> : 'Send Verification Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={onVerifyOtp} className="space-y-4">
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
                {isSubmitting ? 'Verifying...' : 'Verify & Log In'}
              </Button>
               <Button variant="link" onClick={() => setOtpSent(false)} disabled={isSubmitting} className="w-full">
                Back to phone number entry
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <div id="recaptcha-container"></div>
    </div>
  );
}
