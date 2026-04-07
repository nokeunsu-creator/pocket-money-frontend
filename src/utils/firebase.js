import { initializeApp } from 'firebase/app'
import { getDatabase, ref, set, onValue, remove, get, push } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDNkQ75QfbkGoNTt8q0PX7GowOu-WsjoVg",
  authDomain: "pocket-money-d1b18.firebaseapp.com",
  databaseURL: "https://pocket-money-d1b18-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pocket-money-d1b18",
  storageBucket: "pocket-money-d1b18.firebasestorage.app",
  messagingSenderId: "253459747475",
  appId: "1:253459747475:web:d2b1f5461b9ab6dd0b7366",
}

const app = initializeApp(firebaseConfig)
const db = getDatabase(app)

export { db, ref, set, onValue, remove, get, push }
