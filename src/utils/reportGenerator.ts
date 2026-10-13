
import { PatientData, Diagnosis, DoctorDetails, ReportModules, Vitals, DischargeData, ReferralData } from '../types';
import jsPDF from 'jspdf';

// Helper class for PDF generation to manage layout
class PdfWriter {
    doc: jsPDF;
    y: number;
    pageMargin: number;
    pageHeight: number;
    pageWidth: number;
    
    constructor() {
        this.doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        this.pageMargin = 15;
        this.y = this.pageMargin;
        this.pageWidth = this.doc.internal.pageSize.getWidth();
        this.pageHeight = this.doc.internal.pageSize.getHeight();
    }

    checkPageBreak(heightNeeded: number) {
        if (this.y + heightNeeded > this.pageHeight - this.pageMargin) {
            this.addPageWithHeaderFooter();
        }
    }
    
    addPageWithHeaderFooter(doctorDetails?: DoctorDetails, title?: string) {
        this.doc.addPage();
        this.y = this.pageMargin;
        if (doctorDetails && title) {
            this.addHeaderFooter(doctorDetails, title);
        }
    }
    
    addHeaderFooter(doctorDetails: DoctorDetails, title: string, addWatermark: boolean = true) {
        const totalPages = (this.doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            this.doc.setPage(i);

            // Header
            this.doc.setFontSize(9);
            this.doc.setTextColor(150);
            this.doc.text(doctorDetails.name || 'Telemedicine', this.pageMargin, 10);
            this.doc.text(title, this.pageWidth / 2, 10, { align: 'center' });
            this.doc.text(`Date: ${new Date().toLocaleDateString()}`, this.pageWidth - this.pageMargin, 10, { align: 'right' });
            this.doc.line(this.pageMargin, 12, this.pageWidth - this.pageMargin, 12);
            
            // Footer
            this.doc.text(`Page ${i} of ${totalPages}`, this.pageWidth / 2, this.pageHeight - 7, { align: 'center' });

            // Watermark
            if (addWatermark) {
                 this.doc.setFontSize(50);
                 this.doc.setTextColor(230); // Light grey
                 this.doc.text('CONFIDENTIAL', this.pageWidth / 2, this.pageHeight / 2, { align: 'center', angle: 45 });
                 this.doc.setTextColor(0);
            }
        }
        this.doc.setPage(totalPages); // return to current page
        this.y = this.pageMargin + 5; // Reset Y position after header
    }

    writeTitle(text: string) {
        this.checkPageBreak(15);
        this.doc.setFontSize(18);
        this.doc.setFont(undefined, 'bold');
        this.doc.text(text, this.pageMargin, this.y);
        this.y += 10;
        this.doc.setFont(undefined, 'normal');
    }

    writeSectionHeader(text: string) {
        this.checkPageBreak(10);
        this.doc.setFontSize(14);
        this.doc.setFont(undefined, 'bold');
        this.doc.text(text, this.pageMargin, this.y);
        this.y += 8;
        this.doc.setFont(undefined, 'normal');
    }
    
    writeSubHeader(text: string) {
        this.checkPageBreak(8);
        this.doc.setFontSize(11);
        this.doc.setFont(undefined, 'bold');
        this.doc.text(text, this.pageMargin, this.y);
        this.y += 5;
        this.doc.setFont(undefined, 'normal');
    }

    writeText(text: string | string[], indent = 0) {
        if (!text || (Array.isArray(text) && text.length === 0)) {
            text = 'N/A';
        }
        
        const maxWidth = this.doc.internal.pageSize.getWidth() - (this.pageMargin * 2) - indent;
        const textStr = Array.isArray(text) ? text.join('\n') : String(text);
        const lines = this.doc.splitTextToSize(textStr, maxWidth);
        this.checkPageBreak(lines.length * 5);
        this.doc.setFontSize(10);
        this.doc.text(lines, this.pageMargin + indent, this.y);
        this.y += lines.length * 5;
    }
    
    writeKeyValue(key: string, value: string) {
        const fullText = `${key}: ${value || 'N/A'}`;
        this.writeText(fullText);
    }
    
    addSignatureLine(signer: string) {
        this.checkPageBreak(25);
        this.y += 15;
        this.doc.line(this.pageMargin, this.y, this.pageMargin + 70, this.y);
        this.y += 5;
        this.doc.text(signer, this.pageMargin, this.y);
    }

    save(filename: string) {
        this.doc.save(filename);
    }
}

const formatVitals = (vitals: Vitals): string => {
    const parts = [
        vitals.temp && `Temp: ${vitals.temp}`,
        vitals.hr && `HR: ${vitals.hr} bpm`,
        vitals.rr && `RR: ${vitals.rr} breaths/min`,
        vitals.bp && `BP: ${vitals.bp} mmHg`,
        vitals.spo2 && `SpO2: ${vitals.spo2}%`,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' | ') : 'Not recorded.';
}

export const generateComprehensivePdf = (
    patientData: PatientData, 
    diagnoses: Diagnosis[], 
    doctorDetails: DoctorDetails,
    modules: ReportModules
) => {
    const writer = new PdfWriter();
    writer.addHeaderFooter(doctorDetails, 'Clinical Summary Report');
    writer.writeTitle('Clinical Summary Report');

    if (modules.demographics) {
        writer.writeSectionHeader('Patient Biodata');
        writer.writeKeyValue('Name', patientData.name);
        writer.writeKeyValue('Age', patientData.age);
        writer.writeKeyValue('Sex', patientData.sex);
        writer.y += 5;

        writer.writeSectionHeader('Presenting Complaints & HOPI');
        // FIX: Property 'symptoms' does not exist on type 'PatientData'. Use 'primaryComplaint' instead.
        writer.writeText(patientData.primaryComplaint);
        writer.y += 5;
    }

    if (modules.history) {
        writer.writeSectionHeader('Medical & Surgical History');
        writer.writeSubHeader('Co-morbidities (Past Medical History)');
        writer.writeText(patientData.pmh);
        writer.writeSubHeader('Past Surgical History');
        writer.writeText(patientData.psh);
        writer.writeSubHeader('Allergies');
        writer.writeText(patientData.allergies);
        writer.y += 5;

        writer.writeSectionHeader('Personal & Social History');
        writer.writeText(patientData.socialHistory);
        writer.y += 5;
    }

    if (modules.vitals || modules.findings) {
        writer.writeSectionHeader('Systemic Examination');
        if (modules.vitals) {
            writer.writeSubHeader('Vital Signs');
            writer.writeText(formatVitals(patientData.vitals));
            writer.y += 2;
        }
        if (modules.findings) {
            writer.writeSubHeader('Clinical Findings');
            writer.writeText(patientData.findings);
        }
        writer.y += 5;
    }

    // FIX: Properties 'labs' and 'imaging' do not exist on type 'PatientData'. Use 'investigations' object.
    if (modules.investigations) {
        writer.writeSectionHeader('Investigations');
        const investigationsText = Object.entries(patientData.investigations)
            .map(([key, value]) => `--- ${key} ---\n${value}`)
            .join('\n\n');
        writer.writeText(investigationsText || 'N/A');
        writer.y += 5;
    }

    if (modules.diagnoses) {
        writer.writeSectionHeader('AI-Assisted Differential Diagnosis');
        diagnoses.forEach((dx, index) => {
            writer.checkPageBreak(30);
            writer.writeSubHeader(`${index + 1}. ${dx.diagnosisName} (Likelihood: ${dx.probability}%)`);
            writer.writeText(`Supporting Evidence: ${dx.supportingEvidence.join(', ')}`);
            writer.writeText(`Recommended Tests: ${dx.recommendedTests.join(', ')}`);
            writer.y += 3;
        });
    }

    writer.y += 10;
    writer.addSignatureLine(doctorDetails.name);

    writer.save(`MediDx-Report-${patientData.name.replace(/\s/g, '_') || 'Patient'}-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateDischargeSummaryPdf = (
    patientData: PatientData,
    dischargeData: DischargeData,
    doctorDetails: DoctorDetails
) => {
    const writer = new PdfWriter();
    writer.addHeaderFooter(doctorDetails, "Discharge Summary");
    writer.writeTitle('Discharge Summary');
    
    writer.writeSectionHeader('Patient Information');
    writer.writeKeyValue('Name', patientData.name);
    writer.writeKeyValue('Age', patientData.age);
    writer.writeKeyValue('Sex', patientData.sex);
    writer.y += 5;
    
    writer.writeSectionHeader('Final Diagnosis');
    writer.writeText(dischargeData.finalDiagnosis);
    writer.y += 5;
    
    writer.writeSectionHeader('Hospital Course Summary');
    writer.writeText(dischargeData.hospitalCourse);
    writer.y += 5;
    
    writer.writeSectionHeader('Discharge Medications');
    writer.writeText(dischargeData.dischargeMedications);
    writer.y += 5;
    
    writer.writeSectionHeader('Follow-up Plan');
    writer.writeText(dischargeData.followUpPlan);
    
    writer.addSignatureLine(doctorDetails.name);

    writer.save(`Discharge-Summary-${patientData.name.replace(/\s/g, '_') || 'Patient'}.pdf`);
};

export const generateReferralPdf = (
    patientData: PatientData,
    referralData: ReferralData,
    doctorDetails: DoctorDetails
) => {
    const writer = new PdfWriter();
    writer.addHeaderFooter(doctorDetails, "Referral Letter");
    writer.writeTitle('Referral Letter');
    
    writer.writeText(`To: ${referralData.receivingDoctor}`);
    writer.writeText(`From: ${doctorDetails.name}, ${doctorDetails.role}`);
    writer.y += 5;
    
    writer.writeSectionHeader('Reason for Referral');
    writer.writeText(referralData.reasonForReferral);
    writer.y += 5;
    
    writer.writeSectionHeader('Patient Clinical Summary');
    writer.writeKeyValue('Name', patientData.name);
    writer.writeKeyValue('Age', patientData.age);
    writer.writeText(referralData.clinicalSummary);
    
    writer.addSignatureLine(doctorDetails.name);
    
    writer.save(`Referral-${patientData.name.replace(/\s/g, '_') || 'Patient'}.pdf`);
};

export const generateLamaPdf = (
    patientData: PatientData,
    doctorDetails: DoctorDetails,
    witnessName: string
) => {
    const writer = new PdfWriter();
    writer.addHeaderFooter(doctorDetails, "LAMA Form", false);
    writer.writeTitle('Leave Against Medical Advice (LAMA)');
    
    writer.writeSectionHeader('Patient Declaration');
    writer.writeText(`I, ${patientData.name || '______________________'}, hereby declare that I am leaving the facility against the advice of my treating physician, ${doctorDetails.name}.`);
    writer.writeText('I have been informed of the potential risks of my decision, which include but are not limited to: worsening of my condition, permanent disability, or death. Despite understanding these risks, I voluntarily choose to discharge myself.');
    writer.writeText('I release the medical staff and the facility from all liability for any adverse events that may result from my decision.');
    
    writer.y += 20;
    
    writer.addSignatureLine('Patient/Guardian Signature');
    writer.y += 15;
    writer.addSignatureLine('Witness Signature');
    writer.writeText(`Witness Name: ${witnessName || '______________________'}`);

    writer.save(`LAMA-Form-${patientData.name.replace(/\s/g, '_') || 'Patient'}.pdf`);
};

