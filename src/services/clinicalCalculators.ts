import { Vitals, ClinicalRiskScore, NEWS2Assessment } from '../types';

// ==========================================
// 1. NATIONAL EARLY WARNING SCORE 2 (NEWS2)
// Official Royal College of Physicians & NHS Standard
// ==========================================

export function calculateNEWS2(
    vitals: Vitals,
    supplementalO2 = false,
    consciousness: 'Alert' | 'Verbal' | 'Pain' | 'Unresponsive' = 'Alert'
): NEWS2Assessment {
    const rr = parseFloat(vitals.rr || '16');
    const spo2 = parseFloat(vitals.spo2 || '98');
    const sbp = parseFloat(vitals.bp?.split('/')[0] || '120');
    const hr = parseFloat(vitals.hr || '75');
    const temp = parseFloat(vitals.temp || '37.0');

    let rrScore = 0;
    if (rr <= 8) rrScore = 3;
    else if (rr >= 9 && rr <= 11) rrScore = 1;
    else if (rr >= 12 && rr <= 20) rrScore = 0;
    else if (rr >= 21 && rr <= 24) rrScore = 2;
    else if (rr >= 25) rrScore = 3;

    let spo2Score = 0;
    if (spo2 <= 91) spo2Score = 3;
    else if (spo2 >= 92 && spo2 <= 93) spo2Score = 2;
    else if (spo2 >= 94 && spo2 <= 95) spo2Score = 1;
    else if (spo2 >= 96) spo2Score = 0;

    const o2Score = supplementalO2 ? 2 : 0;

    let sbpScore = 0;
    if (sbp <= 90) sbpScore = 3;
    else if (sbp >= 91 && sbp <= 100) sbpScore = 2;
    else if (sbp >= 101 && sbp <= 110) sbpScore = 1;
    else if (sbp >= 111 && sbp <= 219) sbpScore = 0;
    else if (sbp >= 220) sbpScore = 3;

    let hrScore = 0;
    if (hr <= 40) hrScore = 3;
    else if (hr >= 41 && hr <= 50) hrScore = 1;
    else if (hr >= 51 && hr <= 90) hrScore = 0;
    else if (hr >= 91 && hr <= 110) hrScore = 1;
    else if (hr >= 111 && hr <= 130) hrScore = 2;
    else if (hr >= 131) hrScore = 3;

    const cvpuScore = consciousness === 'Alert' ? 0 : 3;

    let tempScore = 0;
    if (temp <= 35.0) tempScore = 3;
    else if (temp >= 35.1 && temp <= 36.0) tempScore = 1;
    else if (temp >= 36.1 && temp <= 38.0) tempScore = 0;
    else if (temp >= 38.1 && temp <= 39.0) tempScore = 1;
    else if (temp >= 39.1) tempScore = 2;

    const totalScore = rrScore + spo2Score + o2Score + sbpScore + hrScore + cvpuScore + tempScore;
    const hasSingleScore3 = [rrScore, spo2Score, sbpScore, hrScore, cvpuScore, tempScore].some(s => s >= 3);

    let riskLevel: NEWS2Assessment['riskLevel'] = 'Low (0-4)';
    let colorCode: NEWS2Assessment['colorCode'] = 'green';
    let monitoringFrequency = 'Ward routine (minimum every 12 hours)';
    let clinicalResponse = 'Continue routine clinical monitoring with standard registered nurse observation.';

    if (totalScore >= 7) {
        riskLevel = 'High (7+)';
        colorCode = 'red';
        monitoringFrequency = 'Continuous monitoring of vital signs';
        clinicalResponse = 'CRITICAL ALERT: Emergency Medical Team (MET) / Intensive Care Specialist review STAT. Transfer to Level 2/3 High-Dependency Unit or ICU.';
    } else if (totalScore >= 5 || hasSingleScore3) {
        riskLevel = 'Medium (5-6 or 3 in single parameter)';
        colorCode = 'amber';
        monitoringFrequency = 'At least every 1 hour';
        clinicalResponse = 'URGENT REVIEW: Urgent bedside assessment by treating clinical team within 30 minutes. Consider escalation of therapeutic care.';
    }

    return {
        totalScore,
        riskLevel,
        colorCode,
        monitoringFrequency,
        clinicalResponse,
        parameterScores: {
            respiratoryRate: { value: `${rr} /min`, score: rrScore },
            oxygenSaturation: { value: `${spo2}%`, score: spo2Score },
            supplementalOxygen: { value: supplementalO2, score: o2Score },
            systolicBP: { value: `${sbp} mmHg`, score: sbpScore },
            pulseRate: { value: `${hr} bpm`, score: hrScore },
            consciousness: { value: consciousness, score: cvpuScore },
            temperature: { value: `${temp}°C`, score: tempScore }
        },
        calculatedAt: Date.now()
    };
}

// ==========================================
// 2. WELLS SCORE FOR PULMONARY EMBOLISM (PE)
// ==========================================

export function calculateWellsPE(checks: {
    clinicalSignsDVT: boolean; // +3.0
    peMostLikely: boolean;     // +3.0
    heartRateOver100: boolean; // +1.5
    recentSurgeryOrBedridden: boolean; // +1.5
    previousDVT_PE: boolean;   // +1.5
    hemoptysis: boolean;       // +1.0
    malignancyActive: boolean; // +1.0
}): ClinicalRiskScore {
    const criteria: { label: string; points: number }[] = [];
    let score = 0;

    if (checks.clinicalSignsDVT) { criteria.push({ label: "Clinical signs/symptoms of DVT", points: 3.0 }); score += 3.0; }
    if (checks.peMostLikely) { criteria.push({ label: "PE is #1 diagnosis or equally likely", points: 3.0 }); score += 3.0; }
    if (checks.heartRateOver100) { criteria.push({ label: "Heart Rate > 100 bpm", points: 1.5 }); score += 1.5; }
    if (checks.recentSurgeryOrBedridden) { criteria.push({ label: "Immobilization (>= 3 days) or surgery in last 4 weeks", points: 1.5 }); score += 1.5; }
    if (checks.previousDVT_PE) { criteria.push({ label: "Previous confirmed DVT or PE", points: 1.5 }); score += 1.5; }
    if (checks.hemoptysis) { criteria.push({ label: "Hemoptysis", points: 1.0 }); score += 1.0; }
    if (checks.malignancyActive) { criteria.push({ label: "Malignancy (treated within last 6 months)", points: 1.0 }); score += 1.0; }

    let riskCategory: ClinicalRiskScore['riskCategory'] = 'Low Risk';
    let interpretation = "";
    let clinicalRecommendation = "";

    if (score > 6.0) {
        riskCategory = 'High Risk';
        interpretation = `Score: ${score} (High Probability of PE, ~65% risk).`;
        clinicalRecommendation = "Urgent CT Pulmonary Angiography (CTPA). Initiate empiric parenteral anticoagulation immediately unless high active bleeding risk.";
    } else if (score >= 2.0) {
        riskCategory = 'Intermediate / Moderate Risk';
        interpretation = `Score: ${score} (Moderate Probability of PE, ~28% risk).`;
        clinicalRecommendation = "Order high-sensitivity D-Dimer test or proceed directly to CTPA depending on renal function and clinical trajectory.";
    } else {
        riskCategory = 'Low Risk';
        interpretation = `Score: ${score} (Low Probability of PE, ~3.6% risk).`;
        clinicalRecommendation = "Apply PERC rule. If PERC negative, PE safely ruled out without D-dimer. If PERC positive, draw high-sensitivity D-dimer.";
    }

    return {
        id: `score-wells-pe-${Date.now()}`,
        name: "Wells Score for Pulmonary Embolism",
        score,
        maxScore: 12.5,
        riskCategory,
        interpretation,
        clinicalRecommendation,
        criteriaChecked: criteria,
        calculatedAt: Date.now()
    };
}

// ==========================================
// 3. TIMI RISK SCORE (FOR UNSTABLE ANGINA / NSTEMI)
// ==========================================

export function calculateTIMI_ACS(checks: {
    age65OrOlder: boolean;
    threeOrMoreCADRiskFactors: boolean; // HTN, Dyslipidemia, DM, Smoking, Family Hx
    knownCADStenosis50: boolean;
    aspirinUsePast7Days: boolean;
    severeAnginaPast24h: boolean; // >= 2 episodes in 24h
    stSegmentDeviation05mm: boolean;
    elevatedCardiacMarkers: boolean;
}): ClinicalRiskScore {
    const criteria: { label: string; points: number }[] = [];
    let score = 0;

    if (checks.age65OrOlder) { criteria.push({ label: "Age >= 65 years", points: 1 }); score += 1; }
    if (checks.threeOrMoreCADRiskFactors) { criteria.push({ label: ">= 3 CAD Risk Factors (HTN, Lipids, DM, Tobacco, Family Hx)", points: 1 }); score += 1; }
    if (checks.knownCADStenosis50) { criteria.push({ label: "Prior coronary stenosis >= 50%", points: 1 }); score += 1; }
    if (checks.aspirinUsePast7Days) { criteria.push({ label: "Aspirin use within last 7 days", points: 1 }); score += 1; }
    if (checks.severeAnginaPast24h) { criteria.push({ label: ">= 2 Anginal events in last 24 hours", points: 1 }); score += 1; }
    if (checks.stSegmentDeviation05mm) { criteria.push({ label: "ST deviation >= 0.5 mm on ECG", points: 1 }); score += 1; }
    if (checks.elevatedCardiacMarkers) { criteria.push({ label: "Elevated cardiac biomarkers (Troponin)", points: 1 }); score += 1; }

    const mortalityMatrix: Record<number, string> = {
        0: "4.7%",
        1: "4.7%",
        2: "8.3%",
        3: "13.2%",
        4: "19.9%",
        5: "26.2%",
        6: "40.9%",
        7: "40.9%"
    };

    const estRisk = mortalityMatrix[score] || "15%";
    let riskCategory: ClinicalRiskScore['riskCategory'] = 'Low Risk';
    let recommendation = "";

    if (score >= 5) {
        riskCategory = 'High Risk';
        recommendation = `TIMI Score ${score} (High Risk: ${estRisk} 14-day risk of death, new MI, or severe ischemia). Early invasive coronary angiography (< 24h) strongly recommended per 2023 ESC Guidelines.`;
    } else if (score >= 3) {
        riskCategory = 'Intermediate / Moderate Risk';
        recommendation = `TIMI Score ${score} (Intermediate Risk: ${estRisk} 14-day ischemic event rate). Inpatient telemetry admission, DAPT, and invasive strategy within 24-48 hours.`;
    } else {
        riskCategory = 'Low Risk';
        recommendation = `TIMI Score ${score} (Low Risk: ${estRisk} 14-day event rate). Non-invasive functional imaging or conservative medical stabilization strategy acceptable.`;
    }

    return {
        id: `score-timi-${Date.now()}`,
        name: "TIMI Risk Score for UA / NSTEMI",
        score,
        maxScore: 7,
        riskCategory,
        interpretation: `Score: ${score}/7 (${estRisk} estimated 14-day all-cause mortality, new MI, or urgent revascularization).`,
        clinicalRecommendation: recommendation,
        criteriaChecked: criteria,
        calculatedAt: Date.now()
    };
}

// ==========================================
// 4. CURB-65 SCORE FOR COMMUNITY-ACQUIRED PNEUMONIA
// ==========================================

export function calculateCURB65(checks: {
    confusion: boolean;
    ureaOver7OrBUNOver19: boolean;
    respiratoryRate30OrMore: boolean;
    bloodPressureLow: boolean; // SBP < 90 or DBP <= 60
    age65OrOlder: boolean;
}): ClinicalRiskScore {
    const criteria: { label: string; points: number }[] = [];
    let score = 0;

    if (checks.confusion) { criteria.push({ label: "Confusion (Mental Test Score <= 8 or new disorientation)", points: 1 }); score += 1; }
    if (checks.ureaOver7OrBUNOver19) { criteria.push({ label: "BUN > 19 mg/dL (> 7 mmol/L)", points: 1 }); score += 1; }
    if (checks.respiratoryRate30OrMore) { criteria.push({ label: "Respiratory rate >= 30 breaths/min", points: 1 }); score += 1; }
    if (checks.bloodPressureLow) { criteria.push({ label: "Blood Pressure (SBP < 90 or DBP <= 60 mmHg)", points: 1 }); score += 1; }
    if (checks.age65OrOlder) { criteria.push({ label: "Age >= 65 years", points: 1 }); score += 1; }

    let riskCategory: ClinicalRiskScore['riskCategory'] = 'Low Risk';
    let recommendation = "";

    if (score >= 3) {
        riskCategory = 'High Risk';
        recommendation = "High 30-day mortality risk (15-40%). Urgent hospital admission; consider intensive care unit (ICU) admission and dual parenteral antimicrobials (Beta-lactam + Macrolide/Fluoroquinolone).";
    } else if (score === 2) {
        riskCategory = 'Intermediate / Moderate Risk';
        recommendation = "Moderate 30-day mortality risk (6.8%). Short hospital inpatient stay or closely supervised outpatient monitoring.";
    } else {
        riskCategory = 'Low Risk';
        recommendation = "Low 30-day mortality risk (0.7 - 2.1%). Safe for outpatient oral antimicrobial therapy and primary care follow-up.";
    }

    return {
        id: `score-curb65-${Date.now()}`,
        name: "CURB-65 Pneumonia Severity Score",
        score,
        maxScore: 5,
        riskCategory,
        interpretation: `Score: ${score}/5.`,
        clinicalRecommendation: recommendation,
        criteriaChecked: criteria,
        calculatedAt: Date.now()
    };
}

// ==========================================
// 5. CHA2DS2-VASc SCORE FOR ATRIAL FIBRILLATION
// ==========================================

export function calculateCHA2DS2_VASc(checks: {
    congestiveHeartFailure: boolean; // +1
    hypertension: boolean;           // +1
    age75OrOlder: boolean;           // +2
    diabetesMellitus: boolean;       // +1
    strokeOrTIAorThromboembolism: boolean; // +2
    vascularDisease: boolean;        // +1 (Prior MI, PAD, Aortic plaque)
    age65to74: boolean;              // +1
    femaleSex: boolean;              // +1
}): ClinicalRiskScore {
    const criteria: { label: string; points: number }[] = [];
    let score = 0;

    if (checks.congestiveHeartFailure) { criteria.push({ label: "Congestive Heart Failure / LVEF <= 40%", points: 1 }); score += 1; }
    if (checks.hypertension) { criteria.push({ label: "Hypertension (or on antihypertensive therapy)", points: 1 }); score += 1; }
    if (checks.age75OrOlder) { criteria.push({ label: "Age >= 75 years", points: 2 }); score += 2; }
    if (checks.diabetesMellitus) { criteria.push({ label: "Diabetes Mellitus", points: 1 }); score += 1; }
    if (checks.strokeOrTIAorThromboembolism) { criteria.push({ label: "Prior Stroke / TIA / Thromboembolism", points: 2 }); score += 2; }
    if (checks.vascularDisease) { criteria.push({ label: "Vascular Disease (prior MI, PAD, complex aortic plaque)", points: 1 }); score += 1; }
    if (!checks.age75OrOlder && checks.age65to74) { criteria.push({ label: "Age 65 - 74 years", points: 1 }); score += 1; }
    if (checks.femaleSex) { criteria.push({ label: "Sex category Female", points: 1 }); score += 1; }

    let riskCategory: ClinicalRiskScore['riskCategory'] = 'Low Risk';
    let recommendation = "";

    const nonSexScore = score - (checks.femaleSex ? 1 : 0);

    if (nonSexScore >= 2) {
        riskCategory = 'High Risk';
        recommendation = "Oral Anticoagulation (OAC) with Direct Oral Anticoagulant (DOAC: Apixaban, Rivaroxaban, Dabigatran) is strongly recommended (Class I, Level A) to prevent thromboembolic stroke.";
    } else if (nonSexScore === 1) {
        riskCategory = 'Intermediate / Moderate Risk';
        recommendation = "Oral Anticoagulation should be considered (Class IIa, Level B) based on individual bleeding risk (HAS-BLED) and patient values.";
    } else {
        riskCategory = 'Low Risk';
        recommendation = "Low stroke risk. No antithrombotic therapy recommended (Class III Harm for Aspirin monotherapy in AF).";
    }

    return {
        id: `score-cha2ds2-${Date.now()}`,
        name: "CHA2DS2-VASc Stroke Risk in AF",
        score,
        maxScore: 9,
        riskCategory,
        interpretation: `Score: ${score}/9.`,
        clinicalRecommendation: recommendation,
        criteriaChecked: criteria,
        calculatedAt: Date.now()
    };
}
