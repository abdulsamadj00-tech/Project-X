import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    db, 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc,
    getDocs,
    handleFirestoreError,
    OperationType
} from './firebase';
import { Encounter, SharedCase } from './types';
import { useAuth } from './AuthContext';

interface CaseContextType {
    encounters: Encounter[];
    sharedCases: SharedCase[];
    loading: boolean;
    createEncounter: (data: Partial<Encounter>) => Promise<string>;
    updateEncounter: (id: string, data: Partial<Encounter>) => Promise<void>;
    deleteEncounter: (id: string) => Promise<void>;
    shareCase: (encounterId: string, doctorEmail: string, message?: string) => Promise<void>;
}

const CaseContext = createContext<CaseContextType | undefined>(undefined);

export const CaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [sharedCases, setSharedCases] = useState<SharedCase[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setEncounters([]);
            setSharedCases([]);
            setLoading(false);
            return;
        }

        // Listen to owned encounters
        const qOwned = query(collection(db, 'encounters'), where('ownerId', '==', user.uid));
        const unsubscribeOwned = onSnapshot(qOwned, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
            setEncounters(prev => {
                const other = prev.filter(e => e.ownerId !== user.uid);
                return [...data, ...other];
            });
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'encounters', false));

        // Listen to shared encounters
        const qShared = query(collection(db, 'encounters'), where('sharedWith', 'array-contains', user.uid));
        const unsubscribeShared = onSnapshot(qShared, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
            setEncounters(prev => {
                const owned = prev.filter(e => e.ownerId === user.uid);
                return [...owned, ...data];
            });
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'encounters', false));

        // Listen to shared case records
        const qSharedRecords = query(collection(db, 'shared_cases'), where('sharedWith', '==', user.uid));
        const unsubscribeSharedRecords = onSnapshot(qSharedRecords, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SharedCase));
            setSharedCases(data);
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'shared_cases', false));

        setLoading(false);
        return () => {
            unsubscribeOwned();
            unsubscribeShared();
            unsubscribeSharedRecords();
        };
    }, [user]);

    const createEncounter = async (data: Partial<Encounter>) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const docRef = await addDoc(collection(db, 'encounters'), {
                ...data,
                ownerId: user.uid,
                sharedWith: [],
                timestamp: Date.now(),
                status: 'Active'
            });
            return docRef.id;
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'encounters');
            return '';
        }
    };

    const updateEncounter = async (id: string, data: Partial<Encounter>) => {
        try {
            await updateDoc(doc(db, 'encounters', id), data);
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `encounters/${id}`);
        }
    };

    const deleteEncounter = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'encounters', id));
        } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `encounters/${id}`);
        }
    };

    const shareCase = async (encounterId: string, doctorEmail: string, message?: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            // Find doctor by email
            const q = query(collection(db, 'doctors'), where('email', '==', doctorEmail));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                throw new Error("Doctor not found with this email");
            }
            const targetDoctor = snap.docs[0].data() as any;
            
            // Add to shared_cases
            await addDoc(collection(db, 'shared_cases'), {
                encounterId,
                sharedBy: user.uid,
                sharedWith: targetDoctor.uid,
                timestamp: Date.now(),
                status: 'Pending',
                message: message || ''
            });

            // Update encounter sharedWith list
            const encounterDoc = encounters.find(e => e.id === encounterId);
            if (encounterDoc) {
                const sharedWith = [...(encounterDoc.sharedWith || []), targetDoctor.uid];
                await updateDoc(doc(db, 'encounters', encounterId), { sharedWith });
            }
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, 'shared_cases');
        }
    };

    return (
        <CaseContext.Provider value={{ encounters, sharedCases, loading, createEncounter, updateEncounter, deleteEncounter, shareCase }}>
            {children}
        </CaseContext.Provider>
    );
};

export const useCases = () => {
    const context = useContext(CaseContext);
    if (context === undefined) {
        throw new Error('useCases must be used within a CaseProvider');
    }
    return context;
};

