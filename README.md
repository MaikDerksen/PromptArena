
# PromptArena - AI Image Prompt Battle Platform

Welcome to PromptArena! This platform allows two players to engage in a creative text-to-image battle. Players submit prompts based on a central theme, an AI generates images from these prompts, and viewers can watch the action unfold live. An admin panel provides controls to manage the game.

Viewer POV:
![ViewShow](https://github.com/user-attachments/assets/f8b1e0ba-049b-4396-bf26-a778df2f1085)
![ViewHide](https://github.com/user-attachments/assets/d4ff8e8e-0d1c-4ea6-8ec9-2bd083a6deee)

Player 1 POV:
![PlayerOne](https://github.com/user-attachments/assets/a26bf57a-468e-4ac8-99a0-2950ee3796a8)

Player 2 POV:
![PlayerTwo](https://github.com/user-attachments/assets/864f9ee4-2a97-4089-a2ea-ae7e145dfc50)

Admin POV:
![Admin1](https://github.com/user-attachments/assets/4b25aa42-2ae0-4dc3-8400-5604932fc205)
![Admin2](https://github.com/user-attachments/assets/5de8464b-3d9a-4735-99a2-b0b94841c881)

https://coff.ee/maikd :) 

## Overview

PromptArena is a real-time, interactive web application where creativity meets AI.

*   **Players** craft descriptive prompts.
*   **AI (Google Gemini)** generates images based on those prompts.
*   **Viewers** witness the prompts being typed live and see the generated images once revealed by the admin.
*   **Admin** controls the game flow, sets themes, manages rounds, and ensures a smooth experience.

## Features

*   **User Authentication**: Secure sign-up and login for players and admin.
*   **Credit System**: Users receive initial credits and spend them to generate images.
*   **Player Interface**: Dedicated pages for Player One and Player Two to submit their prompts.
*   **AI Image Generation**: Utilizes Google's Gemini model via Genkit to generate images from text prompts.
*   **Live Viewer Page**: Spectators can see the central prompt, player typing progress in real-time, final submitted prompts, and the generated images (once revealed by admin).
*   **Admin Control Panel**:
    *   Set/update the central game prompt.
    *   Start, pause, complete, and reset game rounds.
    *   Reveal generated images to viewers.
    *   Monitor player activity (last seen online/typing).
    *   View own credit balance.
    *   Test the image generation API connection.
*   **Real-time Updates**: Firebase Firestore ensures that all game state changes are reflected live across all clients (players, viewers, admin).
*   **User-Specific Image Storage**: Generated images are stored in Firebase Storage, organized by user ID.
*   **Buy Credits Page (with Stripe Checkout Integration - Webhook for credit update is a stub)**: UI for purchasing more credits. Redirects to Stripe for payment. Actual credit update after payment requires full webhook implementation.

## Tech Stack

*   **Frontend**:
    *   Next.js (App Router, Server Components)
    *   React
    *   TypeScript
*   **Styling**:
    *   Tailwind CSS
    *   ShadCN UI (for pre-built components)
*   **Backend & Real-time**:
    *   Firebase (Authentication, Firestore for database, Storage for images)
*   **AI Integration**:
    *   Genkit
    *   Google Gemini API (for image generation)
*   **Payments (Conceptual/Partial)**:
    *   Stripe (Checkout for payment collection; webhook for fulfillment is a stub)

## Prerequisites

Before you begin, ensure you have the following installed and set up:

*   **Node.js**: Version 18.x or 20.x recommended. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm** (comes with Node.js) or **yarn**.
*   **Firebase Account**: Create one for free at [firebase.google.com](https://firebase.google.com/).
*   **Google Cloud Project / Google AI Studio Account**:
    *   You'll need this to obtain an API key for the Gemini API. Using [Google AI Studio](https://aistudio.google.com/) is often the quickest way to get an API key for experimentation.
*   **Stripe Account**: If you plan to implement real payments, you'll need a Stripe account ([stripe.com](https://stripe.com/)).

## Setup Instructions

Follow these steps to get PromptArena running on your local machine:

1.  **Clone the Repository**:
    ```bash
    git clone <your-repository-url>
    cd promptarena # Or your repository's directory name
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Firebase Project Setup**:
    *   Go to the [Firebase Console](https://console.firebase.google.com/).
    *   Click on "**Add project**" or "**Create a project**".
    *   Follow the on-screen instructions to create your project (e.g., give it a name like "PromptArenaDev").
    *   Once your project is created, you'll need to set up Authentication, Firestore, and Storage:

    *   **Enable Authentication (Email/Password)**:
        1.  In your Firebase project dashboard, navigate to "Build" > "Authentication".
        2.  Go to the "Sign-in method" tab.
        3.  Find "Email/Password", click the pencil icon, enable it, and save.

    *   **Enable Firestore**:
        1.  Navigate to "Build" > "Firestore Database".
        2.  Click "**Create database**".
        3.  Choose to start in **test mode**. (You will update rules later).
        4.  Select a location for your Firestore database. Click "Enable".

    *   **Enable Firebase Storage**:
        1.  Navigate to "Build" > "Storage".
        2.  Click "**Get started**".
        3.  Follow the prompts (test mode is fine for initial setup).
        4.  Choose a location for your Storage bucket.

    *   **Register a Web App with Firebase**:
        1.  In your Firebase project, go to "Project settings" (click the gear icon ⚙️ next to "Project Overview").
        2.  Scroll down to the "Your apps" section.
        3.  Click on the Web icon (`</>`) to add a new web app.
        4.  Enter an "App nickname" (e.g., "PromptArena Web App").
        5.  Click "**Register app**".
        6.  You will see a `firebaseConfig` object. **Copy the values** from this object (apiKey, authDomain, projectId, etc.). You'll need them for your environment variables.

4.  **Google AI (Gemini) API Key Setup**:
    *   Go to [Google AI Studio](https://aistudio.google.com/).
    *   Sign in with your Google account.
    *   Click on "**Get API key**" (you might need to create a new project or select an existing one).
    *   Copy the generated API key.

5.  **Stripe API Keys & Products Setup**:
    *   Log in to your [Stripe Dashboard](https://dashboard.stripe.com/).
    *   Navigate to "Developers" > "API keys".
        *   You'll find your **Publishable key** (starts with `pk_test_` or `pk_live_`) and **Secret key** (starts with `sk_test_` or `sk_live_`). Copy these. Use test keys for development.
    *   **Create Products and Prices in Stripe**:
        1.  Go to "Products" in your Stripe Dashboard.
        2.  For each credit package you want to offer (e.g., "Starter Pack", "Creator Bundle"):
            *   Click "+ Add product".
            *   Fill in the product name.
            *   Under "Pricing", set the price (e.g., $1.99) and ensure it's a "One-time" payment.
            *   Save the product.
            *   After saving, you'll see a "Price ID" (e.g., `price_1PExample...`). **Copy this Price ID.** You will need to update these IDs in `src/app/buy-credits/page.tsx` in the `creditPackages` array.
    *   **Webhook Secret (for fulfillment)**:
        1.  Later, when you deploy your app and want to automate credit updates, you'll set up a webhook endpoint.
        2.  In Stripe Dashboard: "Developers" > "Webhooks".
        3.  Click "Add endpoint".
        4.  Enter your deployed endpoint URL (e.g., `https://your-app-url.com/api/stripe-webhook`).
        5.  Select events to listen for, at least `checkout.session.completed`.
        6.  After creating the endpoint, Stripe will show you a "Signing secret" (e.g., `whsec_...`). Copy this.

6.  **Environment Variables**:
    *   In the root directory of your cloned project, create a new file named `.env`.
    *   Copy the contents from `.env.example` (also in the root of the project) into your new `.env` file.
    *   Fill in the placeholder values:

        ```env
        # Firebase Configuration
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"

        # Google AI (Gemini) API Key
        GOOGLE_API_KEY="YOUR_GEMINI_API_KEY_HERE"

        # Stripe API Keys
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_STRIPE_PUBLISHABLE_KEY"
        STRIPE_SECRET_KEY="sk_test_YOUR_STRIPE_SECRET_KEY"
        STRIPE_WEBHOOK_SECRET="whsec_YOUR_STRIPE_WEBHOOK_SECRET" # Needed for secure credit updates
        ```

7.  **Firebase Security Rules**:
    The project includes `firestore.rules` and `storage.rules` files with rules appropriate for the authentication and credit system.

    *   **Firestore Rules**:
        1.  In the Firebase Console, go to your project > "Firestore Database" > "**Rules**" tab.
        2.  Copy the entire content of the `firestore.rules` file from your project.
        3.  Paste it into the rules editor in the Firebase Console, replacing any existing rules.
        4.  Click "**Publish**".

    *   **Storage Rules**:
        1.  In the Firebase Console, go to your project > "Storage" > "**Rules**" tab.
        2.  Copy the entire content of the `storage.rules` file from your project.
        3.  Paste it into the rules editor, replacing any existing rules.
        4.  Click "**Publish**".

## Running the Application

1.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
    This command will typically start:
    *   The Next.js application (usually on `http://localhost:9002` as configured in `package.json`).
    *   The Genkit development server (for AI flows, managed by the Next.js dev script).

2.  **Accessing Pages**:
    Open your browser and navigate to:
    *   **Home Page / Login**: `http://localhost:9002/` (or `http://localhost:9002/auth`)
    *   **Player One**: `http://localhost:9002/player-one` (requires login)
    *   **Player Two**: `http://localhost:9002/player-two` (requires login)
    *   **Viewer Page**: `http://localhost:9002/viewer`
    *   **Admin Panel**: `http://localhost:9002/admin` (requires login)
    *   **Buy Credits**: `http://localhost:9002/buy-credits` (requires login)

## Building for Production

To create an optimized production build:
```bash
npm run build
```
To run the production build:
```bash
npm run start
```

## Stripe Webhook for Credit Updates (Important for Production)

The current implementation redirects users to Stripe for payment. After successful payment, Stripe can notify your application via a webhook. The `src/app/api/stripe-webhook/route.ts` file is a **STUB** and **DOES NOT automatically update user credits.**

**For a production system, you MUST fully implement this webhook:**
1.  **Securely Verify Signatures**: Use the `STRIPE_WEBHOOK_SECRET` to ensure requests are genuinely from Stripe.
2.  **Process `checkout.session.completed` Events**: When this event occurs:
    *   Retrieve the `client_reference_id` (which you set to `currentUser.uid` during checkout session creation).
    *   Determine the amount of credits purchased (e.g., from `line_items` or custom `metadata` you can add to the Checkout Session).
    *   Atomically update the user's `credits` in your Firebase Firestore `users` collection.
3.  **Deploy the Webhook**: Your webhook endpoint must be publicly accessible for Stripe to reach it.
4.  **Configure in Stripe Dashboard**: Add the URL of your deployed webhook endpoint in the Stripe dashboard and select the events to listen to (e.g., `checkout.session.completed`).

## Deployment (Optional - Example: Firebase App Hosting)

If you wish to deploy your application, Firebase App Hosting is a good option for Next.js apps.

1.  **Install Firebase CLI** (if you haven't already):
    ```bash
    npm install -g firebase-tools
    ```
2.  **Login to Firebase**:
    ```bash
    firebase login
    ```
3.  **Initialize Firebase for your project** (if not done previously for hosting):
    ```bash
    firebase init apphosting
    ```
    Follow the prompts, select your Firebase project. The `apphosting.yaml` file in the project is pre-configured.
4.  **Deploy**:
    ```bash
    firebase deploy --only apphosting
    ```
    Remember to update your Stripe webhook endpoint URL in the Stripe dashboard to your deployed app's URL.

## Troubleshooting

*   **`Firebase: Error (auth/invalid-api-key)` or similar Firebase connection issues**:
    *   Double-check that all `NEXT_PUBLIC_FIREBASE_...` variables in your `.env` file are correct.
    *   Restart the Next.js dev server after modifying `.env`.
*   **Images not loading from Firebase Storage**:
    *   Verify that `firebasestorage.googleapis.com` is in `next.config.ts`.
*   **Firestore permission errors (`PERMISSION_DENIED`)**:
    *   Ensure `firestore.rules` and `storage.rules` are correctly published.
    *   Ensure you are logged in for protected actions.
*   **Gemini API errors**:
    *   Check your `GOOGLE_API_KEY` in `.env`.
*   **Stripe Errors / Payment Not Working**:
    *   Ensure `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` are correct in `.env`.
    *   Check the Stripe Dashboard for logs or errors.
    *   Verify that you have created Products and Prices in Stripe and that their Price IDs in `src/app/buy-credits/page.tsx` match.
*   **Credits Not Updating After Payment**:
    *   This is expected with the current stubbed webhook. You need to fully implement `src/app/api/stripe-webhook/route.ts` with signature verification and Firestore update logic.

Thank you for using PromptArena!
