
import React, { useState, useEffect } from 'react';
import { Submission, User, Classroom, AssessmentSubmission } from '../types.ts';
import { BackendService } from '../services/backend.ts';

const TeacherGrading: React.FC = () => {
  const [labSubmissions, setLabSubmissions] = useState<Submission[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<AssessmentSubmission[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedLabSub, setSelectedLabSub] = useState<Submission | null>(null);
  const [selectedTestSub, setSelectedTestSub] = useState<AssessmentSubmission | null>(null);
  const [activeTab, setActiveTab] = useState<'labs' | 'exams'>('labs');
  const [feedbackText, setFeedbackText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ti_moodle_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      setCurrentUser(u);
      
      const fetchInitial = async () => {
        try {
          const cls = await BackendService.getClassrooms(u);
          setClassrooms(cls);
          if (cls.length > 0) {
            setSelectedClassId(cls[0].id);
          }
        } catch (e) {
          console.error("Error fetching classrooms:", e);
        }
      };
      fetchInitial();
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !selectedClassId) return;

    // Listen to Lab submissions
    const unsubLabs = BackendService.listenToSubmissions(currentUser.role, currentUser.id, selectedClassId, (subs) => {
      setLabSubmissions(subs);
    });

    // Listen to Test submissions
    const unsubTests = BackendService.listenToClassAssessmentSubmissions(currentUser.role, selectedClassId, (subs) => {
      setTestSubmissions(subs);
    });

    return () => {
      unsubLabs();
      unsubTests();
    };
  }, [selectedClassId, currentUser]);

  const handleSaveFeedback = async () => {
    if (!selectedLabSub) return;
    setIsUpdating(true);
    try {
      const updatedSub: Submission = {
        ...selectedLabSub,
        feedback: feedbackText
      };
      await BackendService.submitLab(updatedSub);
      alert("Feedback synchronized.");
    } catch (e) {
      console.error(e);
      alert('Operation failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-2">Academic Performance Data</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Results Archive</h1>
        </div>
        <div className="flex gap-4 items-center">
            <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <button onClick={() => setActiveTab('labs')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'labs' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>Lab Reports</button>
                <button onClick={() => setActiveTab('exams')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'exams' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>Exam Results</button>
            </div>
            <div className="flex gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-sm scrollbar-thin">
               {classrooms.map(c => (
                 <button
                   key={c.id}
                   onClick={() => {
                     setSelectedClassId(c.id);
                     setSelectedLabSub(null);
                     setSelectedTestSub(null);
                   }}
                   className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                     selectedClassId === c.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400'
                   }`}
                 >
                   {c.name}
                 </button>
               ))}
            </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {activeTab === 'labs' ? `Submissions (${labSubmissions.length})` : `Exam Papers (${testSubmissions.length})`}
              </h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto scrollbar-thin">
              {activeTab === 'labs' ? (
                labSubmissions.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 text-[10px] font-black uppercase">No Lab Submissions</div>
                ) : (
                    labSubmissions.map((sub, i) => (
                      <button
                        key={i}
                        onClick={() => { setSelectedLabSub(sub); setFeedbackText(sub.feedback || ''); }}
                        className={`w-full text-left p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between group ${selectedLabSub?.userId === sub.userId && selectedLabSub?.labId === sub.labId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                      >
                        <div>
                            <p className="font-black text-slate-900 dark:text-white text-sm">{sub.userName}</p>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter mt-1">{sub.labId}</p>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    ))
                )
              ) : (
                testSubmissions.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 text-[10px] font-black uppercase">No Test Submissions</div>
                ) : (
                    testSubmissions.map((sub, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedTestSub(sub)}
                        className={`w-full text-left p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all flex items-center justify-between group ${selectedTestSub?.userId === sub.userId && selectedTestSub?.assessmentId === sub.assessmentId ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                      >
                        <div>
                            <p className="font-black text-slate-900 dark:text-white text-sm">{sub.userName}</p>
                            <p className="text-[9px] text-emerald-500 uppercase font-black tracking-tighter mt-1">Score: {sub.score}/{sub.totalPoints}</p>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m9 18 6-6-6-6"/></svg>
                      </button>
                    ))
                )
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {activeTab === 'labs' && selectedLabSub ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-slate-950 rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl">
                <p className="text-[9px] font-black text-slate-600 uppercase mb-4 tracking-widest">Student Source Code</p>
                <pre className="code-font text-sm text-indigo-300 overflow-x-auto p-4 bg-slate-900/50 rounded-2xl border border-white/5 max-h-[500px] whitespace-pre-wrap">
                  {selectedLabSub.code}
                </pre>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-10 flex flex-col gap-6">
                <h3 className="font-black text-slate-900 dark:text-white uppercase text-[10px] tracking-[0.3em]">Instructor Feedback</h3>
                <textarea 
                  placeholder="Guidance for the student..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-medium min-h-[120px] dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                  onClick={handleSaveFeedback}
                  disabled={isUpdating}
                  className="bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  {isUpdating ? 'Synchronizing...' : 'Save Feedback'}
                </button>
              </div>
            </div>
          ) : activeTab === 'exams' && selectedTestSub ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 flex items-center justify-between shadow-sm">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedTestSub.userName}</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">Attempt Data Captured: {new Date(selectedTestSub.submittedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Final Performance</p>
                    <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {selectedTestSub.score}<span className="text-xl text-slate-300">/{selectedTestSub.totalPoints}</span>
                    </div>
                  </div>
               </div>
               
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Detailed Response Log</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {Object.entries(selectedTestSub.answers).map(([qId, ans], idx) => (
                        <div key={qId} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-sm">
                           <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question {idx + 1}</span>
                              <div className="px-3 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">ID: {qId}</div>
                           </div>
                           {typeof ans === 'number' ? (
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black">{String.fromCharCode(65 + ans)}</div>
                                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Multiple Choice Response</p>
                              </div>
                           ) : (
                              <pre className="bg-slate-950 p-6 rounded-2xl code-font text-xs text-emerald-400 overflow-x-auto whitespace-pre-wrap border border-slate-800">
                                 {ans}
                              </pre>
                           )}
                        </div>
                    ))}
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center">
              <div className="max-w-xs space-y-4">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto text-2xl">📁</div>
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Select a record from the list to view academic data</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherGrading;
