import React, { useState, useEffect } from 'react';
import { Encounter, LabTestOrder, LabCategory, LabStatus } from '../types';
import { generateRecommendedLabs } from '../services/geminiService';
import { toast } from 'sonner';

interface LabTestTrackerViewProps {
    encounter: Encounter;
    onUpdateEncounter: (encounter: Encounter) => void;
    onNext?: () => void;
}

const CATEGORIES: LabCategory[] = [
    'Biomarkers',
    'Hematology',
    'Chemistry & Metabolic',
    'Coagulation',
    'Blood Gas & Acid-Base',
    'Microbiology',
    'Imaging & ECG',
    'Other'
];

const PRESET_PANELS = [
    { name: "Serial hs-Troponin I", category: 'Biomarkers' as LabCategory, unit: "ng/L", range: "< 14.0 ng/L" },
    { name: "Complete Blood Count (CBC)", category: 'Hematology' as LabCategory, unit: "x10^9/L", range: "WBC: 4.0 - 11.0" },
    { name: "Comprehensive Metabolic Panel (CMP)", category: 'Chemistry & Metabolic' as LabCategory, unit: "mg/dL", range: "Cr: 0.7 - 1.2" },
    { name: "Coagulation Profile (PT/INR/aPTT)", category: 'Coagulation' as LabCategory, unit: "sec", range: "INR: 0.9 - 1.1" },
    { name: "Serum Lactate STAT", category: 'Blood Gas & Acid-Base' as LabCategory, unit: "mmol/L", range: "0.5 - 2.0" },
    { name: "Blood Cultures x 2 Sets", category: 'Microbiology' as LabCategory, unit: "", range: "No growth at 48h" },
    { name: "12-Lead Diagnostic ECG", category: 'Imaging & ECG' as LabCategory, unit: "", range: "Normal sinus rhythm" },
    { name: "Portable Chest X-Ray", category: 'Imaging & ECG' as LabCategory, unit: "", range: "Clear lung fields" },
];

const LabTestTrackerView: React.FC<LabTestTrackerViewProps> = ({ encounter, onUpdateEncounter, onNext }) => {
    const [orders, setOrders] = useState<LabTestOrder[]>(encounter.labTracker || []);
    const [selectedCategory, setSelectedCategory] = useState<LabCategory | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
    const [editingResultId, setEditingResultId] = useState<string | null>(null);
    const [resultValueInput, setResultValueInput] = useState<string>('');
    const [isCriticalInput, setIsCriticalInput] = useState<boolean>(false);
    const [criticalMessageInput, setCriticalMessageInput] = useState<string>('');

    // New order state
    const [newTestName, setNewTestName] = useState<string>('');
    const [newCategory, setNewCategory] = useState<LabCategory>('Biomarkers');
    const [newUnit, setNewUnit] = useState<string>('');
    const [newRange, setNewRange] = useState<string>('');

    useEffect(() => {
        if (!encounter.labTracker || encounter.labTracker.length === 0) {
            handleAutoGenerate();
        }
    }, [encounter.patientData]);

    const handleAutoGenerate = async () => {
        try {
            const initialLabs = await generateRecommendedLabs(
                encounter.patientData,
                encounter.finalDiagnosis || encounter.provisionalDiagnoses?.[0]
            );
            setOrders(initialLabs);
            onUpdateEncounter({ ...encounter, labTracker: initialLabs });
        } catch (e) {
            console.warn("Lab generation error:", e);
        }
    };

    const updateOrderStatus = (id: string, status: LabStatus) => {
        const updated = orders.map(o => {
            if (o.id === id) {
                return {
                    ...o,
                    status,
                    resultedAt: (status === 'Resulted' || status === 'Critical Flag') && !o.resultedAt ? Date.now() : o.resultedAt
                };
            }
            return o;
        });
        setOrders(updated);
        onUpdateEncounter({ ...encounter, labTracker: updated });
        toast.info(`Test status updated to: ${status}`);
    };

    const handleOpenResultModal = (order: LabTestOrder) => {
        setEditingResultId(order.id);
        setResultValueInput(order.resultValue || '');
        setIsCriticalInput(!!order.isCritical);
        setCriticalMessageInput(order.criticalAlertMessage || '');
    };

    const handleSaveResult = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingResultId) return;

        const updated = orders.map(o => {
            if (o.id === editingResultId) {
                const isCrit = isCriticalInput;
                return {
                    ...o,
                    resultValue: resultValueInput,
                    status: (isCrit ? 'Critical Flag' : 'Resulted') as LabStatus,
                    isAbnormal: isCrit || (resultValueInput.trim().length > 0 && !resultValueInput.toLowerCase().includes('normal')),
                    isCritical: isCrit,
                    criticalAlertMessage: isCrit ? (criticalMessageInput || 'CRITICAL PANIC VALUE ALERT') : undefined,
                    resultedAt: Date.now()
                };
            }
            return o;
        });

        setOrders(updated);
        onUpdateEncounter({ ...encounter, labTracker: updated });
        setEditingResultId(null);
        toast.success("Lab test result recorded.");
    };

    const handleCreateOrder = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTestName.trim()) return;

        const order: LabTestOrder = {
            id: `lab-${Date.now()}`,
            testName: newTestName,
            category: newCategory,
            orderedAt: Date.now(),
            status: 'Ordered',
            unit: newUnit,
            referenceRange: newRange
        };

        const updated = [order, ...orders];
        setOrders(updated);
        onUpdateEncounter({ ...encounter, labTracker: updated });
        setIsOrderModalOpen(false);
        setNewTestName('');
        setNewUnit('');
        setNewRange('');
        toast.success(`Order placed: ${order.testName}`);
    };

    const handleQuickOrderPreset = (preset: typeof PRESET_PANELS[0]) => {
        const order: LabTestOrder = {
            id: `lab-${Date.now()}`,
            testName: preset.name,
            category: preset.category,
            orderedAt: Date.now(),
            status: 'Ordered',
            unit: preset.unit,
            referenceRange: preset.range
        };
        const updated = [order, ...orders];
        setOrders(updated);
        onUpdateEncounter({ ...encounter, labTracker: updated });
        toast.success(`Quick Order placed: ${preset.name}`);
    };

    const criticalOrders = orders.filter(o => o.isCritical || o.status === 'Critical Flag');
    const filteredOrders = orders.filter(o => {
        const matchesCategory = selectedCategory === 'All' || o.category === selectedCategory;
        const matchesSearch = o.testName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (o.resultValue && o.resultValue.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Header / Active Panic Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-cyan-400 font-mono text-[11px] uppercase tracking-widest font-black">
                                Diagnostic Investigation & Laboratory Tracking Board
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 text-xs font-mono">{orders.length} Total Orders</span>
                        </div>
                        <h2 className="text-2xl md:text-4xl font-black text-white font-display tracking-tight">
                            Lab & Test Trackers
                        </h2>
                        <p className="text-xs md:text-sm text-slate-400 mt-1">
                            Live tracking across Order ➔ Collection ➔ Laboratory Analysis ➔ Result Verification
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsOrderModalOpen(true)}
                            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
                        >
                            + Order New Test
                        </button>
                    </div>
                </div>

                {/* Critical Panic Value Banner */}
                {criticalOrders.length > 0 && (
                    <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/60 text-rose-200 mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl animate-pulse">🚨</span>
                            <div>
                                <div className="text-xs font-black uppercase tracking-wider text-rose-400">
                                    CRITICAL PANIC VALUE ALERT ({criticalOrders.length} Findings)
                                </div>
                                <div className="text-xs text-rose-200 font-medium">
                                    {criticalOrders.map(c => `${c.testName}: ${c.resultValue || 'Flagged'}`).join(" | ")}
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono uppercase bg-rose-500 text-slate-950 font-black px-3 py-1 rounded-lg shrink-0">
                            Immediate Provider Review Required
                        </span>
                    </div>
                )}

                {/* Search & Category Filter */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search orders, biomarkers, results..."
                            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-400"
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <button
                            onClick={() => setSelectedCategory('All')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                                selectedCategory === 'All'
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                                    : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
                            }`}
                        >
                            All Tests ({orders.length})
                        </button>
                        {CATEGORIES.map(cat => {
                            const count = orders.filter(o => o.category === cat).length;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
                                        selectedCategory === cat
                                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                                            : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:text-white'
                                    }`}
                                >
                                    {cat} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Quick Order Presets Carousel */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                    ⚡ Quick Order Hospital Emergency Panels:
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {PRESET_PANELS.map((p, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleQuickOrderPreset(p)}
                            className="whitespace-nowrap bg-slate-800 hover:bg-slate-700/80 text-cyan-400 hover:text-cyan-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
                        >
                            + {p.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders Feed */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-2xl text-slate-500 text-sm">
                        No laboratory or diagnostic orders found matching your search.
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const isResulted = order.status === 'Resulted' || order.status === 'Critical Flag';
                        return (
                            <div
                                key={order.id}
                                className={`p-5 md:p-6 rounded-2xl border transition-all ${
                                    order.isCritical
                                        ? 'bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-500/10'
                                        : order.isAbnormal
                                        ? 'bg-amber-950/10 border-amber-500/40'
                                        : isResulted
                                        ? 'bg-slate-900/70 border-emerald-500/30'
                                        : 'bg-slate-900/50 border-slate-800'
                                }`}
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                                                {order.category}
                                            </span>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                                                order.status === 'Critical Flag'
                                                    ? 'bg-rose-500 text-slate-950 font-black'
                                                    : order.status === 'Resulted'
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                                    : order.status === 'In Lab Processing'
                                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                                    : 'bg-slate-800 text-slate-300'
                                            }`}>
                                                Status: {order.status}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                Ordered: {new Date(order.orderedAt).toLocaleTimeString()}
                                            </span>
                                        </div>

                                        <h3 className="text-base md:text-lg font-bold text-white">
                                            {order.testName}
                                        </h3>

                                        {/* Result Display */}
                                        {order.resultValue ? (
                                            <div className="flex flex-wrap items-baseline gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Result:</span>
                                                <span className={`text-base font-black font-mono ${
                                                    order.isCritical ? 'text-rose-400' : order.isAbnormal ? 'text-amber-400' : 'text-emerald-400'
                                                }`}>
                                                    {order.resultValue} {order.unit}
                                                </span>
                                                {order.referenceRange && (
                                                    <span className="text-xs text-slate-500 font-mono">
                                                        (Ref: {order.referenceRange})
                                                    </span>
                                                )}
                                                {order.criticalAlertMessage && (
                                                    <span className="text-xs font-bold text-rose-400 block w-full mt-1">
                                                        ⚠️ {order.criticalAlertMessage}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-500 italic">
                                                Specimen pending / In laboratory queue... Ref Range: {order.referenceRange || 'Standard reference'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons: Status Pipeline & Result Entry */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <select
                                            value={order.status}
                                            onChange={(e) => updateOrderStatus(order.id, e.target.value as LabStatus)}
                                            className="bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold rounded-xl px-3 py-2"
                                        >
                                            <option value="Ordered">Ordered</option>
                                            <option value="Sample Collected">Sample Collected</option>
                                            <option value="In Lab Processing">In Lab Processing</option>
                                            <option value="Resulted">Resulted</option>
                                            <option value="Critical Flag">Critical Flag 🚨</option>
                                        </select>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenResultModal(order)}
                                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                                        >
                                            {order.resultValue ? 'Edit Result' : 'Log Result'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Log / Edit Result Modal */}
            {editingResultId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Log Laboratory Result</h3>
                            <button onClick={() => setEditingResultId(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleSaveResult} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Result Value</label>
                                <input
                                    type="text"
                                    required
                                    value={resultValueInput}
                                    onChange={(e) => setResultValueInput(e.target.value)}
                                    placeholder="e.g. 42.8 ng/L, Positive, Normal"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs font-mono"
                                />
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700">
                                <input
                                    type="checkbox"
                                    id="isCriticalCheck"
                                    checked={isCriticalInput}
                                    onChange={(e) => setIsCriticalInput(e.target.checked)}
                                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                                />
                                <label htmlFor="isCriticalCheck" className="text-xs font-bold text-rose-300 cursor-pointer">
                                    Flag as Critical Panic Value (Immediate Alert)
                                </label>
                            </div>
                            {isCriticalInput && (
                                <div>
                                    <label className="block text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Critical Clinical Message</label>
                                    <input
                                        type="text"
                                        value={criticalMessageInput}
                                        onChange={(e) => setCriticalMessageInput(e.target.value)}
                                        placeholder="e.g. Troponin elevation above 99th percentile"
                                        className="w-full bg-slate-800 border border-rose-500/60 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                            )}
                            <div className="flex justify-end gap-3 pt-3">
                                <button type="button" onClick={() => setEditingResultId(null)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
                                <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider">Save Result</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Order New Test Modal */}
            {isOrderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-md w-full space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Order Laboratory / Diagnostic Test</h3>
                            <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <form onSubmit={handleCreateOrder} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Test Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newTestName}
                                    onChange={(e) => setNewTestName(e.target.value)}
                                    placeholder="e.g. D-Dimer Quantitative, Serum Ferritin"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
                                <select
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value as LabCategory)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Unit</label>
                                    <input
                                        type="text"
                                        value={newUnit}
                                        onChange={(e) => setNewUnit(e.target.value)}
                                        placeholder="e.g. ng/mL, mmol/L"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reference Range</label>
                                    <input
                                        type="text"
                                        value={newRange}
                                        onChange={(e) => setNewRange(e.target.value)}
                                        placeholder="e.g. < 0.50 FEU"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-xs"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-3">
                                <button type="button" onClick={() => setIsOrderModalOpen(false)} className="px-4 py-2 text-xs text-slate-400">Cancel</button>
                                <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider">Place Order</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {onNext && (
                <div className="flex justify-end pt-4">
                    <button
                        onClick={onNext}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-8 py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 active:scale-95 flex items-center gap-2"
                    >
                        Proceed to Ongoing Treatments & Option Changing ➔
                    </button>
                </div>
            )}
        </div>
    );
};

export default LabTestTrackerView;
