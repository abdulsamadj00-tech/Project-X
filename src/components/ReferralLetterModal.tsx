import React from 'react';
import { PatientData, Diagnosis, DoctorDetails, Encounter } from '../types';
import { ClinicalReportStudioModal } from './ClinicalReportStudioModal';

interface ReferralLetterModalProps {
    onClose: () => void;
    patientData: PatientData;
    diagnoses: Diagnosis[];
    doctorDetails: DoctorDetails;
    encounter?: Encounter;
}

const ReferralLetterModal: React.FC<ReferralLetterModalProps> = ({
    onClose,
    patientData,
    diagnoses = [],
    doctorDetails,
    encounter
}) => {
    const enc: Encounter = encounter || {
        id: `ref-${Date.now()}`,
        timestamp: Date.now(),
        ownerId: 'local-clinician',
        patientData: patientData,
        provisionalDiagnoses: diagnoses,
        tags: ['Referral-Letter'],
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
            initialReportType="referral"
            initialLanguage="bilingual"
            doctorDetails={doctorDetails}
            onClose={onClose}
        />
    );
};

export default ReferralLetterModal;
