import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    auth, 
    db, 
    googleProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged, 
    User, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc 
} from './firebase';
import { DoctorProfile } from './types';
import { auditService } from './services/auditService';

interface AuthContextType {
    user: User | null;
    profile: DoctorProfile | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signInAsGuest: () => void;
    logout: () => Promise<void>;
    updateProfile: (data: Partial<DoctorProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MOCK_USER = {
    uid: 'guest-clinician-id',
    email: 'demo.clinician@medidx.health',
    displayName: 'Dr. Alex Mercer',
} as User;

export const MOCK_PROFILE: DoctorProfile = {
    uid: 'guest-clinician-id',
    email: 'demo.clinician@medidx.health',
    name: 'Dr. Alex Mercer, MD',
    role: 'Owner',
    licenseNumber: 'MD-94821',
    specialty: 'Internal Medicine & Critical Care',
    hospital: 'Metropolitan General Hospital',
    position: 'Attending Physician',
    institution: 'Department of Clinical Diagnostics',
    createdAt: Date.now(),
    lastLogin: Date.now(),
    status: 'Active',
    isProfileComplete: true
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Default to Guest Clinician so the app opens immediately without hanging on an infinite spinner
    const [user, setUser] = useState<User | null>(() => {
        const stored = localStorage.getItem('medidx_user');
        if (stored) {
            try { return JSON.parse(stored); } catch {}
        }
        return MOCK_USER;
    });

    const [profile, setProfile] = useState<DoctorProfile | null>(() => {
        const stored = localStorage.getItem('medidx_profile');
        if (stored) {
            try { return JSON.parse(stored); } catch {}
        }
        return MOCK_PROFILE;
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && profile) {
            auditService.setUserContext(user.uid, profile.name || user.displayName || 'Doctor', profile.role || 'Clinician');
        }
    }, [user, profile]);

    useEffect(() => {
        // Listen to Firebase auth changes if the user signs in with Google
        let unsubscribe = () => {};
        try {
            unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    localStorage.setItem('medidx_user', JSON.stringify({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName
                    }));

                    try {
                        const docRef = doc(db, 'doctors', firebaseUser.uid);
                        const docSnap = await getDoc(docRef);
                        if (docSnap.exists()) {
                            const p = docSnap.data() as DoctorProfile;
                            setProfile(p);
                            localStorage.setItem('medidx_profile', JSON.stringify(p));
                        } else {
                            const newProfile: DoctorProfile = {
                                uid: firebaseUser.uid,
                                email: firebaseUser.email || '',
                                name: firebaseUser.displayName || 'Doctor',
                                role: 'Clinician',
                                licenseNumber: 'N/A',
                                specialty: 'General Medicine',
                                hospital: 'N/A',
                                position: 'Clinician',
                                institution: 'N/A',
                                isProfileComplete: true,
                                createdAt: Date.now(),
                                lastLogin: Date.now(),
                                status: 'Active'
                            };
                            await setDoc(docRef, newProfile).catch(() => {});
                            setProfile(newProfile);
                            localStorage.setItem('medidx_profile', JSON.stringify(newProfile));
                        }
                    } catch (error) {
                        console.warn("Could not sync profile with Firestore, using local profile:", error);
                    }
                }
            });
        } catch (e) {
            console.warn("Firebase auth listener notice:", e);
        }

        return () => unsubscribe();
    }, []);

    const signInAsGuest = () => {
        setUser(MOCK_USER);
        setProfile(MOCK_PROFILE);
        localStorage.setItem('medidx_user', JSON.stringify(MOCK_USER));
        localStorage.setItem('medidx_profile', JSON.stringify(MOCK_PROFILE));
    };

    const signIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
            console.warn("Google sign-in popup notice:", error.message || error);
            alert(`Google Sign-In note: ${error.message || 'Pop-up blocked or domain not configured'}\n\nContinuing with Demo Clinician profile.`);
            signInAsGuest();
        }
    };

    const logout = async () => {
        localStorage.removeItem('medidx_user');
        localStorage.removeItem('medidx_profile');
        setUser(MOCK_USER);
        setProfile(MOCK_PROFILE);
        try {
            await signOut(auth);
        } catch (error) {
            console.warn("Logout notice:", error);
        }
    };

    const updateProfile = async (data: Partial<DoctorProfile>) => {
        const updated = profile ? { ...profile, ...data } : null;
        setProfile(updated);
        if (updated) {
            localStorage.setItem('medidx_profile', JSON.stringify(updated));
        }

        if (user && user.uid !== MOCK_USER.uid) {
            try {
                const docRef = doc(db, 'doctors', user.uid);
                await updateDoc(docRef, data);
            } catch (error) {
                console.warn("Update profile error in Firestore, saved locally:", error);
            }
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signIn, signInAsGuest, logout, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
