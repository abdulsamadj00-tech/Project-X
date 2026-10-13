
import React, { useMemo } from 'react';
import { Encounter } from '../types';
import { CheckCircleIcon, ExclamationCircleIcon, ShieldExclamationIcon, ChartBarIcon } from './icons';
import { motion } from 'framer-motion';

interface SystemAuditProps {
  encounters: Encounter[];
  onClose: () => void;
}

const SystemAudit: React.FC<SystemAuditProps> = ({ encounters, onClose }) => {
  const auditResults = useMemo(() => {
    if (encounters.length === 0) return null;

    const totalEncounters = encounters.length;
    let totalScore = 0;
    const details = encounters.map(enc => {
      let score = 100;
      const issues: string[] = [];

      // Check Triage
      if (!enc.patientData.vitals.temp || !enc.patientData.vitals.bp || !enc.patientData.vitals.hr) {
        score -= 10;
        issues.push('Incomplete vitals in Triage');
      }

      // Check History
      if (!enc.patientData.primaryComplaint) {
        score -= 10;
        issues.push('No presenting complaints recorded');
      }

      // Check Diagnosis
      if (!enc.finalDiagnosis) {
        score -= 20;
        issues.push('No final diagnosis set');
      }

      // Check Treatments & Guidelines
      if (enc.treatments.length === 0) {
        score -= 10;
        issues.push('No treatment plan recorded');
      } else {
        const nonAdherent = enc.treatments.filter(t => !t.guidelineFollowed);
        if (nonAdherent.length > 0) {
          score -= (nonAdherent.length * 5);
          issues.push(`${nonAdherent.length} treatment(s) deviate from guidelines`);
        }
      }

      totalScore += Math.max(0, score);
      return { id: enc.id, score: Math.max(0, score), issues, patientName: enc.patientData.name };
    });

    const averageScore = Math.round(totalScore / totalEncounters);

    return {
      averageScore,
      details,
      totalEncounters
    };
  }, [encounters]);

  if (!auditResults) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-primary-100 rounded-2xl md:rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 max-h-[90vh] flex flex-col"
      >
        <div className="bg-primary-900 p-6 md:p-8 text-white flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="flex items-center relative z-10">
            <div className="bg-primary-100/10 p-2.5 md:p-3 rounded-xl md:rounded-2xl backdrop-blur-md mr-3 md:mr-4 border border-white/10">
              <ChartBarIcon className="h-5 w-5 md:h-6 md:w-6 text-primary-300" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black tracking-tight">System Quality Audit</h2>
              <p className="text-primary-300 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] mt-1">Real-time Clinical Performance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors relative z-10 p-2 hover:bg-primary-100/10 rounded-xl">
            <svg className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-10">
            <div className="bg-slate-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-inner">
              <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2">Overall Quality Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">{auditResults.averageScore}</span>
                <span className="text-slate-400 font-bold text-xs md:text-sm">/ 100</span>
              </div>
            </div>
            <div className="bg-slate-50 p-5 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-inner">
              <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-1 md:mb-2">Total Encounters</p>
              <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">{auditResults.totalEncounters}</p>
            </div>
          </div>

          <h3 className="text-[10px] md:text-sm font-black text-slate-900 mb-4 md:mb-6 flex items-center uppercase tracking-widest">
            <ShieldExclamationIcon className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3 text-brand-500" />
            Clinical Documentation Breakdown
          </h3>

          <div className="space-y-3 md:space-y-4">
            {auditResults.details.map(detail => (
              <div key={detail.id} className="p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 bg-primary-100 hover:border-primary-100 hover:bg-primary-50/30 transition-all group">
                <div className="flex justify-between items-center mb-3 md:mb-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors text-sm md:text-base">
                      {detail.patientName.charAt(0)}
                    </div>
                    <span className="font-black text-slate-800 text-base md:text-lg truncate max-w-[120px] md:max-w-none">{detail.patientName}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] md:text-[10px] font-bold uppercase tracking-widest ${
                    detail.score > 80 ? 'bg-green-100 text-green-700' : 
                    detail.score > 50 ? 'bg-amber-100 text-amber-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {detail.score}% Quality
                  </span>
                </div>
                {detail.issues.length > 0 ? (
                  <ul className="space-y-1.5 md:space-y-2 ml-10 md:ml-13">
                    {detail.issues.map((issue, i) => (
                      <li key={i} className="text-[10px] md:text-xs text-slate-500 font-medium flex items-center">
                        <ExclamationCircleIcon className="h-3 w-3 md:h-3.5 md:w-3.5 mr-2 text-amber-500" />
                        {issue}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] md:text-xs text-green-600 font-bold flex items-center ml-10 md:ml-13">
                    <CheckCircleIcon className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
                    Perfect clinical documentation
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-slate-100 flex justify-end">
            <button onClick={onClose} className="w-full sm:w-auto px-8 py-3.5 md:px-10 md:py-4 bg-primary-900 text-white rounded-xl md:rounded-3xl text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-primary-800 transition-all">
              Acknowledge Audit
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SystemAudit;

