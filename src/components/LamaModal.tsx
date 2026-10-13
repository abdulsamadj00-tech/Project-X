import React from 'react';
import { PatientData, DoctorDetails, Encounter } from '../types';
import { ClinicalReportStudioModal } from './ClinicalReportStudioModal';

interface LamaModalProps {
    onClose: () => void;
    patientData: PatientData;
    doctorDetails: DoctorDetails;
    encounter?: Encounter;
}

const LamaModal: React.FC<LamaModalProps> = ({ onClose, patientData, doctorDetails, encounter }) => {
    const enc: Encounter = encounter || {
        id: `lama-${Date.now()}`,
        timestamp: Date.now(),
        ownerId: 'local-clinician',
        patientData: patientData,
        provisionalDiagnoses: [],
        tags: ['LAMA', 'Informed-Refusal'],
        status: 'Discharged',
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
            initialReportType="lama"
            initialLanguage="bilingual"
            doctorDetails={doctorDetails}
            onClose={onClose}
        />
    );
};

export default LamaModal;
