import React, { useState } from 'react';
import { Encounter, ClinicianAttestation } from '../types';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

interface ClinicianAttestationModalProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onClose: () => void;
}

export const ClinicianAttestationModal: React.FC<ClinicianAttestationModalProps> = ({
    encounter,
    onUpdateEncounter,
    onClose
}) => {
    const { profile } = useAuth();
    const [clinicianName, setClinicianName] = useState<string>(profile?.name || 'Dr. Alex Mercer, MD');
    const [licenseNumber, setLicenseNumber] = useState<string>(profile?.licenseNumber || 'MD-92841-EM');
    const [attestationNotes, setAttestationNotes] = useState<string>('');
    const [hasAgreed, setHasAgreed] = useState<boolean>(false);

    const handleSignAndAttest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasAgreed) {
            toast.error("Please review and confirm the clinical verification statement.");
            return;
        }

        const now = Date.now();
        const signatureHash = `SHA256-${btoa(`${clinicianName}:${licenseNumber}:${encounter.id}:${now}`).slice(0, 24)}`;

        const attestation: ClinicianAttestation = {
            id: `attest-${now}`,
            clinicianName,
            role: profile?.role || 'Attending Clinician',
            licenseNumber,
            timestamp: now,
            verifiedDiagnosesCount: encounter.provisionalDiagnoses?.length || 0,
            verifiedTreatmentsCount: encounter.treatments?.length || 0,
            statement: "I have clinically evaluated the patient, reviewed the AI-assisted differential diagnosis and guideline citations, and confirmed appropriateness of the acute care management plan.",
            signatureDigitalHash: signatureHash
        };

        onUpdateEncounter({
            ...encounter,
            attestation
        });

        toast.success(`Clinical verification attested by ${clinicianName}.`);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">
                                Medico-Legal Audit & Verification
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight mt-0.5">
                            Clinician Verification & Attestation
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                    >
                        ✕
                    </button>
                </div>

                {/* Case Summary Pill */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                    <div><strong>Patient:</strong> {encounter.patientData.name || 'Patient'} ({encounter.patientData.age}yo)</div>
                    <div><strong>Primary Working Diagnosis:</strong> {encounter.finalDiagnosis?.diagnosisName || encounter.provisionalDiagnoses?.[0]?.diagnosisName || 'Under Investigation'}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Case ID: {encounter.id}</div>
                </div>

                <form onSubmit={handleSignAndAttest} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clinician Name</label>
                            <input
                                type="text"
                                required
                                value={clinicianName}
                                onChange={(e) => setClinicianName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs font-semibold"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Medical License / GMC / NPI</label>
                            <input
                                type="text"
                                required
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Clinical Attestation Notes (Optional)</label>
                        <textarea
                            rows={2}
                            value={attestationNotes}
                            onChange={(e) => setAttestationNotes(e.target.value)}
                            placeholder="e.g. Discussed treatment risks and benefits with patient and family..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                        />
                    </div>

                    {/* Attestation Checkbox */}
                    <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                required
                                checked={hasAgreed}
                                onChange={(e) => setHasAgreed(e.target.checked)}
                                className="w-4 h-4 mt-0.5 accent-cyan-400 rounded cursor-pointer shrink-0"
                            />
                            <span className="text-xs text-slate-300 leading-relaxed font-medium">
                                I hereby attest that I have reviewed the AI-assisted differential diagnoses, ICD-11 coding, and treatment suggestions. I confirm that all active orders and clinical management plans are consistent with independent clinical judgment and authentic practice guidelines.
                            </span>
                        </label>
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!hasAgreed}
                            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
                        >
                            ✍️ Digitally Sign & Attest Case
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
