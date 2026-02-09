
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

const schoolLogoUrl = "https://tischool.org/wp-content/uploads/2023/11/ti-school.png";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLab, setSelectedLab] = useState<{lab: LabExperiment, classId?: string} | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<{assessment: Assessment, classId: string} | null>(null);
  const [labs, setLabs] = useState<LabExperiment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('ti_moodle_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

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
      if (!window.confirm("An assessment is in progress. Leaving now will submit your current answers. Proceed?")) return;
      window.dispatchEvent(new CustomEvent('force-assessment-submit'));
      return;
    }
    await BackendService.logout();
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleViewChange = (newView: View, force = false) => {
    if (currentView === 'assessment' && newView !== 'assessment' && !force) {
      const confirmSubmit = window.confirm("Academic Integrity Notice: Navigating away from an active assessment will terminate your session. Continue?");
      if (!confirmSubmit) return;
      window.dispatchEvent(new CustomEvent('force-assessment-submit'));
      return; 
    }

    setCurrentView(newView);
    setIsSidebarOpen(false); 
    if (newView !== 'lab' && newView !== 'assessment') {
      setSelectedLab(null);
      setSelectedAssessment(null);
    }
    if (newView === 'profile') {
      setEditUser(user ? {...user} : null);
      setIsEditingProfile(false);
    }
  };

  const handleSelectLab = (lab: LabExperiment, classId?: string) => {
    setSelectedLab({ lab, classId });
    setCurrentView('lab');
  };

  const handleSelectAssessment = (assessment: Assessment) => {
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

  const handleProfileSave = async () => {
    if (!editUser || !user) return;
    setIsSavingProfile(true);
    try {
      await BackendService.updateAccount(user.id, {
        name: editUser.name,
        bio: editUser.bio,
        dob: editUser.dob,
        bloodGroup: editUser.bloodGroup,
        parentName: editUser.parentName,
        phone: editUser.phone,
        address: editUser.address
      });
      setUser(editUser);
      localStorage.setItem('ti_moodle_user', JSON.stringify(editUser));
      setIsEditingProfile(false);
      alert("Academic profile updated successfully.");
    } catch (e: any) {
      alert(`Save failed: ${e.message}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-8">
        <img 
          src={schoolLogoUrl} 
          alt="TI School Logo" 
          className="w-20 h-20 object-contain animate-pulse drop-shadow-[0_0_20px_rgba(79,70,229,0.4)]"
        />
        <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Synchronizing Academic Environment...</p>
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
        if (selectedAssessment) return <AssessmentModule assessment={selectedAssessment.assessment} user={user} classId={selectedAssessment.classId} onBack={(force) => handleViewChange('lab-hub', force)} />;
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
        if (!editUser) return null;
        return (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 px-4 md:px-0">
                <header className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-10 bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-32 h-32 bg-indigo-50 dark:bg-indigo-900/30 rounded-[2.5rem] shadow-sm flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-800 shrink-0">
                          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                      <div className="space-y-1 text-center md:text-left">
                          <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px]">Academic Profile</p>
                          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{user.name}</h1>
                          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.2em]">Roll No: {user.username}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => isEditingProfile ? handleProfileSave() : setIsEditingProfile(true)}
                      disabled={isSavingProfile}
                      className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${isEditingProfile ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}
                    >
                      {isSavingProfile ? 'Saving...' : isEditingProfile ? 'Save Academic Bio' : 'Edit Records'}
                    </button>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Personal Information
                    </h3>
                    <div className="space-y-4">
                      <div className="group">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
                        {isEditingProfile ? (
                          <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm dark:text-white" value={editUser.name} onChange={e => setEditUser({...editUser, name: e.target.value})} />
                        ) : (
                          <p className="text-sm font-bold text-slate-900 dark:text-white pl-1">{user.name}</p>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Date of Birth</label>
                          {isEditingProfile ? (
                            <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm dark:text-white" value={editUser.dob || ''} onChange={e => setEditUser({...editUser, dob: e.target.value})} />
                          ) : (
                            <p className="text-sm font-bold text-slate-900 dark:text-white pl-1">{user.dob || 'Not Set'}</p>
                          )}
                        </div>
                        <div className="group">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Blood Group</label>
                          {isEditingProfile ? (
                            <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm dark:text-white" value={editUser.bloodGroup || ''} onChange={e => setEditUser({...editUser, bloodGroup: e.target.value})} />
                          ) : (
                            <p className="text-sm font-bold text-slate-900 dark:text-white pl-1">{user.bloodGroup || 'Not Set'}</p>
                          )}
                        </div>
                      </div>
                      <div className="group">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Guardian Name</label>
                        {isEditingProfile ? (
                          <input className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm dark:text-white" value={editUser.parentName || ''} onChange={e => setEditUser({...editUser, parentName: e.target.value})} />
                        ) : (
                          <p className="text-sm font-bold text-slate-900 dark:text-white pl-1">{user.parentName || 'Not Set'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Contact Records
                    </h3>
                    <div className="space-y-4">
                      <div className="group">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Phone Number</label>
                        {isEditingProfile ? (
                          <input type="tel" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm dark:text-white" value={editUser.phone || ''} onChange={e => setEditUser({...editUser, phone: e.target.value})} />
                        ) : (
                          <p className="text-sm font-bold text-slate-900 dark:text-white pl-1">{user.phone || 'Not Set'}</p>
                        )}
                      </div>
                      <div className="group">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Roll Number (Permanent)</label>
                        <p className="text-sm font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800/50 w-fit">{user.username}</p>
                      </div>
                      <div className="group">
                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Home Address</label>
                        {isEditingProfile ? (
                          <textarea rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm dark:text-white resize-none" value={editUser.address || ''} onChange={e => setEditUser({...editUser, address: e.target.value})} />
                        ) : (
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed pl-1">{user.address || 'Not Registered'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-3">Academic Bio / Statement</h3>
                      {isEditingProfile ? (
                        <textarea 
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white h-40 resize-none font-medium leading-relaxed"
                          value={editUser.bio}
                          onChange={e => setEditUser({...editUser, bio: e.target.value})}
                        />
                      ) : (
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium text-base">
                            {user.bio || "Academic goals not defined."}
                        </p>
                      )}
                  </div>
                </div>
            </div>
        );
      default:
        return <Dashboard onSelectLab={(l) => handleSelectLab(l)} labs={labs} setView={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300 overflow-x-hidden">
      <Sidebar 
        currentView={currentView} 
        setView={handleViewChange} 
        user={user}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        toggleTheme={() => setIsDarkMode(!isDarkMode)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-40 transition-colors">
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="flex items-center gap-2">
                <img 
                    src={schoolLogoUrl} 
                    alt="TI Logo" 
                    className="w-8 h-8 object-contain"
                />
                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tighter">Academic Portal</span>
            </div>
        </div>
      </div>

      <main className={`flex-1 min-w-0 min-h-screen transition-all duration-300 ${user ? 'lg:ml-64' : ''}`}>
        <div className={`p-6 md:p-10 ${user ? 'pt-24 lg:pt-10' : ''}`}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
