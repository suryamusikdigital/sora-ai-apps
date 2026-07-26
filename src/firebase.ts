import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDf0i2RTVardvVTvbWe0qdJLVupdG1XlbE",
  authDomain: "sora-ai-1aa56.firebaseapp.com",
  projectId: "sora-ai-1aa56",
  storageBucket: "sora-ai-1aa56.firebasestorage.app",
  messagingSenderId: "508339520020",
  appId: "1:508339520020:web:temp_placeholder_id" // Ideally replace with actual Web App ID later
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
