import { Encounter, PatientData, DoctorDetails, Diagnosis } from '../types';
import { GoogleGenAI } from '@google/genai';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export type ReportType = 'comprehensive' | 'lama' | 'discharge' | 'referral';
export type ReportLanguage = 'en' | 'ur' | 'bilingual';

export interface ReportSectionConfig {
    id: string;
    labelEn: string;
    labelUr: string;
    description: string;
    defaultEnabled: boolean;
    category: 'demographics' | 'triage' | 'clinical' | 'diagnostics' | 'orders' | 'legal';
}

export const REPORT_SECTIONS: ReportSectionConfig[] = [
    {
        id: 'demographics',
        labelEn: 'Patient Demographics & Identification',
        labelUr: 'مریض کا بائیو ڈیٹا اور شناختی تفصیلات',
        description: 'Name, Age, Gender, MRN, Admission Timestamp',
        defaultEnabled: true,
        category: 'demographics'
    },
    {
        id: 'triage',
        labelEn: 'Triage Acuity & ESI Level (1–5)',
        labelUr: 'ایمرجنسی ٹرائیج اور فوری خطرے کی درجہ بندی',
        description: 'Emergency Severity Index, Target Time, Pain & AVPU',
        defaultEnabled: true,
        category: 'triage'
    },
    {
        id: 'complaint',
        labelEn: 'Chief Complaints & History (HPI)',
        labelUr: 'بنیادی شکایات اور بیماری کی تفصیل',
        description: 'Presenting symptoms, duration, history of illness',
        defaultEnabled: true,
        category: 'clinical'
    },
    {
        id: 'vitals',
        labelEn: 'Vital Signs & Hemodynamics',
        labelUr: 'حیاتیاتی علامات (وائٹلز اور نبض و دباؤ)',
        description: 'BP, HR, SpO2, Temp, RR',
        defaultEnabled: true,
        category: 'clinical'
    },
    {
        id: 'history',
        labelEn: 'Past Medical, Surgical & Allergy History',
        labelUr: 'سابقہ طبی و جراحی تاریخ اور ادویاتی الرجی',
        description: 'Comorbidities, past operations, drug allergies',
        defaultEnabled: true,
        category: 'clinical'
    },
    {
        id: 'findings',
        labelEn: 'Systemic Physical Examination',
        labelUr: 'جسمانی و نظامی طبی معائنہ کے نتائج',
        description: 'Chest, CVS, Abdomen, Neuro findings',
        defaultEnabled: true,
        category: 'clinical'
    },
    {
        id: 'labs',
        labelEn: 'Laboratory & Diagnostic Investigations',
        labelUr: 'لیبارٹری اور تشخیصی ٹیسٹ بمعہ خطرے کے نتائج',
        description: 'Ordered tests, collection status, results, panic values',
        defaultEnabled: true,
        category: 'diagnostics'
    },
    {
        id: 'stepwise',
        labelEn: 'Stepwise Clinical Pathway & Milestones',
        labelUr: 'مرحلہ وار علاج اور طبی اقدامات کا لائحہ عمل',
        description: 'Resuscitation, acute stabilization, monitoring phases',
        defaultEnabled: true,
        category: 'orders'
    },
    {
        id: 'treatments',
        labelEn: 'Active Medications & Treatment Regimen',
        labelUr: 'جاری ادویات، خوراک اور طبی احکامات',
        description: 'Drug names, dosages, route, frequency',
        defaultEnabled: true,
        category: 'orders'
    },
    {
        id: 'diagnoses',
        labelEn: 'Differential & Final Diagnoses (ICD-11)',
        labelUr: 'ممکنہ و حتمی تشخیص بمعہ آئی سی ڈی 11 کوڈز',
        description: 'Provisional differential rankings, probability, ICD-11',
        defaultEnabled: true,
        category: 'clinical'
    },
    {
        id: 'recommendations',
        labelEn: 'Evidence-Based Clinical Guidelines & AI Insights',
        labelUr: 'طبی گائیڈ لائنز اور ماہرانہ سفارشات',
        description: 'Guideline citations (AHA/ESC/GOLD), next steps',
        defaultEnabled: true,
        category: 'clinical'
    },
    {
        id: 'conclusion',
        labelEn: 'Hospital Course, Discharge / LAMA Advice',
        labelUr: 'دورانِ داخلہ احوال اور ڈسچارج یا لاما کی ہدایات',
        description: 'Outcome summary, warnings, follow-up scheduling',
        defaultEnabled: true,
        category: 'legal'
    },
    {
        id: 'attestation',
        labelEn: 'Clinician Attestation & Digital Verification Stamp',
        labelUr: 'معالج کی تصدیق اور ڈیجیٹل دستخط',
        description: 'Doctor name, GMC/NPI license, digital signature hash',
        defaultEnabled: true,
        category: 'legal'
    }
];

export interface EditableReportContent {
    hospitalNameEn: string;
    hospitalNameUr: string;
    clinicalSummaryEn: string;
    clinicalSummaryUr: string;
    hospitalCourseEn: string;
    hospitalCourseUr: string;
    dischargeMedicationsEn: string;
    dischargeMedicationsUr: string;
    followUpPlanEn: string;
    followUpPlanUr: string;
    referralToEn: string;
    referralToUr: string;
    referralReasonEn: string;
    referralReasonUr: string;
    // LAMA specific fields
    lamaPatientOrGuardianName: string;
    lamaRefusalReasonEn: string;
    lamaRefusalReasonUr: string;
    lamaSpecificRefusalsEn: string;
    lamaSpecificRefusalsUr: string;
    lamaWitnessName: string;
    lamaWitnessRelation: string;
}

export const getInitialReportContent = (
    encounter: Encounter,
    doctorDetails: DoctorDetails
): EditableReportContent => {
    const p = encounter.patientData;
    const primaryDx = encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses?.[0]?.diagnosisName || p.primaryComplaint || 'Acute Condition';

    return {
        hospitalNameEn: 'Central Emergency & Academic Medical Center',
        hospitalNameUr: 'سینٹرل ایمرجنسی اینڈ ٹیچنگ ہسپتال',
        clinicalSummaryEn: `Patient ${p.name || 'Unidentified'} (${p.age}yo, ${p.sex}) presented with ${p.primaryComplaint || 'acute clinical symptoms'}. Vital signs evaluated: BP ${p.vitals?.bp || 'N/A'}, HR ${p.vitals?.hr || 'N/A'} bpm, SpO2 ${p.vitals?.spo2 || 'N/A'}%. Primary diagnostic consideration: ${primaryDx}.`,
        clinicalSummaryUr: `مریض ${p.name || 'نامعلوم'} (عمر ${p.age} سال، جنس ${p.sex === 'Male' ? 'مرد' : 'خاتون'}) علامات '${p.primaryComplaint || 'شدید تکلیف'}' کے ساتھ تشریف لائے۔ ابتدائی معائنے میں بلڈ پریشر ${p.vitals?.bp || 'غیر درج'}، نبض ${p.vitals?.hr || 'غیر درج'}، آکسیجن ${p.vitals?.spo2 || 'غیر درج'} فیصد ریکارڈ کی گئی۔ بنیادی تشخیص: ${primaryDx}۔`,
        hospitalCourseEn: `Patient was admitted and placed under active clinical monitoring. Stepwise resuscitation protocols initiated. Investigations reviewed and medical stabilization achieved.`,
        hospitalCourseUr: `مریض کو ہسپتال میں داخل کر کے انتہائی نگہداشت اور طبی نگرانی میں رکھا گیا۔ مرحلہ وار طبی اقدامات کیے گئے، ٹیسٹ مکمل کیے گئے اور حالت کو مستحکم کیا گیا۔`,
        dischargeMedicationsEn: encounter.treatments && encounter.treatments.length > 0
            ? encounter.treatments.map(t => `${t.drugName} ${t.dosage} (${t.route || 'Oral'}) ${t.frequency || ''}`).join('\n')
            : 'Continue prescribed medications as directed by attending physician.',
        dischargeMedicationsUr: encounter.treatments && encounter.treatments.length > 0
            ? encounter.treatments.map(t => `${t.drugName}: خوراک ${t.dosage} بذریعہ ${t.route || 'Oral'} (${t.frequency || ''})`).join('\n')
            : 'ڈاکٹر کی تجویز کردہ تمام ادویات ہدایات کے مطابق باقاعدگی سے جاری رکھیں۔',
        followUpPlanEn: 'Follow-up with primary care physician or specialist in 5–7 days. Return to emergency department immediately if red flag warning signs appear.',
        followUpPlanUr: 'اگلے 5 سے 7 دنوں میں متعلقہ معالج سے دوبارہ معائنہ کروائیں۔ کسی بھی ہنگامی علامت یا حالت بگڑنے کی صورت میں فوری ایمرجنسی وارڈ رجوع کریں۔',
        referralToEn: 'Department of Internal Medicine / Critical Care Specialist',
        referralToUr: 'شعبہ امراض باطنہ / سپیشلسٹ فزیشن',
        referralReasonEn: `Urgent specialist evaluation and secondary tier management for suspected ${primaryDx}.`,
        referralReasonUr: `مریض کی تفصیلی جانچ اور جدید علاج کے لیے سپیشلسٹ رائے مطلوب ہے۔ ممکنہ تشخیص: ${primaryDx}۔`,
        // LAMA Defaults
        lamaPatientOrGuardianName: p.name || 'Patient / Guardian',
        lamaRefusalReasonEn: 'Personal family reasons and preference to seek care at alternative facility or home.',
        lamaRefusalReasonUr: 'ذاتی و خاندانی وجوہات اور گھر پر دیکھ بھال کی ترجیح۔',
        lamaSpecificRefusalsEn: 'Admission to High Dependency Unit, intravenous medications, and continuous telemetry monitoring.',
        lamaSpecificRefusalsUr: 'داخلہ ہسپتال، ڈرپ بذریعہ رگ، اور مسلسل دل و نبض کی مانیٹرنگ سے انکار۔',
        lamaWitnessName: doctorDetails.name ? `RN Staff / Witness` : 'Hospital Staff Witness',
        lamaWitnessRelation: 'Registered Emergency Nurse'
    };
};

/**
 * Authentic Urdu translations for clinical terms and legal LAMA statements
 */
export const URDU_LAMA_STATEMENTS = {
    title: 'میڈیکل ایڈوائس کے خلاف ہسپتال سے رخصتی کا باضابطہ اقرار نامہ (LAMA)',
    subtitle: 'طبی انتباہ، خطرات سے آگاہی اور قانونی برأت کا قانونی دستاویز',
    patientDeclaration: (patientName: string, doctorName: string) => 
        `میں، ${patientName || 'مریض / ولی'}، پورے ہوش و حواس میں اور بغیر کسی دباؤ کے اقرار کرتا/کرتی ہوں کہ میں اپنے معالج ڈاکٹر ${doctorName || 'معالج'} کے واضح طبی مشورے اور ہسپتال کی پالیسی کے خلاف مریض / خود کو ہسپتال سے فارغ کروا کر لے جا رہا/رہی ہوں۔`,
    risksWarning: 
        'مجھے معالج نے تفصیلی طور پر سمجھا دیا ہے کہ اس نازک حالت میں علاج ادھورا چھوڑنے یا ہسپتال سے جانے کے نتیجے میں بیماری خطرناک حد تک بڑھ سکتی ہے، جسمانی اعضاء مستقل طور پر ناکارہ ہو سکتے ہیں، یا جان جا سکتی ہے (موت واقع ہو سکتی ہے)۔',
    voluntaryChoice:
        'ان تمام سنگین خطرات اور جان لیوا پیچیدگیوں کو اچھی طرح سمجھنے کے باوجود میں مکمل طور پر اپنی مرضی اور ذمہ داری پر جا رہا/رہی ہوں۔',
    liabilityRelease:
        'میں ہسپتال کی انتظامیہ، ڈاکٹرز اور تمام طبی عملے کو کسی بھی قسم کے بعد میں پیش آنے والے جانی یا مالی نقصان اور قانونی ذمہ داری سے مکمل طور پر بری الذمہ قرار دیتا/دیتی ہوں۔',
    witnessDeclaration:
        'گواہ کا بیان: میرے سامنے مریض / ان کے سرپرست کو تمام طبی خطرات اور جان لیوا نتائج تفصیلاً سمجھائے گئے اور انہوں نے اپنے آزادانہ ارادے سے اس اقرار نامے پر دستخط کیے۔'
};

export const ENGLISH_LAMA_STATEMENTS = {
    title: 'Leave Against Medical Advice (LAMA) Official Declaration',
    subtitle: 'Informed Refusal of Continued Hospitalization & Medicolegal Release',
    patientDeclaration: (patientName: string, doctorName: string) =>
        `I, ${patientName || 'the Patient / Legal Guardian'}, hereby declare of my own free will that I am discharging myself/the patient against the explicit clinical advice of treating physician ${doctorName || 'Attending Physician'}.`,
    risksWarning:
        'I have been clearly and comprehensively warned by the clinical team that prematurely terminating medical care carries severe risks including: acute clinical deterioration, permanent irreversible organ damage/disability, or death.',
    voluntaryChoice:
        'Despite possessing a clear understanding of these critical life-threatening risks, I voluntarily and unequivocally refuse further recommended inpatient observation and interventions.',
    liabilityRelease:
        'I hereby release the hospital, its physicians, nurses, and clinical staff from all legal, civil, and criminal liability for any adverse clinical outcomes or fatal events resulting from this decision.',
    witnessDeclaration:
        'Witness Attestation: I confirm that the patient/guardian was thoroughly informed of clinical risks and voluntarily signed this refusal form in my presence.'
};

/**
 * AI-assisted report synthesizer that calls Gemini
 */
export const synthesizeReportWithAI = async (
    encounter: Encounter,
    reportType: ReportType,
    doctorDetails: DoctorDetails,
    currentContent: EditableReportContent
): Promise<EditableReportContent> => {
    try {
        const apiKey = process.env.API_KEY || (typeof window !== 'undefined' ? (window as any).GEMINI_API_KEY : '');
        if (!apiKey) {
            // High fidelity clinical heuristic generation if API key is in server env
            return generatePolishedLocalReport(encounter, reportType, doctorDetails, currentContent);
        }

        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a Chief Medical Officer and Clinical Documentation Specialist.
Generate a polished, concise, authentic bilingual (English and Urdu) medical report summary for the following encounter.
Report Type: ${reportType.toUpperCase()}
Patient: ${encounter.patientData.name || 'Patient'}, ${encounter.patientData.age}yo ${encounter.patientData.sex}
Chief Complaint: ${encounter.patientData.primaryComplaint}
Vitals: BP ${encounter.patientData.vitals?.bp}, HR ${encounter.patientData.vitals?.hr}, SpO2 ${encounter.patientData.vitals?.spo2}%, Temp ${encounter.patientData.vitals?.temp}C
Diagnoses: ${encounter.provisionalDiagnoses?.map(d => `${d.diagnosisName} (${d.icdCode})`).join(', ')}
Doctor: ${doctorDetails.name}, ${doctorDetails.role}

Output STRICTLY valid JSON with these keys:
{
  "clinicalSummaryEn": "...",
  "clinicalSummaryUr": "...",
  "hospitalCourseEn": "...",
  "hospitalCourseUr": "...",
  "dischargeMedicationsEn": "...",
  "dischargeMedicationsUr": "...",
  "followUpPlanEn": "...",
  "followUpPlanUr": "...",
  "lamaRefusalReasonEn": "...",
  "lamaRefusalReasonUr": "...",
  "lamaSpecificRefusalsEn": "...",
  "lamaSpecificRefusalsUr": "..."
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2,
                responseMimeType: 'application/json'
            }
        });

        const text = response.text?.trim() || '{}';
        const parsed = JSON.parse(text);

        return {
            ...currentContent,
            clinicalSummaryEn: parsed.clinicalSummaryEn || currentContent.clinicalSummaryEn,
            clinicalSummaryUr: parsed.clinicalSummaryUr || currentContent.clinicalSummaryUr,
            hospitalCourseEn: parsed.hospitalCourseEn || currentContent.hospitalCourseEn,
            hospitalCourseUr: parsed.hospitalCourseUr || currentContent.hospitalCourseUr,
            dischargeMedicationsEn: parsed.dischargeMedicationsEn || currentContent.dischargeMedicationsEn,
            dischargeMedicationsUr: parsed.dischargeMedicationsUr || currentContent.dischargeMedicationsUr,
            followUpPlanEn: parsed.followUpPlanEn || currentContent.followUpPlanEn,
            followUpPlanUr: parsed.followUpPlanUr || currentContent.followUpPlanUr,
            lamaRefusalReasonEn: parsed.lamaRefusalReasonEn || currentContent.lamaRefusalReasonEn,
            lamaRefusalReasonUr: parsed.lamaRefusalReasonUr || currentContent.lamaRefusalReasonUr,
            lamaSpecificRefusalsEn: parsed.lamaSpecificRefusalsEn || currentContent.lamaSpecificRefusalsEn,
            lamaSpecificRefusalsUr: parsed.lamaSpecificRefusalsUr || currentContent.lamaSpecificRefusalsUr,
        };
    } catch (err) {
        console.warn('AI report generation fallback triggered:', err);
        return generatePolishedLocalReport(encounter, reportType, doctorDetails, currentContent);
    }
};

/**
 * High-quality local clinical synthesis fallback
 */
function generatePolishedLocalReport(
    encounter: Encounter,
    reportType: ReportType,
    doctorDetails: DoctorDetails,
    prev: EditableReportContent
): EditableReportContent {
    const p = encounter.patientData;
    const dx = encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses?.[0]?.diagnosisName || p.primaryComplaint || 'Acute Condition';
    const icd = encounter.finalDiagnosis?.icdCode || encounter.provisionalDiagnoses?.[0]?.icdCode || 'ICD-11 Listed';

    const triageStr = encounter.triage 
        ? `Acuity Level ${encounter.triage.level} (${encounter.triage.clinicalRationale || 'Emergency Severity Index'})`
        : 'Assessed per Emergency Severity Index';

    const triageStrUr = encounter.triage
        ? `ایمرجنسی لیول ${encounter.triage.level} (شدید ضرورتِ علاج)`
        : 'ایمرجنسی درجہ بندی کے تحت جانچ مکمل';

    return {
        ...prev,
        clinicalSummaryEn: `Patient ${p.name || 'Unknown'} (${p.age}yo, ${p.sex}) presented in emergency setting. Initial acuity evaluated at ${triageStr}. Presenting complaint: "${p.primaryComplaint || 'Acute malaise'}". Primary working diagnosis established as ${dx} [ICD-11: ${icd}]. Diagnostic investigations and supportive stabilization were executed.`,
        clinicalSummaryUr: `مریض ${p.name || 'نامعلوم'} (${p.age} سال، ${p.sex === 'Male' ? 'مرد' : 'خاتون'}) ایمرجنسی وارڈ میں تشریف لائے۔ ٹرائیج جانچ: ${triageStrUr}۔ بنیادی شکایت: '${p.primaryComplaint || 'شدید تکلیف'}'۔ ابتدائی و حتمی تشخیص: ${dx} (کوڈ: ${icd}) قائم کی گئی۔ تمام ضروری ٹیسٹ اور جان بچانے والے اقدامات کیے گئے۔`,
        hospitalCourseEn: `Inpatient protocol initiated. Vital parameters tracked with targeted management steps. Differential diagnosis refined in alignment with international guidelines. Patient and relatives counseled on treatment objectives, pharmacotherapy, and disease progression risks.`,
        hospitalCourseUr: `ہسپتال داخلے کا طریقہ کار شروع کیا گیا۔ حیاتیاتی علامات کی مسلسل نگرانی اور مرحلہ وار علاج فراہم کیا گیا۔ بین الاقوامی طبی اصولوں کے مطابق تشخیص اور ادویات کا تعین ہوا۔ مریض اور لواحقین کو بیماری کی نوعیت اور ممکنہ خطرات سے آگاہ کیا گیا۔`,
        followUpPlanEn: `Urgent follow-up recommended in 3 to 5 calendar days with Attending Clinician (${doctorDetails.name || 'Physician'}). In the event of worsening pain, shortness of breath, fever, altered sensorium, or hemodynamic collapse, proceed immediately to the nearest Emergency Resuscitation Room.`,
        followUpPlanUr: `اگلے 3 سے 5 دنوں میں معالج ڈاکٹر ${doctorDetails.name || 'فزیشن'} سے دوبارہ چیک اپ لازمی کروائیں۔ سانس میں تنگی، شدید درد، تیز بخار، یا بے ہوشی کی صورت میں بغیر کسی تاخیر کے فوری قریبی ایمرجنسی وارڈ رجوع کریں۔`
    };
}

/**
 * High-definition PDF download utility using html2canvas & jsPDF
 */
export const exportElementToPdf = async (
    elementId: string,
    filename: string
): Promise<void> => {
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id #${elementId} not found`);
    }

    // Capture at high scale for razor-sharp medical report rendering
    const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;
    let heightLeft = imgHeight;
    let position = 0;

    // Multi-page rendering if report is long
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
    }

    pdf.save(filename);
};
