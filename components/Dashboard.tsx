
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
  "Consistency is the key to mastering complex concepts.",
  "Learning to code is learning how to think and solve problems.",
  "Every great developer was once a beginner who didn't give up."
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
      
      const fetchData = async () => {
        const [cls, users] = await Promise.all([
          BackendService.getClassrooms(u),
          BackendService.getAllUsers()
        ]);
        
        setClassrooms(cls || []);
        setAllUsers(users || []);
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

  const getLeaderboard = () => {
    return allUsers
      .filter(u => u.role === 'student')
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 5);
  };

  const renderStudentDashboard = () => {
    const filteredLabs = labs.filter(lab => {
        if (lab.status !== 'published') return false;
        return lab.targetGrades?.some(g => user?.grades?.includes(g));
    });
    const nextLab = filteredLabs.find(l => !submissions.some(s => s.labId === l.id && s.status === 'graded'));
    const completedSubmissions = submissions.filter(s => s.status === 'graded');
    const topStudents = getLeaderboard();

    return (
      <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
        <header className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group transition-all">
                <div className="relative z-10">
                    <p className="text-indigo-100 font-black uppercase tracking-[0.3em] text-[8px] md:text-[10px] mb-3 md:mb-4">Welcome back</p>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-4 leading-tight">Hello, {user?.name.split(' ')[0]}</h1>
                    <p className="text-indigo-100/80 text-xs md:text-sm font-medium max-w-md leading-relaxed italic">"{quote}"</p>
                    <div className="mt-6 md:mt-8 flex flex-wrap gap-4 md:gap-6 items-center">
                        <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400"><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><circle cx="12" cy="12" r="4"/></svg>
                            <div>
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/60">Attendance Streak</p>
                                <p className="text-base md:text-xl font-black">{user?.streak || 0} Days</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-300"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            <div>
                                <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-white/60">Total Score</p>
                                <p className="text-base md:text-xl font-black">{user?.points || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Next Experiment
                    </h3>
                    {nextLab ? (
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">{nextLab.title}</h2>
                                {nextLab.deadline && (
                                    <div className={`w-fit px-3 py-1 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest border ${formatDeadline(nextLab.deadline)?.style}`}>
                                        {formatDeadline(nextLab.deadline)?.text}
                                    </div>
                                )}
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium line-clamp-2">{nextLab.description}</p>
                            <button 
                                onClick={() => onSelectLab(nextLab)}
                                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] md:text-[11px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
                            >
                                Start Experiment
                            </button>
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2 text-indigo-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No pending assignments</p>
                        </div>
                    )}
                </div>
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 mt-6">
                    <div className="flex justify-between text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        <span>Course Progress</span>
                        <span>{Math.round((completedSubmissions.length / (filteredLabs.length || 1)) * 100)}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-indigo-600 transition-all duration-1000" 
                            style={{ width: `${(completedSubmissions.length / (filteredLabs.length || 1)) * 100}%` }}
                        ></div>
                    </div>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
            <section className="lg:col-span-3">
                <div className="flex items-center justify-between mb-6 md:mb-8">
                    <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                        <div className="w-1.5 h-6 md:w-2 md:h-8 bg-indigo-600 rounded-full"></div>
                        Current Lab Experiments
                    </h2>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {filteredLabs.map((lab) => {
                        const isCompleted = submissions.some(s => s.labId === lab.id && s.status === 'graded');
                        const dl = formatDeadline(lab.deadline);
                        return (
                            <div
                                key={lab.id}
                                onClick={() => onSelectLab(lab)}
                                className="group bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-all cursor-pointer relative flex flex-col min-h-[200px] shadow-sm hover:shadow-xl"
                            >
                                <div className="mb-4 flex justify-between items-start">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-2">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[7px] md:text-[8px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                                {lab.category}
                                            </span>
                                            <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded text-[7px] md:text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50">
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
                                        <div className="flex items-center gap-1.5 px-2 md:px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                                            <svg width="8" height="8" className="md:w-2.5 md:h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-tighter">Completed</span>
                                        </div>
                                    )}
                                </div>
                                
                                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">{lab.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mb-6 flex-1 line-clamp-2 font-medium">{lab.description}</p>

                                <div className="flex items-center justify-between pt-4 md:pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <div className="flex items-center gap-1.5 md:gap-2">
                                        {lab.targetGrades?.slice(0, 2).map(tg => (
                                            <span key={tg} className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">{tg}</span>
                                        ))}
                                    </div>
                                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-600 text-white' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <aside className="space-y-6 md:space-y-8">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center justify-between">
                        Top Students
                        <span className="text-indigo-600 text-[9px]">Global</span>
                    </h3>
                    <div className="space-y-6">
                        {topStudents.length > 0 ? topStudents.map((top, idx) => (
                            <div key={top.id} className="flex items-center gap-4">
                                <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'}`}>
                                    {idx + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{top.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{top.points} Academic XP</p>
                                </div>
                                <div className={`text-[10px] font-black ${idx === 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                    {idx === 0 ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7c0 3.31 2.69 6 6 6s6-2.69 6-6V2Z"/></svg> : null}
                                </div>
                            </div>
                        )) : (
                            <p className="text-[10px] text-slate-400 text-center font-bold uppercase py-4">Waiting for scores...</p>
                        )}
                    </div>
                </div>

                <div className="bg-indigo-600 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <h3 className="text-[11px] md:text-[12px] font-black uppercase tracking-widest mb-2">AI Support Assistant</h3>
                        <p className="text-[10px] md:text-xs text-indigo-100 leading-relaxed mb-6">Need help with Python concepts? Your AI tutor is available 24/7.</p>
                        <button 
                            onClick={() => setView?.('ai-tutor')}
                            className="text-[9px] md:text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white text-indigo-600 rounded-lg shadow-xl hover:bg-slate-50 transition-colors"
                        >
                            Ask AI Assistant
                        </button>
                    </div>
                </div>
            </aside>
        </div>
      </div>
    );
  };

  const renderTeacherDashboard = () => {
    const totalCompletedCount = submissions.filter(s => s.status === 'graded').length;
    const topStudents = getLeaderboard();

    return (
        <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 transition-all">
                <div>
                    <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Teacher Overview</p>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Faculty Dashboard</h1>
                    <p className="text-slate-400 text-xs md:text-sm mt-4 max-w-lg font-medium leading-relaxed">Review student progress across experiments and tests. The system automatically grades submissions based on test cases.</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <div className="flex-1 md:flex-none bg-slate-50 dark:bg-slate-800 p-4 md:p-6 rounded-3xl text-center border border-slate-100 dark:border-slate-700">
                        <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Classes</p>
                        <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{classrooms.length}</p>
                    </div>
                    <div className="flex-1 md:flex-none bg-emerald-50 dark:bg-emerald-900/30 p-4 md:p-6 rounded-3xl text-center border border-emerald-100 dark:border-emerald-800">
                        <p className="text-[8px] md:text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Passes</p>
                        <p className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">{totalCompletedCount}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 md:gap-10">
                <section className="xl:col-span-8 space-y-6 md:space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                            <div className="w-1.5 h-6 md:w-2 md:h-8 bg-emerald-500 rounded-full"></div>
                            My Classrooms
                        </h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {classrooms.map(cls => (
                            <div key={cls.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm hover:shadow-xl transition-all">
                                <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-1">{cls.name}</h3>
                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-50 dark:border-slate-800">
                                    <div>
                                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Experiments</p>
                                        <p className="text-sm font-black dark:text-white">{labs.filter(l => l.targetGrades.includes(cls.id)).length}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase">Active</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <aside className="xl:col-span-4 space-y-8">
                    <div className="bg-indigo-600 text-white rounded-[2rem] md:rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Quick Tasks</h3>
                            <button 
                                onClick={() => setView?.('manage-labs')}
                                className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all"
                            >
                                Manage Experiments
                            </button>
                            <button 
                                onClick={() => setView?.('grading')}
                                className="w-full bg-indigo-500 text-white py-4 rounded-2xl font-black text-[9px] md:text-[10px] uppercase tracking-widest border border-white/10 hover:bg-indigo-400 transition-all"
                            >
                                Review All Submissions
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 md:p-8 border border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Top Performer Ranking
                        </h3>
                        <div className="space-y-4">
                            {topStudents.map((top, idx) => (
                                <div key={top.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                                    <div className="min-w-0 flex items-center gap-3">
                                        <span className="text-[10px] font-black text-indigo-500">{idx+1}</span>
                                        <div>
                                          <p className="text-xs font-black dark:text-white truncate">{top.name}</p>
                                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate">{top.points} XP</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 px-2 py-0.5 bg-indigo-500/10 text-indigo-500 rounded text-[7px] font-black uppercase tracking-widest">Active</div>
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
        <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500">
            <header className="bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                    <div>
                        <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[8px] md:text-[10px] mb-2">System Control</p>
                        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-4">Administration</h1>
                        <p className="text-slate-400 text-xs md:text-sm font-medium max-w-md leading-relaxed">System monitoring and resource management for the TI educational network.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        <div className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] text-center backdrop-blur-md">
                            <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Classes</p>
                            <p className="text-xl md:text-2xl font-black">{classrooms.length}</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] text-center backdrop-blur-md">
                            <p className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Users</p>
                            <p className="text-xl md:text-2xl font-black">{allUsers.length}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">User Breakdown</h3>
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
                                    <div className={`h-full ${stat.color} transition-all duration-1000`} style={{ width: `${(stat.count / (allUsers.length || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Experiment Library</h3>
                            <div className="flex gap-4 mb-8">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-4 md:p-6 rounded-3xl text-center">
                                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Drafts</p>
                                    <p className="text-lg md:text-xl font-black dark:text-white">{labs.filter(l => l.status === 'draft').length}</p>
                                </div>
                                <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/20 p-4 md:p-6 rounded-3xl text-center">
                                    <p className="text-[8px] font-black text-emerald-600 uppercase mb-1">Published</p>
                                    <p className="text-lg md:text-xl font-black text-emerald-600">{labs.filter(l => l.status === 'published').length}</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => setView?.('manage-labs')}
                            className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:opacity-90 transition-all"
                        >
                            Open Experiment Manager
                        </button>
                    </div>

                    <div className="bg-indigo-600 text-white rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-6">Access Control</h3>
                            <p className="text-xs md:text-sm font-medium mb-10 leading-relaxed">Manage user credentials and classroom setup for the school year.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                            <button 
                                onClick={() => setView?.('manage-users')}
                                className="flex-1 bg-white text-indigo-600 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                            >
                                User Management
                            </button>
                            <button 
                                onClick={() => setView?.('manage-classes')}
                                className="flex-1 bg-indigo-500 text-white border border-white/10 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-400 transition-all"
                            >
                                Classrooms
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {user?.role === 'admin' ? renderAdminDashboard() : 
       user?.role === 'teacher' ? renderTeacherDashboard() : 
       renderStudentDashboard()}
    </div>
  );
};

export default Dashboard;
