# Family Tree SaaS (Arabic Interface)

An advanced web application for building and managing family trees, designed with a focus on Arabic users and a unique bottom-up visualization.

**[Live Access](https://family-tree-members-516888227390.us-central1.run.app/dashboard)**

## 🌟 Features

*   **Arabic Interface**: Built from the ground up with Right-to-Left (RTL) layout and optimized Arabic typography (Cairo font).
*   **Unique Visualization**: displaying ancestors at the bottom growing upwards, simulating a natural tree structure.
*   **Role-Based Access**:
    *   **Super Admin**: Can create unique family tree instances and assign admins.
    *   **Tree Admin**: Manages their specific family tree (add/edit members).
    *   **Guest**: View-only access to public trees.
*   **Gender-Specific Styling**: distinct visual cues (colors and icons) for male and female members.
*   **Import/Export**: Easily backup or migrate subtree data using JSON.
*   **Cloud Hosted**: Deployed on Google Cloud Run for scalability.

## 🛠️ Tech Stack

*   **Frontend**: Next.js 16 (App Router), React, Tailwind CSS.
*   **Backend**: Firebase (Authentication, Firestore Database).
*   **Deployment**: Docker, Google Cloud Run.

## 🚀 Getting Started

### Prerequisites

*   Node.js 18+
*   Firebase Project (with Auth & Firestore enabled)

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/githubsud/family-tree.git
    cd family-tree
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Create a `.env.local` file in the root directory and add your Firebase credentials:
    ```bash
    NEXT_PUBLIC_FIREBASE_API_KEY=...
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
    # ... and Admin SDK keys if running locally
    ```

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## 📦 Deployment (Google Cloud Run)

This project is configured for one-click deployment to Google Cloud Run using `gcloud`.

1.  **Build Docker Image**:
    ```bash
    gcloud builds submit --project=[YOUR_PROJECT_ID] --tag gcr.io/[YOUR_PROJECT_ID]/family-tree
    ```

2.  **Deploy**:
    ```bash
    gcloud run deploy family-tree --image gcr.io/[YOUR_PROJECT_ID]/family-tree --platform managed --allow-unauthenticated
    ```

## 📝 License

This project is open source.
