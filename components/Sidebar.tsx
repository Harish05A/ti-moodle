
import React, { useEffect, useState } from 'react';
import { View, User, Classroom } from '../types.ts';
import { BackendService } from '../services/backend.ts';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
  user: User;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isOpen?: boolean;
  setIsOpen?: (val: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  setView, 
  user, 
  onLogout, 
  isDarkMode, 
  toggleTheme,
  isOpen = false,
  setIsOpen 
}) => {
  const [assignedClassesCount, setAssignedClassesCount] = useState(0);
  const schoolLogoUrl = "https://tischool.org/wp-content/uploads/2023/11/ti-school.png";

  useEffect(() => {
    const fetchAssignments = async () => {
        if (!user || !user.id) return;
        
        if (user.role === 'teacher' || user.role === 'student') {
            try {
                const cls = await BackendService.getClassrooms(user);
                setAssignedClassesCount(cls?.length || 0);
            } catch (e) {
                console.warn("Sidebar: Could not load class assignments.");
            }
        }
    };
    fetchAssignments();
  }, [user]);

  const getMenuItems = () => {
    const common = [
      { 
        id: 'dashboard', 
        label: 'Dashboard', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      },
      {
        id: 'lab-hub',
        label: 'Courseware',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.5M14 2v7.5M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4Z"/><path d="M7 21h10"/></svg>
      },
      { 
        id: 'compiler', 
        label: 'Coding Lab', 
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
      },
      {
        id: 'ai-tutor',
        label: 'AI Faculty',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
      }
    ];

    if (user.role === 'student') {
      return [...common, { id: 'profile', label: 'Academic Bio', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> }];
    }

    if (user.role === 'teacher') {
      return [
        ...common,
        { id: 'manage-classes', label: 'Roster', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg> },
        { id: 'manage-assessments', label: 'Exams', isSoon: true, icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
        { id: 'grading', label: 'Assessment Hub', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
        { id: 'manage-labs', label: 'Experiments', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121(0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
      ];
    }

    if (user.role === 'admin') {
      return [
        ...common,
        { id: 'manage-classes', label: 'Classrooms', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg> },
        { id: 'manage-users', label: 'Identity Mgmt', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
        { id: 'manage-assessments', label: 'Examination', isSoon: true, icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
        { id: 'manage-labs', label: 'Practical Lib', icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
      ];
    }

    return common;
  };

  return (
    <>
      <div 
        className={`lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen?.(false)}
      />

      <aside className={`w-64 bg-white dark:bg-slate-900 h-screen text-slate-900 dark:text-white p-6 flex flex-col fixed left-0 top-0 z-50 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <img 
              src={schoolLogoUrl} 
              alt="TI School Logo" 
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-xl font-black tracking-tight">TI Moodle</h1>
          </div>
          <button 
            onClick={() => setIsOpen?.(false)}
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto scrollbar-thin">
          {getMenuItems().map((item: any) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all relative ${
                currentView === item.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                  : 'text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="font-bold text-[11px] uppercase tracking-widest text-left">{item.label}</span>
              {item.isSoon && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[7px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-indigo-500/10 text-indigo-500 rounded border border-indigo-500/20">Soon</span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 space-y-4">
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {isDarkMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
            <span className="font-bold text-[10px] uppercase tracking-widest">{isDarkMode ? 'Day Mode' : 'Night Mode'}</span>
          </button>

          <div 
            onClick={() => setView('profile')}
            className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center gap-3 cursor-pointer group hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors"
          >
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-xs font-black uppercase text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black truncate text-slate-900 dark:text-white">{user.name}</p>
              <div className="flex flex-col">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">
                    {user.role} {user.role !== 'admin' && `(${assignedClassesCount} Classes)`}
                </p>
              </div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-400 hover:text-red-600 transition-colors text-[9px] font-black uppercase tracking-widest"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Exit Portal
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
