
export interface Vitals {
    temp: string; // Temperature
    hr: string;   // Heart Rate
    rr: string;   // Respiratory Rate
    bp: string;   // Blood Pressure
    spo2: string; // Oxygen Saturation
}

export interface PatientData {
    name: string;
    age: string;
    sex: 'Male' | 'Female' | 'Other';
    primaryComplaint: string;
    hopi: string; // History of Present Illness
    findings: string;
    vitals: Vitals;
    pmh: string;
    psh: string;
    socialHistory: string;
    allergies: string;
    investigations: { [key: string]: string }; // e.g., { "CBC": "WBC 12.5...", "TSH": "TSH 5.2..." }
}

export interface Treatment {
    id: string;
    drugName: string;
    dosage: string;
    duration: string;
    line: 'First-line' | 'Second-line' | 'Empirical' | 'Combination' | 'Supportive';
    source: 'AI-Recommended' | 'Clinician-Decided';
    rationale: string;
    guidelineFollowed?: boolean;
    deviationReason?: string;
    isActive: boolean;
    history: { date: number; reason: string }[];
}

export interface Diagnosis {
    diagnosisName: string;
    icdCode: string;
    probability: number;
    supportingEvidence: string[];
    contradictingEvidence: string[];
    recommendedTests: string[];
    treatmentSuggestions: {
        firstLine: string[];
        secondLine: string[];
        lifestyle: string[];
        guidelines?: string[];
    };
    morbidity: string;
    mortality: string;
}

export interface ProgressNote {
    id: string;
    timestamp: number;
    note: string;
    symptomScore?: number; // Optional symptom score 1-10
}

export interface VitalsRecord extends Vitals {
    timestamp: number;
}

export interface AIRecommendation {
    id: string;
    recommendation: string;
    causeAnalysis: string;
    severity: 'Mild Adjustment' | 'Significant Review Needed' | 'Urgent Action Required';
    timestamp: number;
}

export interface MedicalReport {
    id: string;
    type: 'ECG' | 'X-Ray' | 'MRI' | 'CT' | 'Lab' | 'Imaging' | 'Other';
    url: string; // URL to the stored file (or base64 for now if no storage)
    analysis: string; // AI analysis result
    timestamp: number;
    fileName: string;
}

export interface Encounter {
    id: string; // Case ID / Serial Number
    patientData: PatientData;
    provisionalDiagnoses: Diagnosis[];
    finalDiagnosis: Diagnosis | null;
    treatments: Treatment[];
    timestamp: number; // Date of entry
    progressNotes: ProgressNote[];
    vitalsHistory: VitalsRecord[];
    aiRecommendations: AIRecommendation[];
    medicalReports: MedicalReport[]; // Added medical reports
    status: 'Active' | 'Discharged' | 'Referred' | 'LAMA';
    tags: string[];
    ownerId: string; // Added ownerId for Firebase
    sharedWith: string[]; // List of doctor UIDs
}

export type DoctorRole = 'Owner' | 'Admin' | 'Clinician' | 'Nurse' | 'MT' | 'WardBoy';

export interface DoctorProfile extends DoctorDetails {
    uid: string;
    email: string;
    specialty: string;
    hospital: string;
    position: string; // Position or Year of Study
    institution: string; // Hospital or Medical College
    createdAt: number;
    lastLogin: number;
    status: 'Active' | 'Pending' | 'Suspended';
    isProfileComplete: boolean;
    role: DoctorRole;
}

export interface SharedCase {
    id: string;
    encounterId: string;
    sharedBy: string; // UID
    sharedWith: string; // UID
    timestamp: number;
    status: 'Pending' | 'Accepted' | 'Declined';
    message?: string;
}


// These types are used by various modals and reports
export interface DoctorDetails {
    name: string;
    role: DoctorRole;
    licenseNumber: string;
}

export type ReportModuleKey = 'demographics' | 'history' | 'vitals' | 'findings' | 'investigations' | 'diagnoses' | 'treatmentPlan' | 'progressSummary';
export type ReportModules = Record<ReportModuleKey, boolean>;

export interface DischargeData {
    finalDiagnosis: string;
    hospitalCourse: string;
    dischargeMedications: string;
    followUpPlan: string;
}

export interface ReferralData {
    receivingDoctor: string;
    reasonForReferral: string;
    clinicalSummary: string;
}

export interface MedicationSuggestion {
    drugName: string;
    dosage: string;
    rationale: string;
    line: 'First-line' | 'Second-line' | 'Supportive';
    guideline: string;
}

