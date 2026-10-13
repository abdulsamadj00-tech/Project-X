import { Encounter, PatientEducationDoc } from '../types';

// ==========================================
// 1. HL7 FHIR R4 DOCUMENT BUNDLE GENERATOR
// Standard Healthcare Interoperability Specification
// ==========================================

export function generateFHIRR4Bundle(encounter: Encounter): Record<string, any> {
    const nowIso = new Date().toISOString();
    const patientId = `patient-${encounter.id.slice(0, 8)}`;
    const encounterId = `encounter-${encounter.id.slice(0, 8)}`;

    const entries: any[] = [];

    // 1. FHIR Patient Resource
    entries.push({
        fullUrl: `urn:uuid:${patientId}`,
        resource: {
            resourceType: "Patient",
            id: patientId,
            identifier: [
                {
                    system: "https://medidx.health/patients",
                    value: encounter.id
                }
            ],
            name: [
                {
                    use: "official",
                    text: encounter.patientData.name || "Anonymous Patient"
                }
            ],
            gender: (encounter.patientData.sex || 'unknown').toLowerCase(),
            extension: [
                {
                    url: "http://hl7.org/fhir/StructureDefinition/patient-age",
                    valueInteger: parseInt(encounter.patientData.age) || 50
                }
            ]
        }
    });

    // 2. FHIR Encounter Resource
    entries.push({
        fullUrl: `urn:uuid:${encounterId}`,
        resource: {
            resourceType: "Encounter",
            id: encounterId,
            status: encounter.status === 'Active' ? 'in-progress' : 'finished',
            class: {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                code: "EMER",
                display: "emergency"
            },
            subject: {
                reference: `urn:uuid:${patientId}`,
                display: encounter.patientData.name
            },
            period: {
                start: new Date(encounter.timestamp).toISOString(),
                end: encounter.status === 'Active' ? undefined : nowIso
            },
            priority: {
                coding: [
                    {
                        system: "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
                        code: encounter.triage?.level === 1 ? "CR" : encounter.triage?.level === 2 ? "EL" : "R",
                        display: `ESI Level ${encounter.triage?.level || 2}: ${encounter.triage?.acuityName || 'Emergent'}`
                    }
                ]
            }
        }
    });

    // 3. FHIR Condition Resources (Diagnoses with WHO ICD-11 & ICD-10)
    (encounter.provisionalDiagnoses || []).forEach((dx, index) => {
        const condId = `condition-${encounter.id.slice(0, 8)}-${index + 1}`;
        const icd11Match = dx.icdCode.match(/ICD-11:\s*([A-Za-z0-9.]+)/i);
        const icd10Match = dx.icdCode.match(/ICD-10:\s*([A-Za-z0-9.]+)/i);

        entries.push({
            fullUrl: `urn:uuid:${condId}`,
            resource: {
                resourceType: "Condition",
                id: condId,
                clinicalStatus: {
                    coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }]
                },
                verificationStatus: {
                    coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: index === 0 ? "provisional" : "differential" }]
                },
                code: {
                    coding: [
                        {
                            system: "http://id.who.int/icd/release/11/mms",
                            code: icd11Match ? icd11Match[1] : dx.icdCode,
                            display: dx.diagnosisName
                        },
                        ...(icd10Match ? [{
                            system: "http://hl7.org/fhir/sid/icd-10",
                            code: icd10Match[1],
                            display: dx.diagnosisName
                        }] : [])
                    ],
                    text: dx.diagnosisName
                },
                subject: { reference: `urn:uuid:${patientId}` },
                encounter: { reference: `urn:uuid:${encounterId}` }
            }
        });
    });

    // 4. FHIR Observations (Vital Signs with LOINC)
    const vitals = encounter.patientData.vitals;
    if (vitals) {
        if (vitals.hr) {
            entries.push({
                resource: {
                    resourceType: "Observation",
                    status: "final",
                    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
                    code: { coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }] },
                    subject: { reference: `urn:uuid:${patientId}` },
                    valueQuantity: { value: parseFloat(vitals.hr), unit: "beats/minute", system: "http://unitsofmeasure.org", code: "/min" }
                }
            });
        }
        if (vitals.bp) {
            const [sbp, dbp] = vitals.bp.split('/').map(v => parseFloat(v));
            if (!isNaN(sbp)) {
                entries.push({
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
                        code: { coding: [{ system: "http://loinc.org", code: "8480-6", display: "Systolic blood pressure" }] },
                        subject: { reference: `urn:uuid:${patientId}` },
                        valueQuantity: { value: sbp, unit: "mmHg", system: "http://unitsofmeasure.org", code: "mm[Hg]" }
                    }
                });
            }
        }
        if (vitals.spo2) {
            entries.push({
                resource: {
                    resourceType: "Observation",
                    status: "final",
                    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
                    code: { coding: [{ system: "http://loinc.org", code: "2708-6", display: "Oxygen saturation in Arterial blood" }] },
                    subject: { reference: `urn:uuid:${patientId}` },
                    valueQuantity: { value: parseFloat(vitals.spo2), unit: "%", system: "http://unitsofmeasure.org", code: "%" }
                }
            });
        }
    }

    // 5. FHIR MedicationRequests
    (encounter.treatments || []).forEach((tx, idx) => {
        const medId = `med-request-${encounter.id.slice(0, 8)}-${idx + 1}`;
        entries.push({
            fullUrl: `urn:uuid:${medId}`,
            resource: {
                resourceType: "MedicationRequest",
                id: medId,
                status: tx.isActive ? "active" : "stopped",
                intent: "order",
                medicationCodeableConcept: { text: tx.drugName },
                subject: { reference: `urn:uuid:${patientId}` },
                dosageInstruction: [{ text: `${tx.dosage} ${tx.route || ''} ${tx.frequency || ''}`.trim() }]
            }
        });
    });

    return {
        resourceType: "Bundle",
        id: `bundle-medidx-${encounter.id}`,
        meta: {
            lastUpdated: nowIso,
            profile: ["http://hl7.org/fhir/StructureDefinition/document"]
        },
        type: "document",
        timestamp: nowIso,
        entry: entries
    };
}

// ==========================================
// 2. PATIENT-FRIENDLY MULTILINGUAL AFTERCARE GENERATOR
// Translates Clinical Plans into 6th-Grade Reading Level
// ==========================================

export function buildPatientEducation(encounter: Encounter, language = 'English'): PatientEducationDoc {
    const primaryDx = encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses?.[0]?.diagnosisName || encounter.patientData.primaryComplaint;
    const isCardiac = /coronary|infarct|angina|chest|heart/i.test(primaryDx);
    const isRespiratory = /pneumonia|respiratory|asthma|copd|lung/i.test(primaryDx);

    if (language === 'Spanish') {
        return {
            language: 'Spanish',
            conditionName: isCardiac ? "Ataque Cardíaco o Isquemia Coronaria Aguda" : "Afección Médica Aguda",
            simpleSummary: isCardiac
                ? "Usted experimentó dolor u opresión en el pecho debido a que una de las arterias que lleva sangre a su corazón estuvo parcialmente bloqueada. Su equipo médico le ha administrado medicamentos especiales para proteger su corazón y prevenir coágulos."
                : "Su médico ha evaluado sus síntomas y comenzado un tratamiento específico para ayudarle a recuperarse rápidamente.",
            whyPrescribedMedications: (encounter.treatments || []).map(t => ({
                drug: t.drugName,
                purpose: t.drugName.toLowerCase().includes('aspirin') || t.drugName.toLowerCase().includes('ticagrelor')
                    ? "Evita que las células sanguíneas formen coágulos peligrosos."
                    : t.drugName.toLowerCase().includes('statin')
                    ? "Protege los vasos sanguíneos y reduce el colesterol."
                    : "Medicamento recetado para estabilizar su presión y ritmo cardíaco.",
                howToTake: `${t.dosage} (${t.frequency || 'según las indicaciones'})`
            })),
            redFlagSigns: [
                "Dolor, opresión o ardor en el pecho que regresa o se propaga al brazo o mandíbula",
                "Falta de aire repentina o dificultad para respirar en reposo",
                "Mareos intensos, desmayos o sudor frío repentino",
                "Hinchazón repentina de piernas o labios"
            ],
            whatToDoInEmergency: "SI EXPERIMENTA CUALQUIERA DE ESTOS SIGNOS DE ALERTA: Llame de inmediato al 911 o al número de emergencias local. No conduzca usted mismo al hospital.",
            lifestyleAndDietAdvice: [
                "Descanse y evite esfuerzos físicos pesados hasta que su cardiólogo lo autorice.",
                "No fume ni consuma productos con tabaco o nicotina.",
                "Consuma alimentos bajos en sal y grasas saturadas."
            ],
            followUpPlan: "Cita de control médico con su especialista programada dentro de 7 a 14 días.",
            generatedAt: Date.now()
        };
    }

    if (language === 'Urdu') {
        return {
            language: 'Urdu',
            conditionName: isCardiac ? "دل کا دورہ یا شریان میں رکاوٹ (Acute Coronary Syndrome)" : "طبی معائنہ اور علاج",
            simpleSummary: isCardiac
                ? "آپ کے سینے میں دباؤ اور درد اس لیے ہوا کیونکہ دل کی طرف جانے والی خون کی نالی میں رکاوٹ آئی تھی۔ ڈاکٹرز نے خون پتلا کرنے اور دل کو محفوظ رکھنے والی دوائیں شروع کر دی ہیں۔"
                : "ڈاکٹرز نے آپ کی بیماری کا بغور جائزہ لے کر مناسب ادویات تجویز کی ہیں تاکہ آپ جلد صحت یاب ہوں۔",
            whyPrescribedMedications: (encounter.treatments || []).map(t => ({
                drug: t.drugName,
                purpose: "دل کو محفوظ رکھنے اور خون میں لوتھڑے بننے سے روکنے کے لیے۔",
                howToTake: `${t.dosage} (${t.frequency || 'ڈاکٹر کی ہدایت کے مطابق'})`
            })),
            redFlagSigns: [
                "سینے میں شدید درد، گھٹن یا بوجھ کا دوبارہ ہونا جو بائیں بازو یا جبڑے میں پھیلے",
                "اچانک سانس پھولنا یا سانس لینے میں شدید دشواری",
                "شدید چکر آنا، بے ہوشی یا اچانک ٹھنڈے پسینے آنا",
                "چہرے، ہونٹوں یا ٹانگوں پر اچانک سوجن"
            ],
            whatToDoInEmergency: "اگر ان میں سے کوئی بھی علامت ظاہر ہو تو فوری طور پر ایمرجنسی / ایمبولینس کو کال کریں یا قریبی ہسپتال پہنچیں۔ خود گاڑی نہ چلائیں۔",
            lifestyleAndDietAdvice: [
                "بھاری وزن اٹھانے اور سخت جسمانی مشقت سے پرہیز کریں۔",
                "تمباکو نوشی اور سگریٹ سے مکمل طور پر دور رہیں۔",
                "کھانے میں نمک اور چکنائی کی مقدار انتہائی کم رکھیں۔"
            ],
            followUpPlan: "7 سے 10 دن کے اندر ماہر امراض قلب (Cardiologist) سے فالو اپ معائنہ کرائیں۔",
            generatedAt: Date.now()
        };
    }

    if (language === 'Arabic') {
        return {
            language: 'Arabic',
            conditionName: isCardiac ? "متلازمة الشريان التاجي الحادة أو النوبة القلبية" : "الحالة الطبية الحادة",
            simpleSummary: isCardiac
                ? "حدث ألم أو ضغط في صدرك بسبب تضيق في تدفق الدم إلى عضلة القلب. تم إعطاؤك أدوية لحماية قلبك ومنع تكون الجلطات."
                : "تم فحص حالتك من قبل الفريق الطبي وبدء خطة العلاج المناسبة لتعافيك السريع.",
            whyPrescribedMedications: (encounter.treatments || []).map(t => ({
                drug: t.drugName,
                purpose: "لحماية عضلة القلب ومنع تخثر الدم وتثبيت ضغط الدم.",
                howToTake: `${t.dosage} (${t.frequency || 'حسب إرشادات الطبيب'})`
            })),
            redFlagSigns: [
                "ألم أو ضغط شديد في الصدر يمتد إلى الذراع الأيسر أو الفك",
                "صعوبة مفاجئة أو ضيق شديد في التنفس",
                "دوخة شديدة، إغماء، أو تعرق بارد مفاجئ"
            ],
            whatToDoInEmergency: "إذا شعرت بأي من هذه الأعراض الخطيرة: اتصل فوراً بالإسعاف (الطوارئ) أو توجه إلى أقرب مستشفى على الفور.",
            lifestyleAndDietAdvice: [
                "الراحة وتجنب الإجهاد البدني الشاق حتى يسمح الطبيب بذلك.",
                "التوقف التام عن التدخين.",
                "اتباع نظام غذائي قليل الملح والدهون."
            ],
            followUpPlan: "مراجعة طبيب القلب خلال 7 إلى 14 يوماً.",
            generatedAt: Date.now()
        };
    }

    // Default: Clear, Patient-Friendly English (6th Grade Reading Level)
    return {
        language: 'English',
        conditionName: isCardiac ? "Acute Heart Event (NSTEMI / Coronary Blockage)" : isRespiratory ? "Lung Infection / Acute Respiratory Illness" : "Acute Medical Condition",
        simpleSummary: isCardiac
            ? "You experienced chest pressure because one of the blood pipes feeding oxygen to your heart muscle became partially narrowed or blocked. Your medical team has started special medicines to thin the blood, protect your heart from damage, and prevent blood clots."
            : "Your doctor has carefully evaluated your symptoms and started targeted treatments to help your body heal and regain full strength.",
        whyPrescribedMedications: (encounter.treatments || []).map(t => ({
            drug: t.drugName,
            purpose: t.drugName.toLowerCase().includes('aspirin') || t.drugName.toLowerCase().includes('ticagrelor')
                ? "Keeps blood cells slippery so they don't form dangerous clots inside your heart arteries."
                : t.drugName.toLowerCase().includes('statin')
                ? "Calms swelling in your blood vessels and lowers harmful cholesterol."
                : t.drugName.toLowerCase().includes('metoprolol') || t.drugName.toLowerCase().includes('beta')
                ? "Slows down your heart rate so your heart doesn't have to work as hard."
                : "Prescribed to treat your condition and support your recovery.",
            howToTake: `${t.dosage} (${t.route || 'By mouth'}, ${t.frequency || 'As directed by physician'})`
        })),
        redFlagSigns: [
            "Chest pressure, crushing tightness, or pain that spreads to your neck, jaw, back, or left arm",
            "Sudden shortness of breath or trouble breathing while resting",
            "Dizziness, lightheadedness, feeling like you might pass out, or sudden cold sweats",
            "Rapid, pounding, or irregular heartbeat that doesn't slow down",
            "Coughing up blood or sudden swelling in your legs"
        ],
        whatToDoInEmergency: "IF YOU EXPERIENCE ANY OF THESE RED FLAGS: Call 911 or your local emergency number immediately. DO NOT try to drive yourself to the hospital.",
        lifestyleAndDietAdvice: [
            "Rest at home and avoid lifting heavy objects or vigorous exercise until cleared by your doctor.",
            "Do NOT smoke or use any tobacco/vape products (smoking severely damages blood vessels).",
            "Eat heart-healthy meals: plenty of vegetables, fruits, and lean proteins, and avoid high-salt foods.",
            "Take all your prescribed medicines every single day without skipping doses."
        ],
        followUpPlan: "Follow-up consultation with your attending physician / cardiologist scheduled within 7 to 14 days.",
        generatedAt: Date.now()
    };
}
