
# PromptArena - AI Image Prompt Battle Platform

Welcome to PromptArena! This platform allows two players to engage in a creative text-to-image battle. Players submit prompts based on a central theme, an AI generates images from these prompts, and viewers can watch the action unfold live. An admin panel provides controls to manage the game.

Viewer POV:
![ViewShowUpdate2](https://github.com/user-attachments/assets/91098bac-73b3-497d-8348-9a3b181a81c2)

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

*   **Player Interface**: Dedicated pages for Player One and Player Two to submit their prompts.
*   **AI Image Generation**: Utilizes Google's Gemini model via Genkit to generate images from text prompts.
*   **Live Viewer Page**: Spectators can see the central prompt, player typing progress in real-time, final submitted prompts, and the generated images (once revealed by admin).
*   **Admin Control Panel**:
    *   Set/update the central game prompt.
    *   Start, pause, complete, and reset game rounds.
    *   Reveal generated images to viewers.
    *   Monitor player activity (last seen online/typing).
    *   Test the image generation API connection.
*   **Real-time Updates**: Firebase Firestore ensures that all game state changes are reflected live across all clients (players, viewers, admin).
*   **Image Storage**: Generated images are stored in Firebase Storage.

## Tech Stack

*   **Frontend**:
    *   Next.js (App Router, Server Components)
    *   React
    *   TypeScript
*   **Styling**:
    *   Tailwind CSS
    *   ShadCN UI (for pre-built components)
*   **Backend & Real-time**:
    *   Firebase (Firestore for database, Storage for images)
*   **AI Integration**:
    *   Genkit
    *   Google Gemini API (for image generation)

## Prerequisites

Before you begin, ensure you have the following installed and set up:

*   **Node.js**: Version 18.x or 20.x recommended. You can download it from [nodejs.org](https://nodejs.org/).
*   **npm** (comes with Node.js) or **yarn**.
*   **Firebase Account**: Create one for free at [firebase.google.com](https://firebase.google.com/).
*   **Google Cloud Project / Google AI Studio Account**:
    *   You'll need this to obtain an API key for the Gemini API. Using [Google AI Studio](https://aistudio.google.com/) is often the quickest way to get an API key for experimentation.

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
    *   Once your project is created, you'll need to set up Firestore and Storage:

    *   **Enable Firestore**:
        1.  In your Firebase project dashboard, navigate to "Build" (in the left sidebar) > "Firestore Database".
        2.  Click "**Create database**".
        3.  Choose to start in **test mode**.
            *   _Note: Test mode allows open read/write access for 30 days. For production, you **must** configure secure Firebase Security Rules._
        4.  Select a location for your Firestore database (choose a region close to your users). Click "Enable".

    *   **Enable Firebase Storage**:
        1.  Navigate to "Build" > "Storage".
        2.  Click "**Get started**".
        3.  Follow the prompts. The default security rules for Storage in test mode are generally fine for local development (they allow authenticated users to read/write). We will update these later.
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

5.  **Environment Variables**:
    *   In the root directory of your cloned project, create a new file named `.env`.
    *   Copy the contents from `.env.example` (also in the root of the project) into your new `.env` file.
    *   Fill in the placeholder values with your actual Firebase project configuration values (from step 3) and your Gemini API key (from step 4):

        ```env
        # Firebase Configuration - Get these from your Firebase project settings
        NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
        NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
        NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"

        # Google AI (Gemini) API Key - Get this from Google AI Studio
        GOOGLE_API_KEY="YOUR_GEMINI_API_KEY_HERE"
        ```

6.  **Firebase Security Rules**:
    The project includes `firestore.rules` and `storage.rules` files with basic rules for development.

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
    *   **Home Page**: `http://localhost:9002/`
    *   **Player One**: `http://localhost:9002/player-one`
    *   **Player Two**: `http://localhost:9002/player-two`
    *   **Viewer Page**: `http://localhost:9002/viewer`
    *   **Admin Panel**: `http://localhost:9002/admin`

## Building for Production

To create an optimized production build:
```bash
npm run build
```
To run the production build:
```bash
npm run start
```

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

## Troubleshooting

*   **`Firebase: Error (auth/invalid-api-key)`**:
    *   Double-check that all `NEXT_PUBLIC_FIREBASE_...` variables in your `.env` file are correct and match your Firebase project's web app config.
    *   Ensure you've restarted the Next.js development server (`npm run dev`) after modifying the `.env` file.
*   **Images not loading from Firebase Storage / `next/image` errors**:
    *   Verify that `firebasestorage.googleapis.com` is listed in the `images.remotePatterns` section of your `next.config.ts` file.
    *   Restart the dev server after any changes to `next.config.ts`.
*   **Firestore permission errors (`PERMISSION_DENIED`)**:
    *   Make sure you have correctly copied and published the rules from `firestore.rules` to your Firestore database in the Firebase console.
    *   If you're past the 30-day test mode limit, your rules might have reverted to deny all. Re-apply the development rules or implement proper authenticated rules.
*   **Gemini API errors / Image generation failing**:
    *   Ensure your `GOOGLE_API_KEY` in `.env` is correct and active.
    *   Check the Google AI Studio or Google Cloud Console for any issues with your API key or billing (if applicable beyond the free tier).
    *   The admin panel's "Test Image Generation API" button can help diagnose this.

Thank you for using PromptArena!
