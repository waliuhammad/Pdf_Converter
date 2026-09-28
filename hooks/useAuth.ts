"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { getUserProfile, type UserProfile } from "@/lib/firebase/users";

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
}

export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    // Without Firebase config nobody can be signed in, so there is nothing to wait for.
    const [loading, setLoading] = useState(isFirebaseConfigured);

    useEffect(() => {
        if (!isFirebaseConfigured) return;
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