import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyA8OtFZGlYUaWR9W5gkTMZv09_dkCJV7Ls',
  authDomain: 'ciki-a68aa.firebaseapp.com',
  projectId: 'ciki-a68aa',
  storageBucket: 'ciki-a68aa.firebasestorage.app',
  messagingSenderId: '390327880100',
  appId: '1:390327880100:web:a48ac5013f931ab9b09931',
  measurementId: 'G-FP86RCE6VQ',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;