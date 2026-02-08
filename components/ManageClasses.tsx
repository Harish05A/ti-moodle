
import React, { useState, useEffect } from 'react';
import { Classroom, User } from '../types.ts';
import { BackendService } from '../services/backend.ts';

const ManageClasses: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Student Management State
  const [activeRosterClass, setActiveRosterClass] = useState<Classroom | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [isSyncingEnrollment, setIsSyncingEnrollment] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    teacherId: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const savedUserString = localStorage.getItem('ti_moodle_user');
      const u = savedUserString ? JSON.parse(savedUserString) : null;
      setCurrentUser(u);

      const [cls, allUsers] = await Promise.all([
        BackendService.getClassrooms(u),
        BackendService.getAllUsers()
      ]);
      setClassrooms(cls || []);
      setTeachers((allUsers || []).filter(u => u.role === 'teacher'));
      setAllStudents((allUsers || []).filter(u => u.role === 'student'));
    } catch (e: any) {
      console.warn("Loading restricted data...");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!formData.name || !formData.teacherId) return;

    const teacher = teachers.find(t => t.id === formData.teacherId);
    const classId = `cls-${Date.now()}`;
    const newClass: Classroom = {
      id: classId,
      name: formData.name,
      teacherId: formData.teacherId,
      teacherName: teacher?.name || 'Unknown'
    };

    try {
      await BackendService.saveClassroom(newClass);
      setFeedback({ type: 'success', message: 'Classroom deployed successfully.' });
      setFormData({ name: '', teacherId: '' });
      setShowForm(false);
      loadData();
    } catch (e: any) {
      setFeedback({ 
        type: 'error', 
        message: e.message.includes('PERMISSION_DENIED') 
          ? 'SECURITY SYNC FAILED: Click "FORCE IDENTITY RE-SYNC", wait 3 seconds, then try again.' 
          : `ERROR: ${e.message}` 
      });
    }
  };

  const handleIdentityResync = async () => {
    setFeedback({ type: 'success', message: 'Syncing identity with database vault...' });
    const savedUserString = localStorage.getItem('ti_moodle_user');
    const u = savedUserString ? JSON.parse(savedUserString) : null;
    
    if (u) {
        try {
            const refreshed = await BackendService.repairAdminIdentity(u);
            localStorage.setItem('ti_moodle_user', JSON.stringify(refreshed));
            setCurrentUser(refreshed);
            setFeedback({ type: 'success', message: 'Identity synchronized. Permissions should be active in 3-5 seconds.' });
            setTimeout(loadData, 3000);
        } catch (e: any) {
            setFeedback({ type: 'error', message: `SYNC FAILED: ${e.message}` });
        }
    } else {
      setFeedback({ type: 'error', message: 'Session invalid. Please logout and re-authorize.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Archiving this class will disconnect all students. Proceed?')) {
      try {
        await BackendService.deleteClassroom(id);
        setFeedback({ type: 'success', message: 'Class archived.' });
        loadData();
      } catch (e: any) {
        setFeedback({ type: 'error', message: 'Operation restricted.' });
      }
    }
  };

  const handleToggleEnrollment = async (student: User) => {
    if (!activeRosterClass || isSyncingEnrollment) return;
    
    setIsSyncingEnrollment(true);
    const isEnrolled = student.grades?.includes(activeRosterClass.id);
    
    try {
      if (isEnrolled) {
        await BackendService.unenrollStudent(student.id, activeRosterClass.id);
      } else {
        await BackendService.enrollStudent(student.id, activeRosterClass.id);
      }
      
      // Update local state for immediate feedback
      setAllStudents(prev => prev.map(s => {
        if (s.id === student.id) {
          const newGrades = isEnrolled 
            ? (s.grades || []).filter(g => g !== activeRosterClass.id)
            : [...(s.grades || []), activeRosterClass.id];
          return { ...s, grades: newGrades };
        }
        return s;
      }));
    } catch (e: any) {
      alert("Failed to update enrollment: " + e.message);
    } finally {
      setIsSyncingEnrollment(false);
    }
  };

  const handleSystemReset = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
        alert("Authorization Denied.");
        return;
    }

    if (window.confirm('CRITICAL ACTION: This will permanently wipe all classrooms and curriculum. Your admin account will persist. Continue?')) {
        const confirmPhrase = window.prompt('Type "NUCLEAR" to confirm full purge:');
        if (confirmPhrase === 'NUCLEAR') {
            setIsResetting(true);
            try {
                await BackendService.resetSystem(currentUser.id);
                setFeedback({ type: 'success', message: 'Purge complete. System re-initializing...' });
                setTimeout(() => window.location.reload(), 1500);
            } catch (e: any) {
                setFeedback({ type: 'error', message: `Purge failed: ${e.message}` });
            } finally {
                setIsResetting(false);
            }
        }
    }
  };

  const filteredStudents = allStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
    s.username.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Academic Infrastructure</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Classroom Architect</h1>
        </div>
        <div className="flex gap-4">
            {currentUser?.role === 'admin' && (
              <button 
                  onClick={handleIdentityResync}
                  className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                  Force Identity Re-Sync
              </button>
            )}
            {currentUser?.role === 'admin' && (
              <button 
                  onClick={() => { setShowForm(!showForm); setFeedback(null); }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-all"
              >
                  {showForm ? 'Cancel' : 'Design New Class'}
              </button>
            )}
        </div>
      </header>

      {feedback && (
        <div className={`p-6 border rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] text-center animate-in slide-in-from-top-4 ${
            feedback.type === 'error' 
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400' 
                : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400'
        }`}>
          {feedback.message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Class Name</label>
              <input 
                required
                placeholder="e.g. Grade 12 - Computer Science A"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Assigned Faculty (Teacher)</label>
              <select 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={formData.teacherId}
                onChange={e => setFormData({...formData, teacherId: e.target.value})}
              >
                <option value="">Select Instructor...</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name} (@{t.username})</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500 transition-all">
            Deploy Classroom
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classrooms.map(cls => (
          <div key={cls.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl hover:border-indigo-400 transition-all group flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">🏫</div>
                <div className="flex gap-2">
                   {currentUser?.role === 'admin' && (
                      <button onClick={() => handleDelete(cls.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                   )}
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">{cls.name}</h3>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-[10px] font-black text-indigo-600">👨‍🏫</div>
                <p className="text-xs font-bold text-slate-500">{cls.teacherName}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {allStudents.filter(s => s.grades?.includes(cls.id)).length} Active Students
                </div>
                <button 
                  onClick={() => setActiveRosterClass(cls)}
                  className="px-4 py-2 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-indigo-500/10"
                >
                  Manage Roster
                </button>
            </div>
          </div>
        ))}
        {classrooms.length === 0 && !isLoading && (
          <div className="col-span-full py-20 bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] text-center">
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Infrastructure scan complete. Registry is currently empty.</p>
          </div>
        )}
      </div>

      {/* Roster Management Overlay */}
      {activeRosterClass && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 overflow-hidden">
          <div className="max-w-4xl w-full h-[80vh] bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl">👥</div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">Roster: {activeRosterClass.name}</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Enrollment Protocol Active</p>
                 </div>
              </div>
              <button 
                onClick={() => { setActiveRosterClass(null); setStudentSearch(''); }}
                className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="px-10 py-6 bg-slate-100/30 dark:bg-slate-800/20">
               <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search students by name or ID..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-12 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-thin">
               {filteredStudents.length === 0 ? (
                 <div className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-xs">No matching students found in vault.</div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredStudents.map(student => {
                      const isEnrolled = student.grades?.includes(activeRosterClass.id);
                      return (
                        <div key={student.id} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${isEnrolled ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}>
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-lg border border-slate-200 dark:border-slate-700">{student.avatar || '👨‍🎓'}</div>
                              <div>
                                 <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{student.name}</p>
                                 <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">@{student.username}</p>
                              </div>
                           </div>
                           <button 
                            disabled={isSyncingEnrollment}
                            onClick={() => handleToggleEnrollment(student)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isEnrolled ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'}`}
                           >
                              {isEnrolled ? 'Remove' : 'Enroll'}
                           </button>
                        </div>
                      );
                    })}
                 </div>
               )}
            </div>
            
            <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-center">
                <button 
                  onClick={() => { setActiveRosterClass(null); setStudentSearch(''); }}
                  className="px-10 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Finalize Changes
                </button>
            </div>
          </div>
        </div>
      )}

      {currentUser?.role === 'admin' && (
        <div className="pt-20 border-t border-slate-200 dark:border-slate-800 mt-20">
             <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-[3rem] p-12 flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="space-y-2">
                    <h2 className="text-red-600 dark:text-red-400 font-black uppercase tracking-widest text-xs">Nuclear Purge Protocol</h2>
                    <p className="text-red-900/60 dark:text-red-400/60 text-sm font-medium max-w-md italic">If permission deadlocks continue, this will wipe all data and force-rebuild your admin document to resolve security conflicts.</p>
                </div>
                <button 
                    onClick={handleSystemReset}
                    disabled={isResetting}
                    className="px-10 py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-red-500 shadow-xl shadow-red-500/20 transition-all disabled:opacity-50"
                >
                    {isResetting ? 'Purging Systems...' : 'Perform Full Purge'}
                </button>
             </div>
        </div>
      )}
    </div>
  );
};

export default ManageClasses;
