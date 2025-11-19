
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Production configuration for JB Trade Link
const firebaseConfig = {
  apiKey: "AIzaSyDxuZbCtvEZ6EoxMDzA5p1roDbe_dAIbTQ",
  authDomain: "studio-4686483029-f36b7.firebaseapp.com",
  databaseURL: "https://studio-4686483029-f36b7-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "studio-4686483029-f36b7",
  storageBucket: "studio-4686483029-f36b7.firebasestorage.app",
  messagingSenderId: "192448588638",
  appId: "1:192448588638:web:bd92c4357ea572025cfdcf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export initialized services
export const auth = getAuth(app);
export const db = getFirestore(app);

export const collections = {
  users: 'users',
  products: 'products',
  orders: 'orders',
  customers: 'customers',
  purchases: 'purchases',
  trips: 'trips',
  returns: 'returns',
};
