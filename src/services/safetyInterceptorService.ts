import { PatientData, Treatment, DDIAlert, AllergyAlert } from '../types';

interface DDIRule {
    drugA: RegExp;
    drugB: RegExp;
    severity: DDIAlert['severity'];
    mechanism: string;
    clinicalImpact: string;
    recommendation: string;
    evidenceClass: string;
}

const DDI_RULES: DDIRule[] = [
    {
        drugA: /nitroglycerin|nitro|isorbide|mononitrate/i,
        drugB: /sildenafil|viagra|tadalafil|cialis|vardenafil/i,
        severity: 'Contraindicated',
        mechanism: "Synergistic cGMP accumulation causing extreme systemic vasodilation.",
        clinicalImpact: "Profound, refractory, life-threatening hypotension and cardiovascular collapse.",
        recommendation: "ABSOLUTELY CONTRAINDICATED. Withhold nitrates for at least 24h after sildenafil or 48h after tadalafil.",
        evidenceClass: "ACC/AHA Class III: Harm (Level A)"
    },
    {
        drugA: /clopidogrel|plavix/i,
        drugB: /omeprazole|prilosec|esomeprazole|nexium/i,
        severity: 'Major Warning',
        mechanism: "CYP2C19 competitive inhibition prevents biotransformation of clopidogrel to its active thiol metabolite.",
        clinicalImpact: "Significantly reduced platelet inhibition leading to increased risk of recurrent stent thrombosis and MI.",
        recommendation: "Switch gastric protection to Pantoprazole or Famotidine (H2-blocker) which does not inhibit CYP2C19.",
        evidenceClass: "FDA Drug Safety Communication / ESC Guidelines (Class I, Level B)"
    },
    {
        drugA: /aspirin|asa|ticagrelor|clopidogrel|prasugrel/i,
        drugB: /ibuprofen|naproxen|ketorolac|meloxicam|diclofenac|indomethacin/i,
        severity: 'Major Warning',
        mechanism: "Competitive COX-1 binding and additive inhibition of platelet aggregation and gastric mucosal protection.",
        clinicalImpact: "Substantially escalated risk of severe gastrointestinal hemorrhage and loss of Aspirin cardioprotection.",
        recommendation: "Avoid systemic non-selective NSAIDs in acute coronary syndromes. Utilize Acetaminophen/Paracetamol or opioids for acute pain.",
        evidenceClass: "AHA/ACC Secondary Prevention Guidelines (Class III: Harm)"
    },
    {
        drugA: /enoxaparin|heparin|warfarin|apixaban|rivaroxaban|dabigatran/i,
        drugB: /ibuprofen|ketorolac|naproxen|diclofenac/i,
        severity: 'Major Warning',
        mechanism: "Combined suppression of coagulation cascade and platelet thromboxane production.",
        clinicalImpact: "High risk of major systemic and gastrointestinal bleeding.",
        recommendation: "Co-administration with systemic NSAIDs is generally contraindicated during therapeutic anticoagulation.",
        evidenceClass: "Chest AT9 Antithrombotic Guidelines"
    },
    {
        drugA: /ramipril|lisinopril|enalapril|captopril|losartan|valsartan/i,
        drugB: /spironolactone|eplerenone|potassium chloride|k-dur/i,
        severity: 'Moderate',
        mechanism: "Combined reduction of aldosterone-mediated renal potassium excretion.",
        clinicalImpact: "Risk of life-threatening hyperkalemia (K+ > 5.5 - 6.0 mEq/L) and cardiac conduction arrest.",
        recommendation: "Monitor serum potassium and creatinine within 3-7 days of starting combination. Advise low-potassium diet.",
        evidenceClass: "2022 AHA/ACC/HFSA Heart Failure Guidelines"
    },
    {
        drugA: /azithromycin|clarithromycin|ciprofloxacin|levofloxacin|moxifloxacin/i,
        drugB: /amiodarone|sotalol|haloperidol|ondansetron/i,
        severity: 'Major Warning',
        mechanism: "Additive prolongation of the ventricular myocardial repolarization (QTc interval).",
        clinicalImpact: "Precipitation of polymorphic ventricular tachycardia (Torsades de Pointes) and sudden cardiac death.",
        recommendation: "Obtain baseline 12-lead ECG to measure QTc interval. Avoid combo if baseline QTc > 480 ms or correct hypokalemia/hypomagnesemia.",
        evidenceClass: "AHA/ACC Scientific Statement on Drug-Induced QTc Prolongation"
    }
];

const ALLERGY_RULES: { allergyPattern: RegExp; drugPattern: RegExp; crossReactive: boolean; description: string }[] = [
    {
        allergyPattern: /penicillin|pcn|amoxicillin|ampicillin/i,
        drugPattern: /penicillin|amoxicillin|ampicillin|augmentin|piperacillin|zosyn|unasyn/i,
        crossReactive: false,
        description: "Direct beta-lactam penicillin class allergy trigger. High risk of immediate hypersensitivity / anaphylaxis."
    },
    {
        allergyPattern: /penicillin|pcn/i,
        drugPattern: /cefazolin|cephalexin|ceftriaxone|cefepime|cefotaxime/i,
        crossReactive: true,
        description: "Potential beta-lactam cephalosporin cross-reactivity (~1-3% with modern 3rd/4th generation cephalosporins)."
    },
    {
        allergyPattern: /sulfa|sulfonamide/i,
        drugPattern: /bactrim|trimethoprim-sulfamethoxazole|sulfadiazine|sulfasalazine/i,
        crossReactive: false,
        description: "Direct antimicrobial sulfonamide allergy trigger (Stevens-Johnson syndrome or urticaria risk)."
    },
    {
        allergyPattern: /aspirin|asa|nsaid/i,
        drugPattern: /aspirin|ibuprofen|ketorolac|naproxen|diclofenac/i,
        crossReactive: false,
        description: "Aspirin-exacerbated respiratory disease (AERD) or severe hypersensitivity reaction."
    }
];

export function checkAllergiesAndInteractions(
    patientData: PatientData,
    treatments: Treatment[]
): {
    ddiAlerts: DDIAlert[];
    allergyAlerts: AllergyAlert[];
    hasCriticalAlert: boolean;
} {
    const activeTreatments = treatments.filter(t => t.isActive || t.status === 'Active' || t.status === 'Titrating');
    const allergiesText = (patientData.allergies || "").toLowerCase();

    const ddiAlerts: DDIAlert[] = [];
    const allergyAlerts: AllergyAlert[] = [];

    // 1. Check Allergies
    if (allergiesText && !allergiesText.includes("nkda") && !allergiesText.includes("none")) {
        for (const tx of activeTreatments) {
            for (const rule of ALLERGY_RULES) {
                if (rule.allergyPattern.test(allergiesText) && rule.drugPattern.test(tx.drugName)) {
                    allergyAlerts.push({
                        id: `allergy-${tx.id}-${Date.now()}`,
                        drugName: tx.drugName,
                        matchedAllergy: patientData.allergies,
                        reactionRisk: rule.description,
                        crossReactivityRisk: rule.crossReactive ? "Cross-reactivity warning (monitor or choose alternative)" : undefined,
                        recommendation: rule.crossReactive 
                            ? "Use caution; consider alternative antimicrobial class (e.g. Aztreonam, Fluoroquinolone, Macrolide, Vancomycin) or perform graded challenge."
                            : "IMMEDIATELY WITHHOLD THIS MEDICATION. Select an alternative therapeutic class without beta-lactam / allergen overlap."
                    });
                }
            }
        }
    }

    // 2. Check Drug-Drug Interactions (Pairwise)
    for (let i = 0; i < activeTreatments.length; i++) {
        for (let j = i + 1; j < activeTreatments.length; j++) {
            const txA = activeTreatments[i];
            const txB = activeTreatments[j];

            for (const rule of DDI_RULES) {
                const matchesAB = rule.drugA.test(txA.drugName) && rule.drugB.test(txB.drugName);
                const matchesBA = rule.drugA.test(txB.drugName) && rule.drugB.test(txA.drugName);

                if (matchesAB || matchesBA) {
                    ddiAlerts.push({
                        id: `ddi-${txA.id}-${txB.id}-${Date.now()}`,
                        severity: rule.severity,
                        interactingDrugs: [txA.drugName, txB.drugName],
                        mechanism: rule.mechanism,
                        clinicalImpact: rule.clinicalImpact,
                        recommendation: rule.recommendation,
                        evidenceClass: rule.evidenceClass
                    });
                }
            }
        }
    }

    const hasCriticalAlert = allergyAlerts.length > 0 || ddiAlerts.some(d => d.severity === 'Contraindicated' || d.severity === 'Major Warning');

    return {
        ddiAlerts,
        allergyAlerts,
        hasCriticalAlert
    };
}
