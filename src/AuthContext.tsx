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
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user previously selected Guest / Demo Clinician mode
        const isGuest = localStorage.getItem('medidx_guest_mode') === 'true';
        if (isGuest) {
            const savedProfile = localStorage.getItem('medidx_guest_profile');
            setUser(MOCK_USER);
            setProfile(savedProfile ? JSON.parse(savedProfile) : MOCK_PROFILE);
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                try {
                    const docRef = doc(db, 'doctors', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as DoctorProfile);
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
                            isProfileComplete: false,
                            createdAt: Date.now(),
                            lastLogin: Date.now(),
                            status: 'Active'
                        };
                        await setDoc(docRef, newProfile);
                        setProfile(newProfile);
                    }
                } catch (error) {
                    console.warn("Could not sync profile with Firestore, using local session:", error);
                    setProfile({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: firebaseUser.displayName || 'Doctor',
                        role: 'Owner',
                        licenseNumber: 'MD-TEMP',
                        specialty: 'General Medicine',
                        hospital: 'Clinical Practice',
                        position: 'Clinician',
                        institution: 'MediDx Network',
                        isProfileComplete: true,
                        createdAt: Date.now(),
                        lastLogin: Date.now(),
                        status: 'Active'
                    });
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInAsGuest = () => {
        localStorage.setItem('medidx_guest_mode', 'true');
        setUser(MOCK_USER);
        setProfile(MOCK_PROFILE);
    };

    const signIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error: any) {
            console.error("Sign in error:", error);
            // If Google popup fails (domain not whitelisted, blocked popup, etc.), seamlessly log in as Guest
            const shouldFallback = window.confirm(
                `Google Sign-In note: ${error.message || 'Popup blocked or domain not configured'}\n\nWould you like to continue in Demo Clinician mode with full access?`
            );
            if (shouldFallback) {
                signInAsGuest();
            }
        }
    };

    const logout = async () => {
        localStorage.removeItem('medidx_guest_mode');
        localStorage.removeItem('medidx_guest_profile');
        setUser(null);
        setProfile(null);
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const updateProfile = async (data: Partial<DoctorProfile>) => {
        if (!user) return;
        const updated = profile ? { ...profile, ...data } : null;
        setProfile(updated);

        if (user.uid === MOCK_USER.uid) {
            localStorage.setItem('medidx_guest_profile', JSON.stringify(updated));
            return;
        }

        try {
            const docRef = doc(db, 'doctors', user.uid);
            await updateDoc(docRef, data);
        } catch (error) {
            console.warn("Update profile error in Firestore, saved locally:", error);
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
