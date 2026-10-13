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
    logout: () => Promise<void>;
    updateProfile: (data: Partial<DoctorProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER = {
    uid: 'guest-user-id',
    email: 'guest@example.com',
    displayName: 'Guest Clinician',
} as User;

const MOCK_PROFILE: DoctorProfile = {
    uid: 'guest-user-id',
    email: 'guest@example.com',
    name: 'Guest Clinician',
    role: 'Owner',
    licenseNumber: 'GUEST-123',
    specialty: 'General Medicine',
    hospital: 'Guest Hospital',
    position: 'Senior Clinician',
    institution: 'Guest Institute',
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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                // Fetch profile
                try {
                    const docRef = doc(db, 'doctors', firebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setProfile(docSnap.data() as DoctorProfile);
                    } else {
                        // Create initial profile if it doesn't exist
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
                    console.error("Error fetching/creating profile:", error);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Sign in error:", error);
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const updateProfile = async (data: Partial<DoctorProfile>) => {
        if (!user) return;
        try {
            const docRef = doc(db, 'doctors', user.uid);
            await updateDoc(docRef, data);
            setProfile(prev => prev ? { ...prev, ...data } : null);
        } catch (error) {
            console.error("Update profile error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signIn, logout, updateProfile }}>
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

