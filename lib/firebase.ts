import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { initializeFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAnalytics, isSupported } from "firebase/analytics"

const firebaseConfig = {
  apiKey: "AIzaSyBOBbFifNSfysMS2KrLGM_7GRm5LVNgwx8",
  authDomain: "dy-lms-8e706.firebaseapp.com",
  projectId: "dy-lms-8e706",
  storageBucket: "dy-lms-8e706.firebasestorage.app",
  messagingSenderId: "83433593539",
  appId: "1:83433593539:web:f02743a875696eea79e076",
  measurementId: "G-28JGR9DT2Z",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services with optimized settings
export const auth = getAuth(app)

// Initialize Firestore with offline persistence disabled to avoid listener issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Force long polling instead of WebSocket
})

export const firestore = db
export const storage = getStorage(app)

// Initialize Analytics (웹 환경에서만)
let analytics: any = null
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app)
    }
  })
}

export { analytics }
export default app
