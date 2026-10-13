import React from 'react';
import { Encounter } from '../types';
import { 
    BarChart3 as ChartBarIcon, 
    Users as UsersIcon, 
    ClipboardCheck as ClipboardDocumentCheckIcon, 
    Clock as ClockIcon,
    TrendingUp as ArrowTrendingUpIcon,
    TrendingDown as ArrowTrendingDownIcon,
    Activity as ActivityIcon
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    AreaChart,
    Area
} from 'recharts';
import { motion } from 'framer-motion';

interface DashboardProps {
    encounters: Encounter[];
    onSelectEncounter: (id: string) => void;
    onAddRandomCase?: (presetIndex?: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ encounters, onSelectEncounter, onAddRandomCase }) => {
    const totalCases = encounters.length;
    const activeCases = encounters.filter(e => e.status === 'Active').length;
    const completedCases = encounters.filter(e => e.status === 'Discharged').length;
    const sharedCases = encounters.filter(e => e.sharedWith && e.sharedWith.length > 0).length;

    // Prepare data for cases over time
    const casesByDate = encounters.reduce((acc: any, e) => {
        const date = new Date(e.timestamp).toLocaleDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
    }, {});

    const chartData = Object.keys(casesByDate).map(date => ({
        date,
        count: casesByDate[date]
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);

    // Prepare data for symptom severity across all active cases
    const symptomData = encounters
        .filter(e => e.status === 'Active' && e.progressNotes.length > 0)
        .map(e => ({
            name: e.patientData.name.split(' ')[0],
            severity: e.progressNotes[e.progressNotes.length - 1].symptomScore
        }))
        .slice(0, 5);

    const StatCard = ({ title, value, icon, gradientFrom, gradientTo, glowColor, trend, description }: any) => (
        <motion.div 
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-primary-100/60 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)] flex flex-col justify-between hover:shadow-[0_12px_40px_rgba(0,213,255,0.12)] transition-all duration-500 group relative overflow-hidden"
        >
            {/* Subtle gradient orb */}
            <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500`} style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}></div>
            
            <div className="flex items-center justify-between mb-6 md:mb-8 relative z-10">
                <div className={`p-4 md:p-5 rounded-xl md:rounded-2xl shadow-inner group-hover:scale-110 transition-transform duration-500`} style={{ background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}10)`, boxShadow: `0 0 20px ${glowColor}20` }}>
                    {React.cloneElement(icon, { className: `h-6 w-6 md:h-7 md:w-7`, style: { color: gradientFrom } })}
                </div>
                {trend && (
                    <div className={`flex items-center px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-[9px] md:text-[10px] font-bold tracking-[0.2em] uppercase ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {trend > 0 ? <ArrowTrendingUpIcon className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5" /> : <ArrowTrendingDownIcon className="h-3 w-3 md:h-3.5 md:w-3.5 mr-1 md:mr-1.5" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="relative z-10">
                <h3 className="text-primary-500 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] mb-1 md:mb-2 ml-1">{title}</h3>
                <div className="flex items-baseline gap-2 md:gap-3">
                    <p className="text-3xl md:text-5xl font-bold text-white tracking-tighter font-display">{value}</p>
                    {description && <span className="text-[9px] md:text-[10px] text-primary-500 font-bold uppercase tracking-widest">{description}</span>}
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="space-y-8 md:space-y-12 animate-slide-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                <StatCard title="Total Cases" value={totalCases} icon={<ClipboardDocumentCheckIcon />} gradientFrom="#00d5ff" gradientTo="#008fcc" glowColor="#00d5ff" trend={12} description="vs last month" />
                <StatCard title="Active Cases" value={activeCases} icon={<ClockIcon />} gradientFrom="#f59e0b" gradientTo="#d97706" glowColor="#f59e0b" trend={-5} description="current load" />
                <StatCard title="Completed" value={completedCases} icon={<ChartBarIcon />} gradientFrom="#10b981" gradientTo="#059669" glowColor="#10b981" trend={8} description="success rate" />
                <StatCard title="Shared Cases" value={sharedCases} icon={<UsersIcon />} gradientFrom="#ff57b0" gradientTo="#cc2c86" glowColor="#ff57b0" trend={24} description="collaboration" />
            </div>

            {/* Quick Clinical Simulation Cases */}
            <div className="bg-primary-100/70 backdrop-blur-xl p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border border-primary-300/40 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🎲</span>
                            <h3 className="text-lg md:text-xl font-bold text-primary-900 font-display">Instant Clinical Case Simulations</h3>
                        </div>
                        <p className="text-xs md:text-sm text-primary-500 font-medium mt-1">One-click realistic patient scenarios pre-populated with vitals, ESI triage, lab orders & stepwise pathways.</p>
                    </div>
                    {onAddRandomCase && (
                        <button
                            onClick={() => onAddRandomCase()}
                            className="bg-brand-500 hover:bg-brand-400 text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-brand-500/30 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest shrink-0 active:scale-95"
                        >
                            <span>🎲</span>
                            <span>Load Any Random Case</span>
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { title: 'Sepsis & CAP', patient: 'Parveen Akhtar, 68F', badge: 'ESI Level 2', color: 'border-amber-500/40 bg-amber-500/5', desc: 'CURB-65 = 3, lobar pneumonia, lactate 2.8', idx: 0 },
                        { title: 'Stroke STAT', patient: 'Muhammad Tariq, 71M', badge: 'ESI Level 1', color: 'border-rose-500/40 bg-rose-500/5', desc: 'NIHSS 16, onset 45m, thrombolysis window', idx: 1 },
                        { title: 'Panic & DSM-5', patient: 'Ayesha Siddiqa, 32F', badge: 'ESI Level 3', color: 'border-sky-500/40 bg-sky-500/5', desc: 'Acute panic episode vs ischemia, SSRI/CBT', idx: 2 },
                        { title: 'Acute Abdomen', patient: 'Hamza Farooq, 24M', badge: 'ESI Level 3', color: 'border-emerald-500/40 bg-emerald-500/5', desc: 'Appendicitis, McBurney sign, surgical prep', idx: 3 },
                    ].map((c) => (
                        <button
                            key={c.idx}
                            onClick={() => onAddRandomCase && onAddRandomCase(c.idx)}
                            className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] active:scale-95 hover:border-brand-500/60 flex flex-col justify-between ${c.color}`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary-400">{c.title}</span>
                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary-200/60 text-primary-900 border border-primary-300/40">{c.badge}</span>
                                </div>
                                <h4 className="text-sm font-bold text-primary-900 mb-1">{c.patient}</h4>
                                <p className="text-[11px] text-primary-500 line-clamp-2">{c.desc}</p>
                            </div>
                            <span className="text-[10px] font-bold text-brand-400 mt-3 flex items-center gap-1">Load Case ➔</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 bg-primary-100/60 backdrop-blur-xl p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,213,255,0.1)] transition-all duration-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 md:mb-10 gap-4">
                        <div>
                            <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center font-display">
                                <div className="w-1.5 h-6 md:h-8 bg-brand-500 rounded-full mr-3 md:mr-4 shadow-[0_0_12px_rgba(0,213,255,0.5)]"></div>
                                Patient Flow Analysis
                            </h3>
                            <p className="text-primary-500 text-xs md:text-sm mt-1 md:mt-2 font-medium">Daily case volume trends for the past week</p>
                        </div>
                        <div className="flex gap-2 bg-primary-200/60 p-1 rounded-xl md:rounded-2xl border border-primary-300/30 w-fit">
                            <button className="px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl bg-primary-300/50 text-brand-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest shadow-sm transition-all border border-primary-400/20">7 Days</button>
                            <button className="px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-primary-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest hover:bg-primary-300/30 hover:text-primary-700 transition-all">30 Days</button>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00d5ff" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#00d5ff" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#232a3f" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#556385'}} dy={15} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#556385'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '24px', border: '1px solid #232a3f', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', padding: '20px', background: '#141824' }}
                                    itemStyle={{ fontWeight: 800, fontSize: '16px', color: '#00d5ff' }}
                                    labelStyle={{ fontWeight: 700, fontSize: '10px', color: '#556385', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '8px' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#00d5ff" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-primary-100/60 backdrop-blur-xl p-6 md:p-10 rounded-2xl md:rounded-[3rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.1)] transition-all duration-500">
                    <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight mb-8 md:mb-10 flex items-center font-display">
                        <div className="w-1.5 h-6 md:h-8 bg-amber-500 rounded-full mr-3 md:mr-4 shadow-[0_0_12px_rgba(245,158,11,0.5)]"></div>
                        Severity Index
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={symptomData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#232a3f" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 700, fill: '#9da8c4'}} width={80} />
                                <Tooltip 
                                    cursor={{fill: '#1a2030', radius: 12}}
                                    contentStyle={{ borderRadius: '24px', border: '1px solid #232a3f', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.5)', background: '#141824' }}
                                />
                                <Bar dataKey="severity" fill="#f59e0b" radius={[0, 12, 12, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-primary-100/60 backdrop-blur-xl rounded-2xl md:rounded-[3rem] border border-primary-300/30 shadow-[0_8px_30px_rgb(0,0,0,0.3)] overflow-hidden hover:shadow-[0_12px_40px_rgba(0,213,255,0.08)] transition-all duration-700">
                <div className="p-6 md:p-10 border-b border-primary-300/30 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-primary-200/30 gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight font-display">Recent Patient Activity</h3>
                        <p className="text-primary-500 text-xs md:text-sm mt-1 md:mt-2 font-medium">Latest case updates and clinician interactions</p>
                    </div>
                    <button className="px-5 md:px-6 py-2.5 md:py-3 bg-primary-200/50 border border-primary-300/40 rounded-xl md:rounded-2xl text-[10px] font-bold uppercase tracking-widest text-primary-700 hover:bg-primary-300/50 hover:text-brand-400 hover:border-brand-500/30 transition-all">View All Records</button>
                </div>
                <div className="divide-y divide-primary-300/20">
                    {encounters.slice(0, 5).map((encounter) => (
                        <div 
                            key={encounter.id} 
                            onClick={() => onSelectEncounter(encounter.id)}
                            className="p-5 md:p-8 hover:bg-brand-500/5 transition-all cursor-pointer flex items-center justify-between group"
                        >
                            <div className="flex items-center space-x-4 md:space-x-6">
                                <div className="h-12 w-12 md:h-16 md:w-16 rounded-xl md:rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-xl md:text-2xl shadow-sm group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(0,213,255,0.2)] transition-all duration-500">
                                    {encounter.patientData.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-base md:text-xl group-hover:text-brand-400 transition-colors duration-500 font-display">{encounter.patientData.name}</p>
                                    <p className="text-xs md:text-sm text-primary-500 font-medium mt-0.5 md:mt-1">{encounter.patientData.primaryComplaint}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2 md:gap-3">
                                <p className="text-[10px] font-bold text-primary-500 uppercase tracking-[0.3em]">
                                    {new Date(encounter.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                    encounter.status === 'Active' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                    {encounter.status}
                                </span>
                            </div>
                        </div>
                    ))}
                    {encounters.length === 0 && (
                        <div className="p-12 md:p-20 text-center">
                            <ActivityIcon className="h-12 w-12 text-primary-400 mx-auto mb-4 animate-float" />
                            <p className="text-primary-600 font-bold text-lg">No patient activity yet</p>
                            <p className="text-primary-500 text-sm mt-2">Create your first case to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

