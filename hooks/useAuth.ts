"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { subscribeUserProfile, type UserProfile } from "@/lib/firebase/users";

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

        // The profile is followed live rather than read once, so a plan changed
        // in the database shows on an open page within a moment.
        let stopProfile: (() => void) | null = null;
        let current = 0;

        const unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
            const run = ++current;
            stopProfile?.();
            stopProfile = null;
            setUser(firebaseUser);

            if (!firebaseUser) {
                setProfile(null);
                setLoading(false);
                return;
            }

            let first = true;
            const stop = await subscribeUserProfile(firebaseUser.uid, (next) => {
                if (run !== current) return;
                setProfile(next);
                if (first) {
                    first = false;
                    setLoading(false);
                }
            });
            // Signed out or switched user while the subscription was starting.
            if (run !== current) stop();
            else stopProfile = stop;
        });

        return () => {
            current++;
            stopProfile?.();
            unsubscribe();
        };
    }, []);

    return { user, profile, loading };
}
