import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Reads from VITE_ env vars when set (production / CI builds),
// otherwise falls back to the hardcoded dev project config.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            || 'AIzaSyA8OtFZGlYUaWR9W5gkTMZv09_dkCJV7Ls',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        || 'ciki-a68aa.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         || 'ciki-a68aa',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     || 'ciki-a68aa.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID|| '390327880100',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             || '1:390327880100:web:a48ac5013f931ab9b09931',
  measurementId: 'G-FP86RCE6VQ',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;