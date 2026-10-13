
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

export interface TreatmentChangeRecord {
    id: string;
    timestamp: number;
    previousDrug: string;
    previousDosage: string;
    newDrug: string;
    newDosage: string;
    reasonCategory: 'Renal / Hepatic Clearance' | 'Adverse Reaction / Allergy' | 'Treatment Failure / Deterioration' | 'Culture / Sensitivity Optimization' | 'Guideline Escalation' | 'Hemodynamic Shift';
    clinicalRationale: string;
    prescribingClinician?: string;
}

export interface Treatment {
    id: string;
    drugName: string;
    dosage: string;
    route?: 'Oral (PO)' | 'Intravenous (IV)' | 'Subcutaneous (SC)' | 'Inhalation' | 'Sublingual (SL)' | 'Intramuscular (IM)' | 'Topical' | 'Other';
    frequency?: 'STAT / Once' | 'Once Daily (QD)' | 'Twice Daily (BID)' | 'Three Times Daily (TID)' | 'Four Times Daily (QID)' | 'Every 8 Hours (q8h)' | 'Every 12 Hours (q12h)' | 'Continuous Infusion' | 'PRN (As Needed)';
    duration: string;
    line: 'First-line' | 'Second-line' | 'Empirical' | 'Combination' | 'Supportive';
    source: 'AI-Recommended' | 'Clinician-Decided';
    rationale: string;
    guidelineFollowed?: boolean;
    deviationReason?: string;
    isActive: boolean;
    status?: 'Active' | 'Titrating' | 'Paused' | 'Discontinued' | 'Completed';
    changeHistory?: TreatmentChangeRecord[];
    history: { date: number; reason: string }[];
}

export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface TriageAssessment {
    level: TriageLevel;
    acuityName: 'Resuscitation (Immediate)' | 'Emergent (High Risk)' | 'Urgent (2+ Resources)' | 'Less Urgent (1 Resource)' | 'Non-Urgent (0 Resources)';
    colorCode: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
    targetTimeMinutes: number; // e.g. 0, 15, 60, 120, 240
    avpu: 'Alert' | 'Verbal' | 'Pain' | 'Unresponsive';
    painScore: number; // 0 - 10
    redFlags: string[];
    vitalTriggers: string[];
    recommendedResources: string[];
    immediateActions: string[];
    clinicalRationale: string;
    lastAssessed: number;
    assessedBy?: string;
}

export interface ManagementStep {
    id: string;
    phase: 1 | 2 | 3 | 4 | 5;
    phaseTitle: string; // e.g. 'Phase 1: Immediate Stabilization (0-15m)'
    title: string;
    description: string;
    priority: 'STAT / Critical' | 'Urgent' | 'Standard' | 'Conditional';
    status: 'Pending' | 'In Progress' | 'Completed';
    completedAt?: number;
    completedBy?: string;
    clinicalNotes?: string;
    guidelineRef?: string;
}

export type LabCategory = 'Biomarkers' | 'Hematology' | 'Chemistry & Metabolic' | 'Coagulation' | 'Blood Gas & Acid-Base' | 'Microbiology' | 'Imaging & ECG' | 'Other';
export type LabStatus = 'Ordered' | 'Sample Collected' | 'In Lab Processing' | 'Resulted' | 'Critical Flag';

export interface LabTestOrder {
    id: string;
    testName: string;
    category: LabCategory;
    orderedAt: number;
    status: LabStatus;
    resultValue?: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
    isCritical?: boolean;
    criticalAlertMessage?: string;
    resultedAt?: number;
    notes?: string;
}

export interface ConsultationMessage {
    id: string;
    sender: 'Clinician' | 'MediDx AI Panel';
    text: string;
    timestamp: number;
    icd11References?: string[];
    dsm5References?: string[];
    guidelineCitations?: string[];
    recommendedActions?: {
        immediate24h: string[];
        milestones48h: string[];
        specialtyConsults: string[];
        dsm5PsychiatricNotes?: string;
    };
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

export interface ClinicalRiskScore {
    id: string;
    name: string; // e.g., 'Wells Score for PE', 'CURB-65', 'TIMI Risk Score (NSTEMI)', 'CHA2DS2-VASc'
    score: number;
    maxScore: number;
    riskCategory: 'Low Risk' | 'Intermediate / Moderate Risk' | 'High Risk' | 'Very High Risk';
    interpretation: string;
    clinicalRecommendation: string;
    criteriaChecked: { label: string; points: number }[];
    calculatedAt: number;
}

export interface DDIAlert {
    id: string;
    severity: 'Contraindicated' | 'Major Warning' | 'Moderate' | 'Minor';
    interactingDrugs: [string, string];
    mechanism: string;
    clinicalImpact: string;
    recommendation: string;
    evidenceClass: string;
}

export interface AllergyAlert {
    id: string;
    drugName: string;
    matchedAllergy: string;
    reactionRisk: string;
    crossReactivityRisk?: string;
    recommendation: string;
}

export interface NEWS2Assessment {
    totalScore: number;
    riskLevel: 'Low (0-4)' | 'Medium (5-6 or 3 in single parameter)' | 'High (7+)';
    colorCode: 'green' | 'amber' | 'red';
    monitoringFrequency: string;
    clinicalResponse: string;
    parameterScores: {
        respiratoryRate: { value: string; score: number };
        oxygenSaturation: { value: string; score: number };
        supplementalOxygen: { value: boolean; score: number };
        systolicBP: { value: string; score: number };
        pulseRate: { value: string; score: number };
        consciousness: { value: string; score: number };
        temperature: { value: string; score: number };
    };
    calculatedAt: number;
}

export interface PatientEducationDoc {
    language: string; // e.g., 'English', 'Spanish', 'Urdu', 'Arabic', 'French'
    conditionName: string;
    simpleSummary: string;
    whyPrescribedMedications: { drug: string; purpose: string; howToTake: string }[];
    redFlagSigns: string[];
    whatToDoInEmergency: string;
    lifestyleAndDietAdvice: string[];
    followUpPlan: string;
    generatedAt: number;
}

export interface ClinicianAttestation {
    id: string;
    clinicianName: string;
    role: string;
    licenseNumber: string;
    timestamp: number;
    verifiedDiagnosesCount: number;
    verifiedTreatmentsCount: number;
    statement: string;
    signatureDigitalHash: string;
}

export interface Encounter {
    id: string; // Case ID / Serial Number
    patientData: PatientData;
    triage?: TriageAssessment;
    provisionalDiagnoses: Diagnosis[];
    finalDiagnosis: Diagnosis | null;
    treatments: Treatment[];
    stepwisePlan?: ManagementStep[];
    labTracker?: LabTestOrder[];
    consultationMessages?: ConsultationMessage[];
    riskScores?: ClinicalRiskScore[];
    ddiAlerts?: DDIAlert[];
    allergyAlerts?: AllergyAlert[];
    news2?: NEWS2Assessment;
    patientEducation?: PatientEducationDoc;
    attestation?: ClinicianAttestation;
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

