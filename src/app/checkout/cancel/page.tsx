// src/app/checkout/cancel/page.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';
import AuthGuard from '@/components/auth-guard';

function CheckoutCancelPageContent() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-3xl font-headline">Payment Cancelled</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Your payment process was cancelled or was not completed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            You have not been charged. If you meant to purchase credits, you can try again.
            If you encountered any issues, please feel free to contact our support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/buy-credits">Try Again</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function CheckoutCancelPage() {
    return (
        <AuthGuard>
            <CheckoutCancelPageContent />
        </AuthGuard>
    )
}
