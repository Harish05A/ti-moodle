
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
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
      console.warn("Loading data...");
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
      setFeedback({ type: 'success', message: 'Classroom created successfully.' });
      setFormData({ name: '', teacherId: '' });
      setShowForm(false);
      loadData();
    } catch (e: any) {
      setFeedback({ type: 'error', message: `Error: ${e.message}` });
    }
  };

  const handleIdentityResync = async () => {
    setFeedback({ type: 'success', message: 'Refreshing account permissions...' });
    const savedUserString = localStorage.getItem('ti_moodle_user');
    const u = savedUserString ? JSON.parse(savedUserString) : null;
    
    if (u) {
        try {
            const refreshed = await BackendService.repairAdminIdentity(u);
            localStorage.setItem('ti_moodle_user', JSON.stringify(refreshed));
            setCurrentUser(refreshed);
            setFeedback({ type: 'success', message: 'Permissions updated.' });
            setTimeout(loadData, 1000);
        } catch (e: any) {
            setFeedback({ type: 'error', message: `Refresh failed: ${e.message}` });
        }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this class? All students will be unenrolled.')) {
      try {
        await BackendService.deleteClassroom(id);
        setFeedback({ type: 'success', message: 'Class deleted.' });
        loadData();
      } catch (e: any) {
        setFeedback({ type: 'error', message: 'Delete operation failed.' });
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
      alert("Failed to update student enrollment.");
    } finally {
      setIsSyncingEnrollment(false);
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
          <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-2">School Settings</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Classrooms Manager</h1>
        </div>
        <div className="flex gap-4">
            {currentUser?.role === 'admin' && (
              <button 
                  onClick={handleIdentityResync}
                  className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                  Refresh Permissions
              </button>
            )}
            {currentUser?.role === 'admin' && (
              <button 
                  onClick={() => { setShowForm(!showForm); setFeedback(null); }}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
              >
                  {showForm ? 'Cancel' : 'New Classroom'}
              </button>
            )}
        </div>
      </header>

      {feedback && (
        <div className={`p-6 border rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-center animate-in slide-in-from-top-4 ${
            feedback.type === 'error' 
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900 text-red-600' 
                : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900 text-emerald-600'
        }`}>
          {feedback.message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-xl space-y-8 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Class Name</label>
              <input 
                required
                placeholder="e.g. Grade 12 Computer Science"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Assigned Teacher</label>
              <select 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={formData.teacherId}
                onChange={e => setFormData({...formData, teacherId: e.target.value})}
              >
                <option value="">Select Instructor</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:opacity-90 transition-all">
            Create Class
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {classrooms.map(cls => (
          <div key={cls.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between min-h-[280px]">
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div className="flex gap-2">
                   {currentUser?.role === 'admin' && (
                      <button onClick={() => handleDelete(cls.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                   )}
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight">{cls.name}</h3>
              <p className="text-xs font-bold text-slate-500">Teacher: {cls.teacherName}</p>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {allStudents.filter(s => s.grades?.includes(cls.id)).length} Enrolled
                </div>
                <button 
                  onClick={() => setActiveRosterClass(cls)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all"
                >
                  Edit Students
                </button>
            </div>
          </div>
        ))}
      </div>

      {activeRosterClass && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6 overflow-hidden">
          <div className="max-w-4xl w-full h-[80vh] bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{activeRosterClass.name}</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Class Enrollment</p>
              </div>
              <button 
                onClick={() => { setActiveRosterClass(null); setStudentSearch(''); }}
                className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="px-10 py-6 bg-slate-50/50 dark:bg-slate-800/20">
               <div className="relative">
                  <input 
                    type="text"
                    placeholder="Find students..."
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-12 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-thin">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredStudents.map(student => {
                    const isEnrolled = student.grades?.includes(activeRosterClass.id);
                    return (
                      <div key={student.id} className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${isEnrolled ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200'}`}>
                         <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-none">{student.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">ID: {student.username}</p>
                         </div>
                         <button 
                          disabled={isSyncingEnrollment}
                          onClick={() => handleToggleEnrollment(student)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isEnrolled ? 'bg-red-50 text-red-600' : 'bg-indigo-600 text-white shadow-md'}`}
                         >
                            {isEnrolled ? 'Remove' : 'Enroll'}
                         </button>
                      </div>
                    );
                  })}
               </div>
            </div>
            
            <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-center">
                <button 
                  onClick={() => { setActiveRosterClass(null); setStudentSearch(''); }}
                  className="px-10 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl"
                >
                  Save Changes
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageClasses;
