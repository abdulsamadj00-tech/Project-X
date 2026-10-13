import React from 'react';
import { PatientData, Diagnosis, DoctorDetails, ReportModules, Encounter } from '../types';
import { ClinicalReportStudioModal } from './ClinicalReportStudioModal';

interface GenerateReportModalProps {
    onClose: () => void;
    onGenerate?: (doctorDetails: DoctorDetails, modules: ReportModules) => void;
    patientData: PatientData;
    diagnoses?: Diagnosis[];
    initialDoctorDetails: DoctorDetails;
    encounter?: Encounter;
}

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
    onClose,
    patientData,
    diagnoses = [],
    initialDoctorDetails,
    encounter
}) => {
    const enc: Encounter = encounter || {
        id: `rep-${Date.now()}`,
        timestamp: Date.now(),
        ownerId: 'local-clinician',
        patientData: patientData,
        provisionalDiagnoses: diagnoses,
        tags: ['Clinical-Report'],
        status: 'Active',
        finalDiagnosis: null,
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
            initialReportType="comprehensive"
            initialLanguage="bilingual"
            doctorDetails={initialDoctorDetails}
            onClose={onClose}
        />
    );
};

export default GenerateReportModal;
