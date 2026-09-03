"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { getUserProfile, type UserProfile } from "@/lib/firebase/users";

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
}

export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const fetchedProfile = await getUserProfile(firebaseUser.uid);
                setProfile(fetchedProfile);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, profile, loading };
}