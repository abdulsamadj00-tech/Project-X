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

const LOCAL_STORAGE_KEY = 'medidx_stored_encounters';

const INITIAL_DEMO_ENCOUNTER: Encounter = {
    id: 'demo-case-001',
    ownerId: 'guest-clinician-id',
    timestamp: Date.now() - 3600000 * 2,
    status: 'Active',
    tags: ['Cardiology', 'Acute Care', 'High-Risk'],
    patientData: {
        name: 'Robert Miller',
        age: '54',
        sex: 'Male',
        primaryComplaint: 'Substernal chest pressure and dyspnea on exertion for 3 hours',
        hopi: 'Patient describes acute onset retrosternal crushing pressure radiating to the left jaw and shoulder. Started while shoveling snow. Accompanied by diaphoresis and mild nausea. Relieved partially by resting.',
        findings: 'Patient is diaphoretic, anxious. Heart sounds S1/S2 regular, no audible murmurs or gallops. Lungs clear to auscultation bilaterally. No peripheral pitting edema.',
        vitals: { temp: '37.1', hr: '94', rr: '20', bp: '148/92', spo2: '96' },
        pmh: 'Essential Hypertension (5 years, on Amlodipine), Hypercholesterolemia',
        psh: 'Appendectomy (1998)',
        socialHistory: '15 pack-year tobacco use, occasional alcohol, sedentary lifestyle',
        allergies: 'Penicillin (urticaria)',
        investigations: {
            'ECG': 'Normal sinus rhythm at 94 bpm. 1.5mm ST depression in V4-V6 with symmetrical T-wave inversion.',
            'CBC': 'Hemoglobin: 14.5 g/dL, WBC: 8.2 x10^9/L, Platelets: 235 x10^9/L',
            'Cardiac Markers': 'High-sensitivity Troponin I: 42 ng/L (Elevated)'
        }
    },
    provisionalDiagnoses: [],
    finalDiagnosis: null,
    treatments: [],
    progressNotes: [
        {
            id: 'n-1',
            timestamp: Date.now() - 3600000,
            note: 'Initial triage complete by Dr. Alex Mercer. Placed on continuous telemetry and 2L nasal cannula oxygen. Awaiting serial troponins.',
            symptomScore: 7
        }
    ],
    vitalsHistory: [
        { timestamp: Date.now() - 3600000 * 2, bp: '152/96', hr: '98', rr: '22', temp: '37.1', spo2: '95' },
        { timestamp: Date.now() - 3600000, bp: '148/92', hr: '94', rr: '20', temp: '37.1', spo2: '96' }
    ],
    aiRecommendations: [],
    medicalReports: [],
    sharedWith: []
};

function getLocalEncounters(): Encounter[] {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.warn("Error reading local encounters:", e);
    }
    return [INITIAL_DEMO_ENCOUNTER];
}

function saveLocalEncounters(encounters: Encounter[]) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(encounters));
    } catch (e) {
        console.warn("Error saving local encounters:", e);
    }
}

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

        // Initialize with local cache first to provide instant UI responsiveness
        const local = getLocalEncounters();
        setEncounters(local);

        // If in guest mode, do not call Firestore
        if (user.uid === 'guest-clinician-id') {
            setLoading(false);
            return;
        }

        // Listen to owned encounters from Firestore
        let unsubscribeOwned = () => {};
        let unsubscribeShared = () => {};
        let unsubscribeSharedRecords = () => {};

        try {
            const qOwned = query(collection(db, 'encounters'), where('ownerId', '==', user.uid));
            unsubscribeOwned = onSnapshot(qOwned, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
                setEncounters(prev => {
                    const combined = [...data, ...prev.filter(e => e.ownerId !== user.uid)];
                    saveLocalEncounters(combined);
                    return combined;
                });
            }, (error) => {
                console.warn("Firestore owned encounters sync notice:", error.message || error);
            });

            // Listen to shared encounters
            const qShared = query(collection(db, 'encounters'), where('sharedWith', 'array-contains', user.uid));
            unsubscribeShared = onSnapshot(qShared, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Encounter));
                setEncounters(prev => {
                    const owned = prev.filter(e => e.ownerId === user.uid);
                    const combined = [...owned, ...data];
                    saveLocalEncounters(combined);
                    return combined;
                });
            }, (error) => {
                console.warn("Firestore shared encounters sync notice:", error.message || error);
            });

            // Listen to shared case records
            const qSharedRecords = query(collection(db, 'shared_cases'), where('sharedWith', '==', user.uid));
            unsubscribeSharedRecords = onSnapshot(qSharedRecords, (snapshot) => {
                const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SharedCase));
                setSharedCases(data);
            }, (error) => {
                console.warn("Firestore shared cases sync notice:", error.message || error);
            });
        } catch (err) {
            console.warn("Firestore initialization notice (using offline local storage):", err);
        }

        setLoading(false);
        return () => {
            unsubscribeOwned();
            unsubscribeShared();
            unsubscribeSharedRecords();
        };
    }, [user]);

    const createEncounter = async (data: Partial<Encounter>): Promise<string> => {
        if (!user) throw new Error("User not authenticated");
        
        const newId = `enc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newEncounter: Encounter = {
            id: newId,
            ownerId: user.uid,
            sharedWith: [],
            timestamp: Date.now(),
            status: 'Active',
            tags: data.tags || ['New Case'],
            patientData: data.patientData || {
                name: '', age: '', sex: 'Male', primaryComplaint: '',
                hopi: '', findings: '', vitals: { temp: '', hr: '', rr: '', bp: '', spo2: '' },
                pmh: '', psh: '', socialHistory: '', allergies: '', investigations: {}
            },
            provisionalDiagnoses: data.provisionalDiagnoses || [],
            finalDiagnosis: data.finalDiagnosis || null,
            treatments: data.treatments || [],
            progressNotes: data.progressNotes || [],
            vitalsHistory: data.vitalsHistory || [],
            aiRecommendations: data.aiRecommendations || [],
            medicalReports: data.medicalReports || []
        };

        // Always save locally immediately
        setEncounters(prev => {
            const updated = [newEncounter, ...prev];
            saveLocalEncounters(updated);
            return updated;
        });

        // If authenticated with real Firebase user, also sync to Firestore in background
        if (user.uid !== 'guest-clinician-id') {
            try {
                await addDoc(collection(db, 'encounters'), {
                    ...newEncounter,
                    id: undefined
                });
            } catch (error) {
                console.warn("Firestore addDoc notice (case safely persisted locally):", error);
            }
        }

        return newId;
    };

    const updateEncounter = async (id: string, data: Partial<Encounter>) => {
        // Update locally immediately
        setEncounters(prev => {
            const updated = prev.map(e => e.id === id ? { ...e, ...data } : e);
            saveLocalEncounters(updated);
            return updated;
        });

        // Sync to Firestore if online
        if (user && user.uid !== 'guest-clinician-id') {
            try {
                await updateDoc(doc(db, 'encounters', id), data);
            } catch (error) {
                console.warn("Firestore updateDoc notice (changes preserved locally):", error);
            }
        }
    };

    const deleteEncounter = async (id: string) => {
        // Delete locally immediately
        setEncounters(prev => {
            const updated = prev.filter(e => e.id !== id);
            saveLocalEncounters(updated);
            return updated;
        });

        // Sync to Firestore if online
        if (user && user.uid !== 'guest-clinician-id') {
            try {
                await deleteDoc(doc(db, 'encounters', id));
            } catch (error) {
                console.warn("Firestore deleteDoc notice:", error);
            }
        }
    };

    const shareCase = async (encounterId: string, doctorEmail: string, message?: string) => {
        if (!user) throw new Error("User not authenticated");
        try {
            const q = query(collection(db, 'doctors'), where('email', '==', doctorEmail));
            const snap = await getDocs(q);
            
            if (snap.empty) {
                throw new Error("No clinician found with this email in the database.");
            }
            const targetDoctor = snap.docs[0].data() as any;
            
            await addDoc(collection(db, 'shared_cases'), {
                encounterId,
                sharedBy: user.uid,
                sharedWith: targetDoctor.uid,
                timestamp: Date.now(),
                status: 'Pending',
                message: message || ''
            });

            const encounterDoc = encounters.find(e => e.id === encounterId);
            if (encounterDoc) {
                const sharedWith = [...(encounterDoc.sharedWith || []), targetDoctor.uid];
                await updateEncounter(encounterId, { sharedWith });
            }
        } catch (error: any) {
            console.warn("Case sharing error:", error.message || error);
            throw new Error(error.message || "Failed to share case with clinician.");
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
