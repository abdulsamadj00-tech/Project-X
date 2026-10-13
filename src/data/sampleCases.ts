import { Encounter } from '../types';

export const RANDOM_SAMPLE_CASES: Omit<Encounter, 'id' | 'timestamp'>[] = [
    {
        ownerId: 'demo-clinician',
        status: 'Active',
        tags: ['Pulmonology', 'Critical Care', 'Sepsis-3', 'CURB-65', 'ESI-2 Emergent'],
        patientData: {
            name: 'Parveen Akhtar',
            age: '68',
            sex: 'Female',
            primaryComplaint: 'Severe productive cough, high fever, and shortness of breath for 4 days',
            hopi: 'Patient presents with worsening dyspnea, rigors, and production of thick rust-colored sputum. Her daughter notes she became acutely confused and disoriented to time this morning. Pleuritic right lower chest pain on inspiration. Decreased oral intake for 48 hours.',
            findings: 'Patient is tachypneic, lethargic, oriented only to self. Bronchial breath sounds and inspiratory crackles auscultated over right lower lung zone. Dullness to percussion at right lung base. Capillary refill 3.5 seconds. Mucous membranes dry.',
            vitals: { temp: '38.9', hr: '114', rr: '28', bp: '96/60', spo2: '90' },
            pmh: 'COPD (GOLD Group B on Tiotropium), Type 2 Diabetes Mellitus (HbA1c 7.4%), Osteoarthritis',
            psh: 'Total Knee Arthroplasty (2018)',
            socialHistory: 'Former smoker (30 pack-years, quit 6 years ago). Lives with daughter.',
            allergies: 'Sulfa drugs (Stevens-Johnson syndrome risk), Penicillin (mild GI upset only)',
            investigations: {
                'Chest X-Ray': 'Dense airspace consolidation with air bronchograms in the right lower lobe. Small reactive parapneumonic pleural effusion.',
                'CBC': 'WBC: 18.6 x10^9/L (86% neutrophils, 8% bands), Hemoglobin: 11.2 g/dL, Platelets: 182 x10^9/L',
                'Renal & Electrolytes': 'Sodium: 133 mmol/L, Potassium: 4.6 mmol/L, BUN: 24 mg/dL, Creatinine: 1.4 mg/dL',
                'Blood Gas (VBG)': 'pH: 7.34, pCO2: 44 mmHg, Lactate: 2.8 mmol/L'
            }
        },
        triage: {
            level: 2,
            acuityName: 'Emergent (High Risk)',
            colorCode: 'orange',
            targetTimeMinutes: 15,
            avpu: 'Verbal',
            painScore: 7,
            redFlags: [
                'Sepsis-3 criteria met (qSOFA score 2: RR >= 22, SBP <= 100, altered mental status)',
                'Severe hypoxemia (SpO2 90% on room air with COPD background)',
                'Elevated blood lactate (2.8 mmol/L) with relative hypotension'
            ],
            vitalTriggers: [
                'Tachypnea (28 br/m)',
                'Tachycardia (114 bpm)',
                'Hypotension (96/60 mmHg, MAP 72 mmHg)',
                'Hypoxemia (90% SpO2)'
            ],
            recommendedResources: [
                'Blood Cultures x 2 pairs STAT',
                'Sputum Gram stain & culture',
                'IV Broad-spectrum antibiotics within 1 hour',
                'IV Crystalloid bolus (30 mL/kg)',
                'Supplementary Titrated Oxygen'
            ],
            immediateActions: [
                'Administer 28-35% Venturi mask targeting SpO2 88-92% (COPD precaution)',
                'Initiate 1,500 mL balanced crystalloid (Plasmalyte/LR) rapid infusion',
                'Draw blood cultures before antibiotic administration',
                'Administer IV Ceftriaxone 2g + IV Azithromycin 500mg STAT',
                'Recheck lactate at 2 hours'
            ],
            clinicalRationale: 'Severe Community-Acquired Pneumonia with Sepsis (CURB-65 = 3: Confusion, Urea > 19, RR >= 30, Age >= 65). High risk of rapid respiratory decompensation.',
            lastAssessed: Date.now() - 3600000,
            assessedBy: 'Dr. Aiman Fatima, FCPS (Emergency Medicine)'
        },
        provisionalDiagnoses: [
            {
                diagnosisName: 'Severe Community-Acquired Pneumonia (CAP) with Sepsis',
                icdCode: 'ICD-11: CA40.0 | ICD-10: J18.9 / R65.20',
                probability: 91,
                supportingEvidence: [
                    'High fever (38.9°C), productive rust sputum, right lower lobe consolidation on CXR',
                    'Elevated WBC (18.6 with bandemia) and serum lactate 2.8 mmol/L',
                    'CURB-65 score 3 points (Confusion, BUN 24 mg/dL, Age 68)',
                    'qSOFA score 2 (RR 28, SBP 96 mmHg, acute mental status change)'
                ],
                contradictingEvidence: [
                    'No prior hospitalizations in last 90 days (favors community rather than nosocomial)'
                ],
                recommendedTests: [
                    'Legionella and Streptococcus pneumoniae urinary antigen tests',
                    'Serial venous blood lactate at 2h and 4h',
                    'Repeat CBC and renal function at 24 hours'
                ],
                treatmentSuggestions: {
                    firstLine: ['IV Ceftriaxone 2g + IV Azithromycin 500mg', 'Balanced crystalloid 30 mL/kg'],
                    secondLine: ['Piperacillin-Tazobactam or Cefepime if Pseudomonas risk'],
                    lifestyle: ['Titrated oxygen via Venturi mask (target SpO2 88-92%)']
                },
                morbidity: 'High risk ICU admission',
                mortality: '15-20% 30-day mortality'
            },
            {
                diagnosisName: 'Acute Exacerbation of Chronic Obstructive Pulmonary Disease (AECOPD)',
                icdCode: 'ICD-11: CA22.1 | ICD-10: J44.1',
                probability: 72,
                supportingEvidence: [
                    'Pre-existing COPD background with increased sputum purulence and dyspnea'
                ],
                contradictingEvidence: [
                    'Dense lobar consolidation on CXR is primary driver rather than pure bronchospasm'
                ],
                recommendedTests: [
                    'Arterial blood gas (ABG) if hypercapnia suspected'
                ],
                treatmentSuggestions: {
                    firstLine: ['Inhaled ipratropium + albuterol nebulization', 'Oral Prednisone 40mg'],
                    secondLine: ['NIV / BiPAP if pH < 7.35 and pCO2 > 45'],
                    lifestyle: ['Smoking cessation counseling']
                },
                morbidity: 'Moderate',
                mortality: 'Variable'
            }
        ],
        finalDiagnosis: null,
        treatments: [
            {
                id: 'tx-parveen-1',
                drugName: 'Ceftriaxone',
                dosage: '2 g',
                route: 'Intravenous (IV)',
                frequency: 'Once Daily (QD)',
                duration: '7 days',
                line: 'First-line',
                source: 'Clinician-Decided',
                rationale: 'Empiric coverage for Streptococcus pneumoniae and common CAP pathogens',
                isActive: true,
                history: []
            },
            {
                id: 'tx-parveen-2',
                drugName: 'Azithromycin',
                dosage: '500 mg',
                route: 'Intravenous (IV)',
                frequency: 'Once Daily (QD)',
                duration: '5 days',
                line: 'First-line',
                source: 'Clinician-Decided',
                rationale: 'Atypical pathogen coverage (Mycoplasma, Legionella, Chlamydia pneumoniae)',
                isActive: true,
                history: []
            },
            {
                id: 'tx-parveen-3',
                drugName: 'Lactated Ringer’s Solution',
                dosage: '1000 mL',
                route: 'Intravenous (IV)',
                frequency: 'STAT / Once',
                duration: 'Immediate',
                line: 'Supportive',
                source: 'Clinician-Decided',
                rationale: 'Sepsis fluid resuscitation for relative hypotension',
                isActive: true,
                history: []
            }
        ],
        stepwisePlan: [
            {
                id: 'step-v-1',
                phase: 1,
                phaseTitle: 'Phase 1: Emergency Stabilization (0–15 min)',
                title: 'Oxygen Therapy with Controlled Venturi Mask',
                description: 'Apply 28% Venturi mask to maintain SpO2 88-92% without suppressing hypoxic respiratory drive in COPD.',
                priority: 'STAT / Critical',
                status: 'Completed'
            },
            {
                id: 'step-v-2',
                phase: 1,
                phaseTitle: 'Phase 1: Emergency Stabilization (0–15 min)',
                title: 'IV Sepsis Resuscitation & Dual Large-Bore Cannulation',
                description: 'Establish bilateral 18G IV access. Bolus 1,000 mL warm balanced crystalloid solution.',
                priority: 'STAT / Critical',
                status: 'In Progress'
            },
            {
                id: 'step-v-3',
                phase: 2,
                phaseTitle: 'Phase 2: Immediate Diagnostics (15–60 min)',
                title: 'Blood Cultures x 2 & Urinary S. pneumoniae Antigen',
                description: 'Obtain peripheral blood cultures before starting antimicrobial infusion.',
                priority: 'STAT / Critical',
                status: 'Completed'
            },
            {
                id: 'step-v-4',
                phase: 3,
                phaseTitle: 'Phase 3: Targeted Secondary Therapy (1–4 h)',
                title: 'Administer IV Ceftriaxone 2g + IV Azithromycin 500mg',
                description: 'Infuse guideline-directed dual antibiotic therapy within 60 minutes of sepsis identification.',
                priority: 'Urgent',
                status: 'In Progress'
            }
        ],
        labTracker: [
            {
                id: 'lab-v-1',
                testName: 'Venous Blood Gas & Lactate',
                category: 'Blood Gas & Acid-Base',
                status: 'Resulted',
                orderedAt: Date.now() - 3600000,
                resultValue: 'Lactate 2.8 mmol/L, pH 7.34',
                referenceRange: 'Lactate < 2.0 mmol/L',
                isCritical: true,
                notes: 'Tissue hypoperfusion indicating early septic response; requires fluid bolus and serial lactate re-test at 2h.'
            },
            {
                id: 'lab-v-2',
                testName: 'Complete Blood Count with Diff',
                category: 'Hematology',
                status: 'Resulted',
                orderedAt: Date.now() - 3600000,
                resultValue: 'WBC 18.6 x10^9/L (86% Neutrophils, 8% Bands)',
                referenceRange: '4.5 - 11.0 x10^9/L',
                isCritical: false,
                notes: 'Marked leukocytosis with left shift consistent with acute bacterial infection.'
            }
        ],
        progressNotes: [],
        vitalsHistory: [],
        aiRecommendations: [],
        medicalReports: [],
        sharedWith: []
    },
    {
        ownerId: 'demo-clinician',
        status: 'Active',
        tags: ['Neurology', 'Stroke STAT', 'FAST-Positive', 'ESI-1 Resuscitation'],
        patientData: {
            name: 'Muhammad Tariq',
            age: '71',
            sex: 'Male',
            primaryComplaint: 'Sudden onset right-sided weakness and inability to speak (45 min ago)',
            hopi: 'Patient was having breakfast at 08:15 AM when his spouse observed acute right facial droop, flaccid weakness of right arm and leg, and complete inability to produce coherent words. Last known well exactly at 08:10 AM (within 4.5-hour thrombolysis window). No prior seizures, head trauma, or anticoagulant overdose.',
            findings: 'Patient is alert but globally aphasic. Severe right upper motor neuron facial palsy. Right arm and leg motor strength 0/5. Left extremities 5/5. Right sensory deficit to pinprick. Eyes show forced leftward gaze preference. NIH Stroke Scale (NIHSS) calculated at 16.',
            vitals: { temp: '36.8', hr: '88', rr: '18', bp: '176/98', spo2: '97' },
            pmh: 'Non-valvular Atrial Fibrillation (non-compliant with Apixaban), Hypertension, Type 2 Diabetes',
            psh: 'None reported',
            socialHistory: 'Retired engineer, lives with spouse. Non-smoker.',
            allergies: 'No Known Drug Allergies (NKDA)',
            investigations: {
                'STAT Non-Contrast Head CT': 'No acute intracranial hemorrhage. Early ischemic hypodensity with loss of insular ribbon sign in left MCA territory. ASPECTS score 8/10.',
                'Blood Glucose (Point of Care)': '134 mg/dL (Hypoglycemia ruled out)',
                'Coagulation Screen': 'PT: 12.4s, INR: 1.1, aPTT: 28s'
            }
        },
        triage: {
            level: 1,
            acuityName: 'Resuscitation (Immediate)',
            colorCode: 'red',
            targetTimeMinutes: 0,
            avpu: 'Alert',
            painScore: 0,
            redFlags: [
                'Acute Ischemic Stroke within 4.5-hour intravenous thrombolysis window',
                'NIHSS 16 (Severe neurological deficit)',
                'Left Middle Cerebral Artery (MCA) syndrome with global aphasia and hemiplegia'
            ],
            vitalTriggers: [
                'Hypertension (176/98 mmHg, within allowable threshold < 185/110 for thrombolysis)'
            ],
            recommendedResources: [
                'Code Stroke Team Activation',
                'STAT Non-Contrast Head CT + CT Angiography of Head and Neck',
                'Point-of-care Blood Glucose and INR',
                'Intravenous Thrombolysis (Tenecteplase or Alteplase) Evaluation',
                'Neuro-Interventional Endovascular Thrombectomy (EVT) Consult'
            ],
            immediateActions: [
                'Maintain patient NPO immediately (aspiration precaution)',
                'Wheel directly to CT scanner table for non-contrast brain CT',
                'Ensure SBP stays strictly below 185 mmHg and DBP below 110 mmHg',
                'Weigh patient accurately on stroke scale for weight-based dosing'
            ],
            clinicalRationale: 'Acute Ischemic Stroke presenting at 45 minutes from symptom onset. Every minute of delay loses 1.9 million neurons. Door-to-needle goal < 30 minutes.',
            lastAssessed: Date.now() - 1800000,
            assessedBy: 'Dr. Tariq Mehmood, FCPS (Stroke Neurologist)'
        },
        provisionalDiagnoses: [
            {
                diagnosisName: 'Acute Ischemic Stroke (Left MCA Territory, Cardioembolic)',
                icdCode: 'ICD-11: 8B11.0 | ICD-10: I63.4',
                probability: 95,
                supportingEvidence: [
                    'Hyperacute onset right hemiplegia, right facial droop, and global aphasia (NIHSS 16)',
                    'Non-contrast CT confirms absence of hemorrhage with early ischemic sign (ASPECTS 8)',
                    'Known Atrial Fibrillation with subtherapeutic anticoagulation',
                    'Within 4.5-hour thrombolytic window (onset 45 minutes ago)'
                ],
                contradictingEvidence: [],
                recommendedTests: [
                    'CT Angiography of head and neck for Large Vessel Occlusion (LVO)',
                    'Echocardiogram and Holter telemetry post-stabilization'
                ],
                treatmentSuggestions: {
                    firstLine: ['IV Tenecteplase 0.25 mg/kg bolus STAT', 'Endovascular thrombectomy evaluation'],
                    secondLine: ['Dual antiplatelet therapy after 24h follow-up CT'],
                    lifestyle: ['Post-stroke multidisciplinary neurological rehabilitation']
                },
                morbidity: 'Severe permanent deficit without revascularization',
                mortality: '10-15%'
            }
        ],
        finalDiagnosis: null,
        treatments: [
            {
                id: 'tx-tariq-1',
                drugName: 'Tenecteplase (TNK-tPA)',
                dosage: '0.25 mg/kg (Max 25 mg)',
                route: 'Intravenous (IV)',
                frequency: 'STAT / Once',
                duration: 'Single STAT bolus',
                line: 'First-line',
                source: 'Clinician-Decided',
                rationale: 'Intravenous thrombolysis for acute ischemic stroke within 4.5h window',
                isActive: true,
                history: []
            },
            {
                id: 'tx-tariq-2',
                drugName: 'Labetalol',
                dosage: '10-20 mg',
                route: 'Intravenous (IV)',
                frequency: 'PRN (As Needed)',
                duration: 'PRN for SBP > 180',
                line: 'Supportive',
                source: 'Clinician-Decided',
                rationale: 'Strict blood pressure control post-thrombolytic therapy',
                isActive: true,
                history: []
            }
        ],
        stepwisePlan: [
            {
                id: 'step-k-1',
                phase: 1,
                phaseTitle: 'Phase 1: Emergency Stabilization (0–15 min)',
                title: 'Code Stroke Activation & Rapid Head CT Scan',
                description: 'Immediate non-contrast head CT to rule out intracranial hemorrhage. Calculate ASPECTS score.',
                priority: 'STAT / Critical',
                status: 'Completed'
            },
            {
                id: 'step-k-2',
                phase: 1,
                phaseTitle: 'Phase 1: Emergency Stabilization (0–15 min)',
                title: 'Weight-Based IV Tenecteplase Administration',
                description: 'Confirm inclusion/exclusion checklist. Infuse IV Tenecteplase 0.25 mg/kg bolus.',
                priority: 'STAT / Critical',
                status: 'In Progress'
            },
            {
                id: 'step-k-3',
                phase: 2,
                phaseTitle: 'Phase 2: Immediate Diagnostics (15–60 min)',
                title: 'CT Angiography & Endovascular Thrombectomy Transfer',
                description: 'Screen for M1 segment MCA occlusion for prospective mechanical thrombectomy up to 24h window.',
                priority: 'Urgent',
                status: 'Pending'
            }
        ],
        labTracker: [
            {
                id: 'lab-k-1',
                testName: 'Non-Contrast Brain CT',
                category: 'Imaging & ECG',
                status: 'Resulted',
                orderedAt: Date.now() - 1800000,
                resultValue: 'ASPECTS 8, No Intracranial Hemorrhage',
                referenceRange: 'Normal',
                isCritical: false,
                notes: 'Clears patient for intravenous thrombolysis and mechanical thrombectomy.'
            }
        ],
        progressNotes: [],
        vitalsHistory: [],
        aiRecommendations: [],
        medicalReports: [],
        sharedWith: []
    },
    {
        ownerId: 'demo-clinician',
        status: 'Active',
        tags: ['Psychiatry', 'DSM-5', 'ICD-11', 'Panic Disorder', 'ESI-3 Urgent'],
        patientData: {
            name: 'Ayesha Siddiqa',
            age: '32',
            sex: 'Female',
            primaryComplaint: 'Severe heart pounding, shortness of breath, trembling, and intense fear of dying',
            hopi: 'Patient was driving to work when she experienced sudden onset intense palpitations, chest tightness, dizziness, profuse sweating, and overwhelming terror that she was suffering a fatal heart attack or losing her mind. Episode peaked within 10 minutes. This is her fourth similar emergency department visit this month. Reports 3 months of persistent anticipatory anxiety, agoraphobic avoidance of highways, and progressive insomnia.',
            findings: 'Patient is visibly trembling, tearful, hyperventilating. Heart rate is rapid but rhythm is regular. S1/S2 normal, no murmurs. Lungs clear throughout. Abdomen soft, non-tender. Cranial nerves intact. Deep tendon reflexes brisk symmetrically. Thyroid is non-enlarged and non-tender.',
            vitals: { temp: '36.8', hr: '108', rr: '22', bp: '136/86', spo2: '99' },
            pmh: 'Generalized Anxiety, Mild episodic migraine',
            psh: 'None',
            socialHistory: 'Graphic designer. High caffeine intake (4-5 espresso shots daily). Non-smoker, occasional wine.',
            allergies: 'NKDA',
            investigations: {
                '12-Lead ECG': 'Sinus tachycardia at 108 bpm. Normal PR and QTc intervals. No ischemic ST-T changes.',
                'Cardiac Troponin I': '< 1.5 ng/L (Normal / Negative for myocardial necrosis)',
                'Serum TSH': '1.85 mIU/L (Euthyroid, excludes thyrotoxicosis)',
                'Electrolytes & Calcium': 'Sodium 140, Potassium 4.1, Ionized Calcium normal. Mild respiratory alkalosis on capillary blood gas.'
            }
        },
        triage: {
            level: 3,
            acuityName: 'Urgent (2+ Resources)',
            colorCode: 'yellow',
            targetTimeMinutes: 30,
            avpu: 'Alert',
            painScore: 3,
            redFlags: [
                'Severe acute panic state with prominent autonomic hyperarousal',
                'Frequent recurrent emergency presentations (4 visits in 30 days)',
                'Significant functional impairment and agoraphobic avoidance behavior'
            ],
            vitalTriggers: [
                'Tachycardia (108 bpm)',
                'Tachypnea (22 br/m)'
            ],
            recommendedResources: [
                '12-Lead ECG to rule out supraventricular tachycardia / arrhythmia',
                'Serum TSH and hs-Troponin to rule out endocrine and ischemic drivers',
                'Calm environment and reassurance',
                'Structured DSM-5 & ICD-11 psychiatric evaluation'
            ],
            immediateActions: [
                'Place patient in quiet, low-stimulus triage cubicle',
                'Perform 4-7-8 guided paced diaphragmatic breathing to counter hyperventilation hypocapnia',
                'Confirm normal ECG and troponin results with patient for direct somatic reassurance'
            ],
            clinicalRationale: 'Panic Disorder with Agoraphobia (DSM-5 300.01 / ICD-11 6B01). Acute panic episode mimicking myocardial ischemia, ruled out with normal ECG and cardiac enzymes. ESI Level 3 Urgent.',
            lastAssessed: Date.now() - 7200000,
            assessedBy: 'Dr. Sadia Rehman, FCPS (Consultant Psychiatrist)'
        },
        provisionalDiagnoses: [
            {
                diagnosisName: 'Panic Disorder with Agoraphobia (DSM-5 & ICD-11)',
                icdCode: 'ICD-11: 6B01 | DSM-5: 300.01 | ICD-10: F41.0',
                probability: 92,
                supportingEvidence: [
                    'Recurrent unexpected panic attacks peaking within 10 minutes with autonomic symptoms (palpitations, trembling, feeling of choking, derealization, fear of dying)',
                    'Over 1 month of persistent worry about subsequent attacks and maladaptive avoidance of highways',
                    'Normal 12-lead ECG, normal cardiac troponin, and euthyroid state ruling out organic cardiovascular/endocrine causes',
                    'Exacerbation linked to excessive caffeine consumption and occupational stress'
                ],
                contradictingEvidence: [
                    'Must ensure toxicology screen confirms absence of amphetamines or sympathomimetics'
                ],
                recommendedTests: [
                    'Urine drug screen',
                    'PHQ-9 and GAD-7 standardized psychological scales'
                ],
                treatmentSuggestions: {
                    firstLine: ['Sertraline 25mg daily titrating to 50mg', 'Cognitive Behavioral Therapy'],
                    secondLine: ['Escitalopram or Venlafaxine XR'],
                    lifestyle: ['Eliminate dietary caffeine', 'Diaphragmatic paced breathing exercises']
                },
                morbidity: 'High functional impairment',
                mortality: 'Negligible organic mortality'
            },
            {
                diagnosisName: 'Paroxysmal Supraventricular Tachycardia (PSVT) - Ruled Out',
                icdCode: 'ICD-11: BC71.0 | ICD-10: I47.1',
                probability: 12,
                supportingEvidence: [
                    'Sudden onset palpitations'
                ],
                contradictingEvidence: [
                    'ECG demonstrates gradual sinus tachycardia with visible P waves, not sudden paroxysmal re-entrant tachycardia'
                ],
                recommendedTests: [
                    'Ambulatory 48-hour Holter monitor if episodes persist post-caffeine cessation'
                ],
                treatmentSuggestions: {
                    firstLine: ['Vagal maneuvers if PSVT confirmed on telemetry'],
                    secondLine: ['Adenosine IV'],
                    lifestyle: ['Avoid stimulant triggers']
                },
                morbidity: 'Low',
                mortality: 'Very low'
            }
        ],
        finalDiagnosis: null,
        treatments: [
            {
                id: 'tx-ayesha-1',
                drugName: 'Sertraline (Zoloft)',
                dosage: '25 mg (titrating to 50 mg after 7 days)',
                route: 'Oral (PO)',
                frequency: 'Once Daily (QD)',
                duration: 'Ongoing',
                line: 'First-line',
                source: 'Clinician-Decided',
                rationale: 'First-line SSRI maintenance therapy for DSM-5 Panic Disorder',
                isActive: true,
                history: []
            },
            {
                id: 'tx-ayesha-2',
                drugName: 'Propranolol',
                dosage: '10-20 mg',
                route: 'Oral (PO)',
                frequency: 'PRN (As Needed)',
                duration: 'PRN',
                line: 'Supportive',
                source: 'Clinician-Decided',
                rationale: 'Peripheral beta-blockade for somatic hyperarousal symptoms',
                isActive: true,
                history: []
            }
        ],
        stepwisePlan: [
            {
                id: 'step-j-1',
                phase: 1,
                phaseTitle: 'Phase 1: Emergency Stabilization (0–15 min)',
                title: 'De-escalation & Paced Diaphragmatic Breathing',
                description: 'Guide 4-second inhale, 7-second hold, 8-second exhale cycle to normalize end-tidal pCO2 and reverse carpopedal spasms.',
                priority: 'Urgent',
                status: 'Completed',
                completedBy: 'Triage Nurse',
                clinicalNotes: 'Psychological Stabilization'
            },
            {
                id: 'step-j-2',
                phase: 2,
                phaseTitle: 'Phase 2: Immediate Diagnostics (15–60 min)',
                title: 'Review Organic Exclusion Lab Results with Patient',
                description: 'Provide clear, empathetic somatic validation that cardiac biomarkers and ECG are completely healthy.',
                priority: 'Urgent',
                status: 'Completed',
                completedBy: 'Physician',
                clinicalNotes: 'Clinical Counseling'
            },
            {
                id: 'step-j-3',
                phase: 3,
                phaseTitle: 'Phase 3: Targeted Secondary Therapy (1–4 h)',
                title: 'Initiate First-Line SSRI & CBT Referral',
                description: 'Prescribe low-dose Sertraline 25mg with warning of transient jitteriness; schedule outpatient Cognitive Behavioral Therapy.',
                priority: 'Standard',
                status: 'In Progress',
                completedBy: 'Psychiatrist',
                clinicalNotes: 'Outpatient Bridge'
            }
        ],
        labTracker: [
            {
                id: 'lab-j-1',
                testName: 'High-Sensitivity Troponin I',
                category: 'Biomarkers',
                status: 'Resulted',
                orderedAt: Date.now() - 7200000,
                resultValue: '< 1.5 ng/L',
                referenceRange: '< 14 ng/L',
                isCritical: false,
                notes: 'Rules out acute myocardial injury; provides patient reassurance.'
            }
        ],
        progressNotes: [],
        vitalsHistory: [],
        aiRecommendations: [],
        medicalReports: [],
        sharedWith: []
    },
    {
        ownerId: 'demo-clinician',
        status: 'Active',
        tags: ['Gastroenterology', 'General Surgery', 'Acute Abdomen', 'ESI-3 Urgent'],
        patientData: {
            name: 'Hamza Farooq',
            age: '24',
            sex: 'Male',
            primaryComplaint: 'Severe right lower quadrant abdominal pain, nausea, and low-grade fever',
            hopi: 'Patient awoke 16 hours ago with dull, poorly localized periumbilical ache and anorexia. Over the last 6 hours, pain has intensified and localized sharply to the right lower quadrant. Worsened by coughing, walking, and vehicular bumps on the way to hospital. Two episodes of non-bilious emesis. Last bowel movement 24 hours ago.',
            findings: 'Patient lies still with right hip flexed. Point tenderness with voluntary guarding at McBurney’s point (1/3 distance from ASIS to umbilicus). Rovsing’s sign positive (RLQ pain on LLQ palpation). Psoas sign positive on right hip extension. Dunphy sign positive (pain on coughing). Normal bowel sounds.',
            vitals: { temp: '38.1', hr: '98', rr: '18', bp: '124/78', spo2: '99' },
            pmh: 'No chronic medical illnesses',
            psh: 'None',
            socialHistory: 'University student, non-smoker, exercises regularly.',
            allergies: 'NKDA',
            investigations: {
                'Abdominal Ultrasound': 'Non-compressible blind-ending tubular structure in the right lower quadrant measuring 8.2 mm in outer diameter with mural hypervascularity and periappendiceal fat stranding. Appendicolith visualized at base. No free fluid perforation.',
                'CBC with Differential': 'WBC: 14.8 x10^9/L (82% neutrophils), Hemoglobin: 15.1 g/dL, Platelets: 260 x10^9/L',
                'Urinalysis': 'Specific gravity 1.025, Ketones 1+, Nitrites negative, Leukocyte esterase negative'
            }
        },
        triage: {
            level: 3,
            acuityName: 'Urgent (2+ Resources)',
            colorCode: 'yellow',
            targetTimeMinutes: 30,
            avpu: 'Alert',
            painScore: 8,
            redFlags: [
                'Acute peritonism and localized right lower quadrant peritoneal irritation signs',
                'Alvarado score 8/10 (High probability acute appendicitis)',
                'Leukocytosis with neutrophilia and ultrasound-confirmed non-compressible appendix'
            ],
            vitalTriggers: [
                'Low-grade fever (38.1°C)',
                'Borderline tachycardia (98 bpm)'
            ],
            recommendedResources: [
                'Point-of-care or formal Abdominal Ultrasound / CT Abdomen',
                'Urgent General Surgery Consultation',
                'IV Access & Crystalloid Hydration',
                'Pre-operative IV Antibiotics and Analgesia'
            ],
            immediateActions: [
                'Keep strictly NPO (nothing by mouth) for upcoming operative intervention',
                'Establish 18G IV access and infuse 1,000 mL Plasmalyte',
                'Administer multimodal IV analgesia (Acetaminophen 1g + Fentanyl 50 mcg PRN)',
                'Request urgent General Surgery consult for laparoscopic appendectomy'
            ],
            clinicalRationale: 'Acute appendicitis with localized peritoneal signs (Alvarado score 8). Requires prompt surgical intervention before perforation. ESI Level 3 Urgent.',
            lastAssessed: Date.now() - 5400000,
            assessedBy: 'Dr. Kamran Siddiqui, FCPS (General & Emergency Surgery)'
        },
        provisionalDiagnoses: [
            {
                diagnosisName: 'Acute Appendicitis with Localized Peritonitis',
                icdCode: 'ICD-11: DB10.0 | ICD-10: K35.80',
                probability: 94,
                supportingEvidence: [
                    'Migratory pain starting periumbilical and localizing to McBurney point',
                    'Classic peritoneal signs: Rovsing positive, Psoas positive, localized guarding',
                    'Ultrasound reveals non-compressible appendix measuring 8.2 mm with target sign and appendicolith',
                    'Leukocytosis of 14.8 x10^9/L and low-grade pyrexia (38.1°C)'
                ],
                contradictingEvidence: [
                    'Absence of generalized rigidity or free air (perforation not yet occurred)'
                ],
                recommendedTests: [
                    'Pre-op crossmatch and coagulation screen',
                    'Contrast CT only if ultrasound had been equivocal'
                ],
                treatmentSuggestions: {
                    firstLine: ['Laparoscopic Appendectomy', 'Pre-operative IV Cefoxitin 2g'],
                    secondLine: ['Open Appendectomy if severe adhesions'],
                    lifestyle: ['Post-operative early ambulation']
                },
                morbidity: 'Low with timely appendectomy',
                mortality: '< 0.1% for non-perforated'
            }
        ],
        finalDiagnosis: null,
        treatments: [
            {
                id: 'tx-hamza-1',
                drugName: 'Cefoxitin',
                dosage: '2 g',
                route: 'Intravenous (IV)',
                frequency: 'STAT / Once',
                duration: 'Single pre-op dose',
                line: 'First-line',
                source: 'Clinician-Decided',
                rationale: 'Prophylactic coverage for enteric gram-negative and anaerobic flora prior to appendectomy',
                isActive: true,
                history: []
            },
            {
                id: 'tx-hamza-2',
                drugName: 'Paracetamol (Acetaminophen)',
                dosage: '1000 mg',
                route: 'Intravenous (IV)',
                frequency: 'PRN (As Needed)',
                duration: '48h',
                line: 'Supportive',
                source: 'Clinician-Decided',
                rationale: 'First-line non-opioid analgesia',
                isActive: true,
                history: []
            }
        ],
        stepwisePlan: [
            {
                id: 'step-c-1',
                phase: 1,
                phaseTitle: 'Phase 1: Emergency Stabilization (0–15 min)',
                title: 'NPO Status & Intravenous Crystalloid Hydration',
                description: 'Place patient on strict NPO. Start IV fluid maintenance with Plasmalyte at 125 mL/hr.',
                priority: 'STAT / Critical',
                status: 'Completed',
                completedBy: 'Staff Nurse',
                clinicalNotes: 'Pre-operative Preparation'
            },
            {
                id: 'step-c-2',
                phase: 2,
                phaseTitle: 'Phase 2: Immediate Diagnostics (15–60 min)',
                title: 'Confirm Ultrasound & Alvarado Score Calculation',
                description: 'Review right lower quadrant ultrasound images with on-call surgical registrar.',
                priority: 'Urgent',
                status: 'Completed',
                completedBy: 'Surgical Team',
                clinicalNotes: 'Surgical Workup'
            },
            {
                id: 'step-c-3',
                phase: 3,
                phaseTitle: 'Phase 3: Targeted Secondary Therapy (1–4 h)',
                title: 'Laparoscopic Appendectomy Booking & Pre-Op Antibiotics',
                description: 'Obtain informed surgical consent. Administer IV Cefoxitin 2g 30 minutes prior to surgical incision.',
                priority: 'Urgent',
                status: 'In Progress',
                completedBy: 'OR Coordinator',
                clinicalNotes: 'Definitive Surgical Care'
            }
        ],
        labTracker: [
            {
                id: 'lab-c-1',
                testName: 'Right Lower Quadrant Ultrasound',
                category: 'Imaging & ECG',
                status: 'Resulted',
                orderedAt: Date.now() - 5400000,
                resultValue: 'Appendix 8.2 mm, non-compressible, periappendiceal stranding',
                referenceRange: '< 6.0 mm compressible',
                isCritical: false,
                notes: 'Confirms acute non-perforated appendicitis; surgical indication confirmed.'
            }
        ],
        progressNotes: [],
        vitalsHistory: [],
        aiRecommendations: [],
        medicalReports: [],
        sharedWith: []
    }
];

export const PAKISTANI_FEMALE_NAMES = [
    'Parveen Akhtar',
    'Ayesha Siddiqa',
    'Bilqis Bano',
    'Fatima Zahra',
    'Zainab Bibi',
    'Sana Malik',
    'Farhat Sultana',
    'Nasreen Begum',
    'Rabia Basri',
    'Samina Kausar',
    'Tahira Yasmin',
    'Bushra Ansari',
    'Khadija Noor',
    'Sadia Batool',
    'Zubaida Khatoon'
];

export const PAKISTANI_MALE_NAMES = [
    'Muhammad Tariq',
    'Hamza Farooq',
    'Abdul Rehman',
    'Ghulam Rasool',
    'Bashir Ahmed',
    'Bilal Khan',
    'Usama Sheikh',
    'Zeeshan Ali',
    'Kamran Ashraf',
    'Nadeem Akhtar',
    'Farhan Qureshi',
    'Asadullah Butt',
    'Rizwan Haider',
    'Waqas Munir',
    'Shahid Afridi'
];

export function getRandomSampleCase(): Omit<Encounter, 'id' | 'timestamp'> {
    const randomIndex = Math.floor(Math.random() * RANDOM_SAMPLE_CASES.length);
    const caseClone: Omit<Encounter, 'id' | 'timestamp'> = JSON.parse(JSON.stringify(RANDOM_SAMPLE_CASES[randomIndex]));

    // Assign an authentic Pakistani name matching patient's gender
    const isFemale = caseClone.patientData.sex === 'Female';
    const pool = isFemale ? PAKISTANI_FEMALE_NAMES : PAKISTANI_MALE_NAMES;
    const randomName = pool[Math.floor(Math.random() * pool.length)];
    caseClone.patientData.name = randomName;

    return caseClone;
}
