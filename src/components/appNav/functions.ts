// src/components/appNav/functions.ts
import { signOut } from "firebase/auth";
import { auth } from "@/service/FirebaseSettings";

export const handleLogout = (): Promise<void> => signOut(auth);
