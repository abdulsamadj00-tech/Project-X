
import { PatientData, Diagnosis } from '../types';

// Keyword mapping for diagnoses to broader categories
const diagnosisToTagMap: { [key: string]: string[] } = {
    'pneumonia': ['Infection', 'Pulmonary'],
    'hypertension': ['Cardiovascular'],
    'diabetes': ['Endocrine', 'Metabolic'],
    'myocardial infarction': ['Cardiovascular', 'Ischemia'],
    'atrial fibrillation': ['Cardiovascular', 'Arrhythmia'],
    'stroke': ['Neurological', 'Cardiovascular'],
    'anemia': ['Hematology'],
    'sepsis': ['Infection', 'Critical Care'],
    'cellulitis': ['Infection', 'Dermatology'],
    'urinary tract infection': ['Infection', 'Urology'],
    'covid-19': ['Infection', 'Viral', 'Pulmonary']
};

// Keywords to look for in imaging reports
const imagingKeywordsToTagMap: { [key: string]: string } = {
    'pulmonary nodule': 'Lung Nodule',
    'consolidation': 'Consolidation',
    'effusion': 'Pleural Effusion',
    'opacity': 'Pulmonary Opacity',
    'atelectasis': 'Atelectasis',
    'fracture': 'Fracture',
};

/**
 * Analyzes patient and diagnosis data to generate a set of automated tags for indexing.
 * @param patientData The patient's clinical data.
 * @param diagnoses The list of AI-generated diagnoses.
 * @returns An array of string tags.
 */
export const generateAutoTags = (patientData: PatientData, diagnoses: Diagnosis[]): string[] => {
    const tags = new Set<string>();

    // FIX: Properties 'labs' and 'imaging' do not exist on type 'PatientData'.
    // Combine all investigation values into a single string for analysis.
    const allInvestigationsText = Object.values(patientData.investigations).join('\n').toLowerCase();

    // 1. Analyze Lab Results for specific values and keywords
    if (allInvestigationsText) {
        const labsLower = allInvestigationsText;
        
        // Regex for hemoglobin. Matches "hgb", "hb", "hemoglobin" followed by a value.
        const hgbRegex = /(?:hgb|hb|hemoglobin)[\s:is=]*?(\d{1,2}(?:\.\d{1,2})?)/g;
        let match;
        while ((match = hgbRegex.exec(labsLower)) !== null) {
            const value = parseFloat(match[1]);
            if (value < 10) {
                tags.add('Anemia');
                break; // Found one, no need to continue checking for Hgb
            }
        }
        // Also check for "LOW" flag from AI OCR which may be more reliable than parsing
        if (labsLower.includes('hgb') && (labsLower.includes('low') || labsLower.includes('critically low'))) {
             tags.add('Anemia');
        }
    }
    
    // 2. Analyze Diagnoses from AI
    diagnoses.forEach(dx => {
        const dxNameLower = dx.diagnosisName.toLowerCase();
        // Add the diagnosis name itself as a tag (formatted)
        const formattedDxName = dx.diagnosisName
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
        tags.add(formattedDxName);

        // Check against the map for categorical tags
        for (const keyword in diagnosisToTagMap) {
            if (dxNameLower.includes(keyword)) {
                diagnosisToTagMap[keyword].forEach(tag => tags.add(tag));
            }
        }
    });

    // 3. Analyze Imaging Results for keywords
    if (allInvestigationsText) {
        const imagingLower = allInvestigationsText;
        for (const keyword in imagingKeywordsToTagMap) {
            if (imagingLower.includes(keyword)) {
                tags.add(imagingKeywordsToTagMap[keyword]);
            }
        }
    }

    // 4. Add tags based on data presence
    // FIX: Replace separate checks for 'labs' and 'imaging' with a single check for 'investigations'.
    if (Object.keys(patientData.investigations).length > 0) {
        tags.add('Has Investigations');
    }

    return Array.from(tags);
};

