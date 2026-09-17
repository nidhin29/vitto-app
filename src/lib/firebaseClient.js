import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";



const firebaseConfig = {

    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    
}

const app = getApps().length == 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);

