
import React, { useState, useEffect } from 'react';
import { LabExperiment, Submission, User, Classroom, Role } from '../types';
import { BackendService } from '../services/backend';

interface DashboardProps {
  onSelectLab: (lab: LabExperiment) => void;
  labs: LabExperiment[];
  setView?: (view: any) => void;
}

const MOTIVATIONAL_QUOTES = [
  "Logic will get you from A to B. Imagination will take you everywhere. - Einstein",
  "The best way to predict the future is to code it.",
  "Your streak is your strength. Don't let the fire go out!",
  "Debugging is like being the detective in a crime movie where you are also the murderer.",
  "Coding is the closest thing we have to a superpower."
];

const Dashboard: React.FC<DashboardProps> = ({ onSelectLab, labs = [], setView }) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [quote] = useState(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

  useEffect(() => {
    const savedUser = localStorage.getItem('ti_moodle_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      
      // Load role-specific data
      const fetchData = async () => {
        const cls = await BackendService.getClassrooms(u);
        setClassrooms(cls || []);
        
        if (u.role === 'admin') {
            const users = await BackendService.getAllUsers();
            setAllUsers(users || []);
        }
      };
      fetchData();

      const unsub = BackendService.listenToSubmissions(u.role, u.id, undefined, (subs) => {
          setSubmissions(subs || []);
      });
      return () => unsub();
    }
  }, []);

  const formatDeadline = (ts?: number) => {
    if (!ts) return null;
    const isPast = Date.now() > ts;
    const isUrgent = !isPast && (ts - Date.now()) < 86400000;
    return {
      text: isPast ? 'Deadline Passed' : `Due: ${new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      style: isPast ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : isUrgent ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-400 bg-slate-50 dark:bg-slate-800'
    };
  };

  const renderStudentDashboard = () => {
    const filteredLabs = labs.filter(lab => {
        if (lab.status !== 'published') return false;
        return lab.targetGrades?.some(g => user?.grades?.includes(g));
    });
    // Next lab is the first one that is NOT 'graded'
    const nextLab = filteredLabs.find(l => !submissions.some(s => s.labId === l.id && s.status === 'graded'));
    const completedSubmissions = submissions.filter(s => s.status === 'graded');

    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <header className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group transition-all">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="relative z-10">
                <p className="text-indigo-100 font-black uppercase tracking-[0.3em] text-[10px] mb-4">Daily Academic Pulse</p>
                <h1 className="text-5xl font-black tracking-tighter mb-4">Hello, {user?.name.split(' ')[0]}!</h1>
                <p className="text-indigo-100/80 text-sm font-bold max-w-md leading-relaxed italic">"{quote}"</p>
                <div className="mt-8 flex gap-6 items-center">
                <div className="flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                    <span className="text-3xl">🔥</span>
                    <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Current Streak</p>
                    <p className="text-xl font-black">{user?.streak || 0} Days</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                    <span className="text-3xl">💎</span>
                    <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Total XP</p>
                    <p className="text-xl font-black">{user?.points || 0}</p>
                    </div>
                </div>
                </div>
            </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Recommended Mission
                    </h3>
                    {nextLab ? (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{nextLab.title}</h2>
                                {nextLab.deadline && (
                                    <div className={`w-fit px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${formatDeadline(nextLab.deadline)?.style}`}>
                                        {formatDeadline(nextLab.deadline)?.text}
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium line-clamp-2">{nextLab.description}</p>
                            <button 
                                onClick={() => onSelectLab(nextLab)}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                                Launch Experiment
                            </button>
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <span className="text-4xl block mb-2">🏆</span>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All labs completed!</p>
                        </div>
                    )}
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        <span>Course Progress</span>
                        <span>{Math.round((completedSubmissions.length / (filteredLabs.length || 1)) * 100)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-600 transition-all duration-1000 shadow-[0_0_10px_rgba(79,70,229,0.5)]" 
                            style={{ width: `${(completedSubmissions.length / (filteredLabs.length || 1)) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <section className="lg:col-span-3">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                    Lab Experiments Pipeline
                    </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredLabs.map((lab) => {
                        const isCompleted = submissions.some(s => s.labId === lab.id && s.status === 'graded');
                        const dl = formatDeadline(lab.deadline);
                        return (
                            <div
                                key={lab.id}
                                onClick={() => onSelectLab(lab)}
                                className="group bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all cursor-pointer relative flex flex-col min-h-[220px] shadow-sm hover:shadow-xl dark:hover:shadow-indigo-900/10"
                            >
                                <div className="mb-4 flex justify-between items-start">
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap gap-2">
                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[8px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                            {lab.category}
                                        </span>
                                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50">
                                            {lab.difficulty}
                                        </span>
                                    </div>
                                    {dl && (
                                        <div className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest border ${dl.style}`}>
                                            {dl.text}
                                        </div>
                                    )}
                                </div>
                                {isCompleted && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                        <span className="text-[10px] font-black uppercase tracking-tighter">Verified</span>
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                                    </div>
                                )}
                                </div>
                                
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 transition-colors line-clamp-1">{lab.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-6 flex-1 line-clamp-2 font-medium">{lab.description}</p>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                    {lab.targetGrades?.map(tg => (
                                    <span key={tg} className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">{tg}</span>
                                    ))}
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                                </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <aside className="space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                        Campus Leaderboard
                        <span className="text-indigo-600 text-[9px]">Weekly</span>
                    </h3>
                    <div className="space-y-6">
                        {[
                            { name: 'Arjun S.', points: 1450, rank: 1, avatar: '🦊' },
                            { name: 'Priya K.', points: 1220, rank: 2, avatar: '🐯' },
                            { name: 'Kevin L.', points: 1100, rank: 3, avatar: '🐼' }
                        ].map((top) => (
                            <div key={top.rank} className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-lg">{top.avatar}</div>
                                <div className="flex-1">
                                    <p className="text-xs font-black text-slate-900 dark:text-white">{top.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{top.points} XP</p>
                                </div>
                                <div className={`text-xs font-black ${top.rank === 1 ? 'text-amber-500' : 'text-slate-400'}`}>#{top.rank}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-sm font-black uppercase tracking-widest mb-2">Academic Support</h3>
                        <p className="text-xs text-indigo-100 leading-relaxed mb-6">Stuck on a nested loop? Our AI Tutor is available 24/7 to guide you through logic puzzles.</p>
                        <button className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white text-indigo-600 rounded-lg shadow-xl shadow-indigo-700/50 group-hover:scale-105 transition-transform">
                            Ask AI Assistant
                        </button>
                    </div>
                    <div className="absolute -bottom-4 -right-4 text-6xl opacity-20 transform group-hover:rotate-12 transition-transform">🤖</div>
                </div>
            </aside>
        </div>
      </div>
    );
  };

  const renderTeacherDashboard = () => {
    const totalCompletedCount = submissions.filter(s => s.status === 'graded').length;
    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 transition-all">
                <div>
                    <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Faculty Command Deck</p>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Teaching Overview</h1>
                    <p className="text-slate-400 text-sm mt-4 max-w-lg font-medium">Monitor real-time classroom progress and curriculum adoption. Grading is now automated based on verified test cases.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl text-center border border-slate-100 dark:border-slate-700">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Classrooms</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{classrooms.length}</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 p-6 rounded-3xl text-center border border-emerald-100 dark:border-emerald-800">
                        <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Total Completions</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalCompletedCount}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <section className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                            Managed Classrooms
                        </h2>
                        {setView && (
                            <button onClick={() => setView('manage-classes')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">View All</button>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {classrooms.map(cls => (
                            <div key={cls.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{cls.name}</h3>
                                <div className="flex items-center justify-between mb-6">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Active Progress</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Labs Assigned</p>
                                        <p className="text-sm font-black dark:text-white">{labs.filter(l => l.targetGrades.includes(cls.id)).length}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Success Rate</p>
                                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-tight">Verified Passes</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className="lg:col-span-4 space-y-8">
                    <div className="bg-indigo-600 text-white rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-80">Quick Actions</h3>
                            <button 
                                onClick={() => setView?.('manage-labs')}
                                className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                            >
                                New Experiment
                            </button>
                            <button 
                                onClick={() => setView?.('grading')}
                                className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-indigo-400 transition-all"
                            >
                                Results Archive
                            </button>
                        </div>
                        <div className="absolute -bottom-8 -right-8 text-9xl opacity-10">🔬</div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 border border-slate-200 dark:border-slate-800 transition-colors">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Recent Completions
                        </h3>
                        <div className="space-y-4">
                            {submissions.filter(s => s.status === 'graded').slice(0, 5).map((sub, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <div>
                                        <p className="text-xs font-black dark:text-white">{sub.userName}</p>
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{sub.labId}</p>
                                    </div>
                                    <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[7px] font-black uppercase tracking-widest">Verified</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
  };

  const renderAdminDashboard = () => {
    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <header className="bg-slate-900 dark:bg-black rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Campus Control Center</p>
                        <h1 className="text-5xl font-black tracking-tight leading-none mb-4">Infrastructure Deck</h1>
                        <p className="text-slate-400 text-sm font-medium max-w-md">System-wide performance monitoring and infrastructure orchestration.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center backdrop-blur-md">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Virtual Nodes</p>
                            <p className="text-2xl font-black">{classrooms.length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] text-center backdrop-blur-md">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Identities</p>
                            <p className="text-2xl font-black">{allUsers.length}</p>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Identity Distribution</h3>
                    <div className="space-y-6">
                        {[
                            { label: 'Students', count: allUsers.filter(u => u.role === 'student').length, color: 'bg-indigo-600' },
                            { label: 'Teachers', count: allUsers.filter(u => u.role === 'teacher').length, color: 'bg-emerald-500' },
                            { label: 'Admins', count: allUsers.filter(u => u.role === 'admin').length, color: 'bg-amber-500' }
                        ].map(stat => (
                            <div key={stat.label} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">{stat.label}</span>
                                    <span className="dark:text-white">{stat.count}</span>
                                </div>
                                <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${(stat.count / allUsers.length) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Curriculum Status</h3>
                            <div className="flex gap-4 mb-8">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Drafts</p>
                                    <p className="text-xl font-black dark:text-white">{labs.filter(l => l.status === 'draft').length}</p>
                                </div>
                                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-3xl text-center">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Live</p>
                                    <p className="text-xl font-black text-emerald-600">{labs.filter(l => l.status === 'published').length}</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setView?.('manage-labs')}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all"
                        >
                            Open Curriculum Architect
                        </button>
                    </div>

                    <div className="bg-indigo-600 text-white rounded-[2.5rem] p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] opacity-80 mb-6">Management Portal</h3>
                            <p className="text-sm font-medium mb-10 leading-relaxed">Provision new student identities or architect virtual classroom nodes for the upcoming academic session.</p>
                        </div>
                        <div className="flex gap-4 relative z-10">
                            <button 
                                onClick={() => setView?.('manage-users')}
                                className="flex-1 bg-white text-indigo-600 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Provision Users
                            </button>
                            <button 
                                onClick={() => setView?.('manage-classes')}
                                className="flex-1 bg-indigo-500 text-white border border-white/10 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-400 transition-all"
                            >
                                Classes Setup
                            </button>
                        </div>
                        <div className="absolute -bottom-10 -right-10 text-[10rem] opacity-10 group-hover:rotate-12 transition-transform">⚙️</div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-20">
      {user?.role === 'admin' ? renderAdminDashboard() : 
       user?.role === 'teacher' ? renderTeacherDashboard() : 
       renderStudentDashboard()}
    </div>
  );
};

export default Dashboard;
