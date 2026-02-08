
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import LabModule from './components/LabModule.tsx';
import Login from './components/Login.tsx';
import TeacherGrading from './components/TeacherGrading.tsx';
import ManageLabs from './components/ManageLabs.tsx';
import ManageUsers from './components/ManageUsers.tsx';
import ManageClasses from './components/ManageClasses.tsx';
import ManageAssessments from './components/ManageAssessments.tsx';
import PythonCompiler from './components/PythonCompiler.tsx';
import AITutor from './components/AITutor.tsx';
import ProfileSetup from './components/ProfileSetup.tsx';
import LabHub from './components/LabHub.tsx';
import AssessmentModule from './components/AssessmentModule.tsx';
import { View, LabExperiment, User, Assessment } from './types.ts';
import { LAB_EXPERIMENTS as INITIAL_LABS } from './constants.tsx';
import { BackendService } from './services/backend.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedLab, setSelectedLab] = useState<{lab: LabExperiment, classId?: string} | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<{assessment: Assessment, classId: string} | null>(null);
  const [labs, setLabs] = useState<LabExperiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('ti_moodle_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ti_moodle_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ti_moodle_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const unsubAuth = BackendService.onAuth((u) => {
      setUser(u);
      setIsLoading(false);
      if (u) initLabs(u);
    });

    const initLabs = async (currentUser: User) => {
        try {
            const remoteLabs = await BackendService.getLabs();
            if (remoteLabs.length > 0) {
                setLabs(remoteLabs);
            } else if (currentUser.role === 'admin' || currentUser.role === 'teacher') {
                await BackendService.syncCustomLabs(INITIAL_LABS);
                setLabs(INITIAL_LABS);
            } else {
                setLabs(INITIAL_LABS);
            }
        } catch (e) {
            setLabs(INITIAL_LABS);
        }
    };

    return () => unsubAuth();
  }, []);

  const handleLogin = (u: User) => {
    setUser(u);
    setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    if (currentView === 'assessment') {
      if (!window.confirm("Test In Progress: Log out now? This will trigger an automatic submission.")) return;
      window.dispatchEvent(new CustomEvent('force-assessment-submit'));
      // The actual logout will happen after the assessment finishes and redirects
      return;
    }
    await BackendService.logout();
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleViewChange = (newView: View, force = false) => {
    // SECURITY GUARD: If leaving assessment, we must submit first
    if (currentView === 'assessment' && newView !== 'assessment' && !force) {
      const confirmSubmit = window.confirm("You are currently in a proctored assessment. Navigating away will terminate the session and submit your progress. Continue?");
      if (!confirmSubmit) return;
      
      // Dispatch force-submit event to AssessmentModule
      window.dispatchEvent(new CustomEvent('force-assessment-submit'));
      // Wait for AssessmentModule to call onBack(true) which calls handleViewChange(..., true)
      return; 
    }

    setCurrentView(newView);
    if (newView !== 'lab' && newView !== 'assessment') {
      setSelectedLab(null);
      setSelectedAssessment(null);
    }
  };

  const handleSelectLab = (lab: LabExperiment, classId?: string) => {
    setSelectedLab({ lab, classId });
    setCurrentView('lab');
  };

  const handleSelectAssessment = (assessment: Assessment) => {
    // Find a valid class ID the user is in that targets this assessment
    const validClassId = user?.grades?.find(gId => assessment.targetGrades.includes(gId)) || 'default';
    setSelectedAssessment({ assessment, classId: validClassId });
    setCurrentView('assessment');
  };

  const handleSaveLab = async (savedLab: LabExperiment) => {
    setLabs(prev => {
      const idx = prev.findIndex(l => l.id === savedLab.id);
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = savedLab;
        return updated;
      }
      return [...prev, savedLab];
    });
    try { await BackendService.saveLab(savedLab); } catch (e) { console.error(e); }
  };

  const handleDeleteLab = async (labId: string) => {
    const previousLabs = [...labs];
    setLabs(prev => prev.filter(l => l.id !== labId));
    try { await BackendService.deleteLab(labId); } catch (e) { setLabs(previousLabs); }
  };

  const handleOnboardingComplete = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('ti_moodle_user', JSON.stringify(updatedUser));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-8">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center font-black text-4xl text-white animate-bounce shadow-2xl">TI</div>
        <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Syncing Systems...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />;
  }

  if (user.isFirstLogin) {
    return <ProfileSetup user={user} onComplete={handleOnboardingComplete} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onSelectLab={(l) => handleSelectLab(l)} labs={labs} setView={handleViewChange} />;
      case 'lab-hub':
        return <LabHub user={user} labs={labs} onSelectLab={handleSelectLab} onSelectAssessment={handleSelectAssessment} />;
      case 'compiler':
        return <PythonCompiler />;
      case 'ai-tutor':
        return <AITutor />;
      case 'lab':
        if (selectedLab) return <LabModule lab={selectedLab.lab} classId={selectedLab.classId} user={user} onBack={() => handleViewChange('lab-hub')} />;
        return <LabHub user={user} labs={labs} onSelectLab={handleSelectLab} onSelectAssessment={handleSelectAssessment} />;
      case 'assessment':
        if (selectedAssessment) return (
            <AssessmentModule 
                assessment={selectedAssessment.assessment} 
                user={user} 
                classId={selectedAssessment.classId} 
                onBack={(force) => handleViewChange('lab-hub', force)} 
            />
        );
        return <LabHub user={user} labs={labs} onSelectLab={handleSelectLab} onSelectAssessment={handleSelectAssessment} />;
      case 'grading':
        return <TeacherGrading />;
      case 'manage-labs':
        return <ManageLabs labs={labs} onAddLab={handleSaveLab} onDeleteLab={handleDeleteLab} />;
      case 'manage-assessments':
        return <ManageAssessments />;
      case 'manage-users':
        return <ManageUsers />;
      case 'manage-classes':
        return <ManageClasses />;
      case 'profile':
        return (
            <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
                <header className="flex flex-col md:flex-row items-center gap-10">
                    <div className="w-48 h-48 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[3.5rem] shadow-2xl flex items-center justify-center text-7xl transform -rotate-2 border-4 border-white dark:border-slate-800 transition-transform hover:rotate-0">
                        {user.avatar || '👨‍🎓'}
                    </div>
                    <div className="space-y-4 text-center md:text-left">
                        <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px]">Academic Portfolio</p>
                        <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{user.name}</h1>
                        <span className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">{user.role}</span>
                    </div>
                </header>
                <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">Biography</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium text-lg">
                        {user.bio || "No biography provided."}
                    </p>
                </div>
            </div>
        );
      default:
        return <Dashboard onSelectLab={(l) => handleSelectLab(l)} labs={labs} setView={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        setView={handleViewChange} 
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1 ml-64 p-10 min-w-0 overflow-y-auto h-screen relative scrollbar-thin">
        <div className="fixed top-6 right-10 flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-800 z-50 shadow-xl transition-colors">
           <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
             {isDarkMode ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg> : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>}
           </button>
           <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700"></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{user.username}</span>
        </div>
        <div className="pt-8">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
