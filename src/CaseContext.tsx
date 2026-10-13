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
import { RANDOM_SAMPLE_CASES, getRandomSampleCase } from './data/sampleCases';

interface CaseContextType {
    encounters: Encounter[];
    sharedCases: SharedCase[];
    loading: boolean;
    createEncounter: (data: Partial<Encounter>) => Promise<string>;
    addRandomCase: (presetIndex?: number) => Promise<string>;
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
    tags: ['Cardiology', 'Acute Care', 'High-Risk', 'ESI-2 Emergent'],
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
            'Cardiac Markers': 'High-sensitivity Troponin I: 42.8 ng/L (Elevated above 99th percentile)'
        }
    },
    triage: {
        level: 2,
        acuityName: 'Emergent (High Risk)',
        colorCode: 'orange',
        targetTimeMinutes: 15,
        avpu: 'Alert',
        painScore: 8,
        redFlags: [
            'Acute Coronary Syndrome / Ischemic Myocardial Presentation',
            'Severe acute pain score >= 8/10 refractory to rest',
            'Diaphoresis and dyspnea accompanying retrosternal chest pressure'
        ],
        vitalTriggers: [
            'Tachycardia (94 bpm)',
            'Hypertensive Emergency Stage (148/92 mmHg)'
        ],
        recommendedResources: [
            'STAT 12-Lead ECG',
            'Serial Cardiac Biomarkers (hs-cTnI)',
            'Continuous Telemetry',
            'Peripheral IV Access'
        ],
        immediateActions: [
            'Perform 12-lead ECG within 10 minutes of presentation',
            'Apply continuous 3-lead telemetry & pulse oximetry',
            'Establish 2 large-bore IV lines (18G)',
            'Administer Aspirin 300-325 mg chewed stat & sublingual Nitroglycerin 0.4 mg PRN'
        ],
        clinicalRationale: 'High-risk acute retrosternal chest pain with diaphoresis, lateral ST depression on ECG, and elevated hs-cTnI. ESI Level 2 Emergent requires physician review within 15 minutes.',
        lastAssessed: Date.now() - 3600000 * 2,
        assessedBy: 'Dr. Alex Mercer, MD (Emergency Triage)'
    },
    provisionalDiagnoses: [
        {
            diagnosisName: 'Acute Non-ST-Segment Elevation Myocardial Infarction (NSTEMI)',
            icdCode: 'ICD-11: BA80.1 | ICD-10: I21.4',
            probability: 84,
            supportingEvidence: [
                'Retrosternal crushing pressure radiating to left arm/jaw',
                'High-sensitivity Troponin I elevated at 42.8 ng/L (normal < 14 ng/L)',
                '12-lead ECG showing 1.5mm ST-segment depression in leads V4-V6',
                'Hypertension, hyperlipidemia, and 15 pack-year smoking history'
            ],
            contradictingEvidence: [
                'No ST-segment elevations on standard leads (rules out STEMI)',
                'Absence of acute pulmonary edema or S3 gallop'
            ],
            recommendedTests: [
                'Serial hs-cTnI at 1h and 2h (ESC 0h/1h algorithm)',
                'Transthoracic Echocardiogram (TTE) for regional wall motion analysis',
                'Urgent Invasive Coronary Angiography within 24 hours'
            ],
            treatmentSuggestions: {
                firstLine: [
                    'Aspirin 300-325 mg PO loading dose chewed stat, followed by 81 mg once daily',
                    'Ticagrelor 180 mg PO loading dose stat, followed by 90 mg BID',
                    'Atorvastatin 80 mg PO once daily at bedtime',
                    'Enoxaparin 1 mg/kg SC q12h'
                ],
                secondLine: [
                    'Metoprolol Succinate 25-50 mg PO daily',
                    'Ramipril 2.5-5 mg PO once daily'
                ],
                lifestyle: [
                    'Immediate bed rest with continuous telemetry',
                    'Smoking cessation counseling and outpatient cardiac rehabilitation referral'
                ],
                guidelines: [
                    '2023 ESC Guidelines for the Management of Acute Coronary Syndromes (Class I, Level A)',
                    '2021 AHA/ACC/CHEST Guideline for the Evaluation and Diagnosis of Chest Pain'
                ]
            },
            morbidity: 'GRACE 2.0 Score: 126 (Intermediate risk, in-hospital mortality 3-8%). TIMI Score: 4 (High risk of recurrent ischemia).',
            mortality: 'Estimated 30-day mortality: 4.2%; 1-year mortality: 8.5% without revascularization.'
        }
    ],
    finalDiagnosis: null,
    treatments: [
        {
            id: 'tx-1',
            drugName: 'Aspirin (Acetylsalicylic Acid)',
            dosage: '325 mg PO chewed stat, then 81 mg daily',
            route: 'Oral (PO)',
            frequency: 'Once Daily (QD)',
            duration: 'Indefinite',
            line: 'First-line',
            source: 'Clinician-Decided',
            rationale: 'Irreversible COX-1 inhibition to suppress platelet aggregation in acute coronary syndrome per 2023 ESC guidelines.',
            guidelineFollowed: true,
            isActive: true,
            status: 'Active',
            changeHistory: [],
            history: [{ date: Date.now() - 3600000 * 2, reason: 'Initiated at triage arrival' }]
        },
        {
            id: 'tx-2',
            drugName: 'Ticagrelor (Brilinta)',
            dosage: '180 mg PO loading dose stat, then 90 mg BID',
            route: 'Oral (PO)',
            frequency: 'Twice Daily (BID)',
            duration: '12 months',
            line: 'First-line',
            source: 'Clinician-Decided',
            rationale: 'Potent reversible P2Y12 platelet inhibitor with superior mortality reduction compared to clopidogrel in NSTEMI.',
            guidelineFollowed: true,
            isActive: true,
            status: 'Active',
            changeHistory: [],
            history: [{ date: Date.now() - 3600000 * 2, reason: 'Initiated per ESC Class I Level A guideline' }]
        },
        {
            id: 'tx-3',
            drugName: 'Atorvastatin Calcium',
            dosage: '80 mg PO once daily at bedtime',
            route: 'Oral (PO)',
            frequency: 'Once Daily (QD)',
            duration: 'Indefinite',
            line: 'First-line',
            source: 'Clinician-Decided',
            rationale: 'High-intensity statin for acute plaque stabilization and pleiotropic anti-inflammatory vascular effects.',
            guidelineFollowed: true,
            isActive: true,
            status: 'Active',
            changeHistory: [],
            history: [{ date: Date.now() - 3600000 * 2, reason: 'High-intensity statin protocol initiated' }]
        },
        {
            id: 'tx-4',
            drugName: 'Metoprolol Succinate ER',
            dosage: '25 mg PO once daily',
            route: 'Oral (PO)',
            frequency: 'Once Daily (QD)',
            duration: 'Ongoing',
            line: 'Second-line',
            source: 'Clinician-Decided',
            rationale: 'Cardioselective beta-1 adrenergic blockade to reduce myocardial oxygen consumption and heart rate.',
            guidelineFollowed: true,
            isActive: true,
            status: 'Active',
            changeHistory: [
                {
                    id: 'ch-1',
                    timestamp: Date.now() - 3600000,
                    previousDrug: 'Carvedilol',
                    previousDosage: '6.25 mg PO BID',
                    newDrug: 'Metoprolol Succinate ER',
                    newDosage: '25 mg PO once daily',
                    reasonCategory: 'Hemodynamic Shift',
                    clinicalRationale: 'Switched to once-daily cardioselective beta-1 blocker to prevent peripheral vasodilation and optimize compliance.'
                }
            ],
            history: [{ date: Date.now() - 3600000 * 2, reason: 'Option changed from Carvedilol to Metoprolol ER' }]
        }
    ],
    stepwisePlan: [
        {
            id: 'step-1',
            phase: 1,
            phaseTitle: 'Phase 1: Immediate Stabilization & Resuscitation (0-15m)',
            title: 'Continuous Telemetry, 2 IV Lines & Pulse Oximetry',
            description: 'Patient placed on 3-lead ECG monitor. Two 18-gauge IV lines secured in antecubital fossa. Supplemental oxygen withheld (SpO2 96% on room air).',
            priority: 'STAT / Critical',
            status: 'Completed',
            completedAt: Date.now() - 3600000 * 2,
            guidelineRef: '2023 ESC ACS Guidelines (Class I, Level C)'
        },
        {
            id: 'step-2',
            phase: 1,
            phaseTitle: 'Phase 1: Immediate Stabilization & Resuscitation (0-15m)',
            title: 'Dual Antiplatelet Loading (Aspirin 325mg + Ticagrelor 180mg)',
            description: 'Chewed non-enteric Aspirin and administered loading dose of Ticagrelor. Sublingual Nitroglycerin spray placed at bedside.',
            priority: 'STAT / Critical',
            status: 'Completed',
            completedAt: Date.now() - 3600000 * 1.8,
            guidelineRef: '2021 AHA/ACC Chest Pain Guideline (Class I, Level A)'
        },
        {
            id: 'step-3',
            phase: 2,
            phaseTitle: 'Phase 2: Rapid Diagnostic Workup & Biomarkers (15-60m)',
            title: '12-Lead ECG Acquisition & Initial hs-cTnI Draw',
            description: 'Standard 12-lead ECG obtained within 8 minutes showing 1.5mm ST depression in V4-V6. Initial hs-cTnI resulted at 42.8 ng/L (Elevated).',
            priority: 'Urgent',
            status: 'Completed',
            completedAt: Date.now() - 3600000 * 1.5,
            guidelineRef: '2023 ESC 0h/1h High-Sensitivity Algorithm'
        },
        {
            id: 'step-4',
            phase: 2,
            phaseTitle: 'Phase 2: Rapid Diagnostic Workup & Biomarkers (15-60m)',
            title: 'Portable Upright Chest X-Ray (CXR)',
            description: 'Rule out thoracic aortic dissection, pneumothorax, and signs of pulmonary interstitial edema.',
            priority: 'Urgent',
            status: 'In Progress',
            guidelineRef: '2021 AHA/ACC Chest Pain Guideline'
        },
        {
            id: 'step-5',
            phase: 3,
            phaseTitle: 'Phase 3: Targeted Pharmacotherapy & Interventions (1-4h)',
            title: 'Parenteral Anticoagulation (Enoxaparin 1 mg/kg SC)',
            description: 'Administer therapeutic dose low-molecular-weight heparin or prepare unfractionated heparin IV protocol.',
            priority: 'Urgent',
            status: 'Pending',
            guidelineRef: '2023 ESC ACS Guidelines (Class I, Level A)'
        },
        {
            id: 'step-6',
            phase: 3,
            phaseTitle: 'Phase 3: Targeted Pharmacotherapy & Interventions (1-4h)',
            title: 'High-Intensity Statin & Beta-Blockade Titration',
            description: 'Administer Atorvastatin 80 mg PO once daily. Titrate Metoprolol ER to maintain resting heart rate 55-65 bpm.',
            priority: 'Standard',
            status: 'In Progress',
            guidelineRef: '2021 AHA/ACC Guidelines'
        },
        {
            id: 'step-7',
            phase: 4,
            phaseTitle: 'Phase 4: In-Hospital Monitoring & Escalation Triggers (4-24h)',
            title: 'Repeat 2-Hour Troponin & GRACE 2.0 Risk Calculation',
            description: 'Confirm delta biomarker rise. If GRACE > 140 or persistent ischemic pain, activate urgent coronary catheterization within 24 hours.',
            priority: 'Urgent',
            status: 'Pending',
            guidelineRef: '2023 ESC Guidelines (Class I, Level A)'
        },
        {
            id: 'step-8',
            phase: 4,
            phaseTitle: 'Phase 4: In-Hospital Monitoring & Escalation Triggers (4-24h)',
            title: 'Transthoracic Echocardiogram (TTE)',
            description: 'Assess left ventricular ejection fraction, regional anterolateral wall motion, and rule out valvular dysfunction.',
            priority: 'Standard',
            status: 'Pending',
            guidelineRef: '2021 AHA/ACC Guidelines'
        },
        {
            id: 'step-9',
            phase: 5,
            phaseTitle: 'Phase 5: Post-Acute Secondary Prevention & Disposition (24+h)',
            title: 'Guideline-Directed Medical Therapy (GDMT) Optimization',
            description: 'Titrate ACE inhibitor / ARB therapy. Maintain dual antiplatelet therapy (DAPT) for 12 months post-NSTEMI.',
            priority: 'Standard',
            status: 'Pending',
            guidelineRef: '2023 ESC Secondary Prevention Guidelines'
        },
        {
            id: 'step-10',
            phase: 5,
            phaseTitle: 'Phase 5: Post-Acute Secondary Prevention & Disposition (24+h)',
            title: 'Inpatient Cardiac Rehabilitation & Lifestyle Transition',
            description: 'Structured smoking cessation protocol, dietary counseling, target LDL-C < 55 mg/dL (< 1.4 mmol/L), outpatient cardiology follow-up in 2 weeks.',
            priority: 'Standard',
            status: 'Pending',
            guidelineRef: '2021 ESC Prevention Guidelines'
        }
    ],
    labTracker: [
        {
            id: 'lab-demo-1',
            testName: 'High-Sensitivity Cardiac Troponin I (hs-cTnI)',
            category: 'Biomarkers',
            orderedAt: Date.now() - 3600000 * 2,
            status: 'Critical Flag',
            resultValue: '42.8',
            unit: 'ng/L',
            referenceRange: '< 14.0 ng/L',
            isAbnormal: true,
            isCritical: true,
            criticalAlertMessage: 'CRITICAL PANIC VALUE: Elevated hs-cTnI indicates acute myocardial injury. ESC 0h/1h pathway triggered.',
            resultedAt: Date.now() - 3600000 * 1.5
        },
        {
            id: 'lab-demo-2',
            testName: '12-Lead Diagnostic Electrocardiogram (ECG)',
            category: 'Imaging & ECG',
            orderedAt: Date.now() - 3600000 * 2,
            status: 'Critical Flag',
            resultValue: '1.5mm ST depression in V4-V6 with symmetrical T-wave inversions',
            referenceRange: 'Normal sinus rhythm, no acute ischemic changes',
            isAbnormal: true,
            isCritical: true,
            criticalAlertMessage: 'ABNORMAL: Acute anterolateral subendocardial ischemia detected.',
            resultedAt: Date.now() - 3600000 * 1.7
        },
        {
            id: 'lab-demo-3',
            testName: 'Complete Blood Count (CBC) with Differential',
            category: 'Hematology',
            orderedAt: Date.now() - 3600000 * 2,
            status: 'Resulted',
            resultValue: 'Hb 14.5 g/dL, WBC 8.2 x10^9/L, Plt 235 x10^9/L',
            unit: 'x10^9/L',
            referenceRange: 'WBC: 4.0 - 11.0, Hb: 13.5 - 17.5',
            isAbnormal: false,
            resultedAt: Date.now() - 3600000 * 1.5
        },
        {
            id: 'lab-demo-4',
            testName: 'Comprehensive Metabolic Panel (CMP)',
            category: 'Chemistry & Metabolic',
            orderedAt: Date.now() - 3600000 * 2,
            status: 'Resulted',
            resultValue: 'Creatinine 1.05 mg/dL, eGFR > 85 mL/min, K+ 4.2 mEq/L, Na+ 139 mEq/L',
            unit: 'mg/dL',
            referenceRange: 'Cr: 0.7 - 1.2, K: 3.5 - 5.0',
            isAbnormal: false,
            resultedAt: Date.now() - 3600000 * 1.5
        },
        {
            id: 'lab-demo-5',
            testName: 'Coagulation Profile (PT / INR / aPTT)',
            category: 'Coagulation',
            orderedAt: Date.now() - 3600000,
            status: 'In Lab Processing',
            referenceRange: 'INR: 0.9 - 1.1 | aPTT: 25 - 35 sec'
        },
        {
            id: 'lab-demo-6',
            testName: 'Portable Upright Chest Radiography (CXR)',
            category: 'Imaging & ECG',
            orderedAt: Date.now() - 3600000,
            status: 'In Lab Processing',
            referenceRange: 'No cardiomegaly, clear lung fields, no mediastinal widening'
        },
        {
            id: 'lab-demo-7',
            testName: 'Repeat 2-Hour High-Sensitivity Troponin I',
            category: 'Biomarkers',
            orderedAt: Date.now() - 1800000,
            status: 'Sample Collected',
            referenceRange: '< 14.0 ng/L',
            unit: 'ng/L'
        }
    ],
    consultationMessages: [
        {
            id: 'c-demo-1',
            sender: 'MediDx AI Panel',
            text: `### Multidisciplinary Case Conference: Robert Miller (54M)\n\n**1. Primary Working Etiology (ICD-11 BA80.1)**:\nThe patient's retrosternal chest pressure with radiation to jaw, lateral ST depression in V4-V6, and hs-cTnI of 42.8 ng/L establishes the clinical diagnosis of **Acute NSTEMI** per **2023 ESC Guidelines (Class I, Level A)**. Prompt DAPT (Aspirin + Ticagrelor) and parenteral anticoagulation are mandated.\n\n**2. DSM-5 Neuropsychiatric & Panic Differentiation (DSM-5 300.01)**:\nWhile the patient exhibits profound diaphoresis and anxiety compatible with acute autonomic arousal seen in panic attacks, the presence of objective biomarker elevation (Troponin 42.8 ng/L) and electrocardiographic ischemia strictly establishes organic ischemia. DSM-5 criteria dictate that somatic or panic diagnoses cannot supersede organic coronary disease. However, supportive clinician communication and reassurance are vital to mitigate catecholamine-driven myocardial oxygen demand.\n\n**3. Nephroprotection per KDIGO 2023**:\nBaseline serum creatinine of 1.05 mg/dL confirms preserved renal function. Maintain adequate isotonic crystalloid hydration prior to planned coronary angiography to minimize contrast-induced acute kidney injury risk.`,
            timestamp: Date.now() - 3600000,
            icd11References: [
                'ICD-11: BA80.1 (Non-ST-segment elevation myocardial infarction)',
                'ICD-11: MD30 (Chest pain, unspecified)',
                'ICD-11: 6B01 (Panic disorder screening)'
            ],
            dsm5References: [
                'DSM-5: 300.01 (Panic Disorder / Acute Panic Attack — autonomic hyperarousal, diaphoresis, chest discomfort)',
                'DSM-5: 300.82 (Somatic Symptom Disorder — cognitive distress related to acute physical symptoms)'
            ],
            guidelineCitations: [
                '2023 ESC Guidelines for the Management of Acute Coronary Syndromes (Class I, Level A)',
                '2021 AHA/ACC/CHEST Guideline for the Evaluation and Diagnosis of Chest Pain',
                '2023 KDIGO Clinical Practice Guidelines for Renal Safety',
                'APA DSM-5-TR Clinical Practice Guidelines in Medical Consultation'
            ],
            recommendedActions: {
                immediate24h: [
                    'Execute repeat 2-hour hs-cTnI sample to evaluate delta kinetics',
                    'Maintain continuous telemetry monitoring for ischemic dysrhythmias',
                    'Initiate parenteral anticoagulation (Enoxaparin 1 mg/kg SC q12h)'
                ],
                milestones48h: [
                    'Urgent Invasive Coronary Angiography within 24 hours (GRACE score > 140)',
                    'Transthoracic Echocardiogram (TTE) to quantify left ventricular ejection fraction',
                    'Fasting lipid panel and HbA1c testing'
                ],
                specialtyConsults: [
                    'Inpatient Cardiology Consult for catheterization timing',
                    'Consultation-Liaison Health Psychology for cardiac anxiety reduction'
                ],
                dsm5PsychiatricNotes: 'Address the patient’s elevated autonomic fear with structured cardiac reassurance and education. Avoid sedative polypharmacy.'
            }
        }
    ],
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

    const addRandomCase = async (presetIndex?: number): Promise<string> => {
        let caseTemplate: Omit<Encounter, 'id' | 'timestamp'>;
        if (presetIndex !== undefined && RANDOM_SAMPLE_CASES[presetIndex]) {
            caseTemplate = JSON.parse(JSON.stringify(RANDOM_SAMPLE_CASES[presetIndex]));
        } else {
            caseTemplate = getRandomSampleCase();
        }
        return await createEncounter(caseTemplate);
    };

    return (
        <CaseContext.Provider value={{ encounters, sharedCases, loading, createEncounter, addRandomCase, updateEncounter, deleteEncounter, shareCase }}>
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
