import React from 'react';
import { PatientData, Diagnosis, DoctorDetails, Encounter } from '../types';
import { ClinicalReportStudioModal } from './ClinicalReportStudioModal';

interface DischargeSummaryModalProps {
    onClose: () => void;
    patientData: PatientData;
    finalDiagnosis: Diagnosis | null;
    doctorDetails: DoctorDetails;
    encounter?: Encounter;
}

const DischargeSummaryModal: React.FC<DischargeSummaryModalProps> = ({
    onClose,
    patientData,
    finalDiagnosis,
    doctorDetails,
    encounter
}) => {
    const enc: Encounter = encounter || {
        id: `disch-${Date.now()}`,
        timestamp: Date.now(),
        ownerId: 'local-clinician',
        patientData: patientData,
        provisionalDiagnoses: finalDiagnosis ? [finalDiagnosis] : [],
        finalDiagnosis: finalDiagnosis,
        tags: ['Discharge-Summary'],
        status: 'Discharged',
        treatments: [],
        progressNotes: [],
        vitalsHistory: [],
        aiRecommendations: [],
        medicalReports: [],
        sharedWith: []
    };

    return (
        <ClinicalReportStudioModal
            encounter={enc}
            initialReportType="discharge"
            initialLanguage="bilingual"
            doctorDetails={doctorDetails}
            onClose={onClose}
        />
    );
};

export default DischargeSummaryModal;
