export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBVAy2lHKCvInzR-Ay9fn4HYAIs1oz37Gk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sitehouseland.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sitehouseland",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sitehouseland.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "778832302071",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:778832302071:web:7cc51199fb6b577fae68f2",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-S3BQLKJR5D"
};
