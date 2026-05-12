import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBO79UYiZzSDFHjgWY_enw8oa0_w-1ik28",
  authDomain: "pelada-selva.firebaseapp.com",
  databaseURL: "https://pelada-selva-default-rtdb.firebaseio.com",
  projectId: "pelada-selva",
  storageBucket: "pelada-selva.firebasestorage.app",
  messagingSenderId: "223113381758",
  appId: "1:223113381758:web:c4dae5c4f355ede257552f",
  measurementId: "G-9HL7V50FNJ"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
