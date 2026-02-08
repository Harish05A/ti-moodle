
import React, { useState, useEffect } from 'react';
import { Assessment, Question, Classroom, Difficulty, User, TestCase } from '../types.ts';
import { BackendService } from '../services/backend.ts';

const ManageAssessments: React.FC = () => {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<Partial<Assessment>>({
    title: '',
    description: '',
    targetGrades: [],
    questionBank: [],
    randomMcqCount: 0,
    randomCodingCount: 0,
    durationMinutes: 30,
    status: 'draft'
  });

  useEffect(() => {
    const fetchData = async () => {
      const savedUser = localStorage.getItem('ti_moodle_user');
      const u = savedUser ? JSON.parse(savedUser) : null;
      
      const [allAssessments, cls] = await Promise.all([
        BackendService.getAssessments(),
        BackendService.getClassrooms(u)
      ]);
      setAssessments(allAssessments);
      setClassrooms(cls);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const handleSave = async (status: 'draft' | 'published') => {
    if (!formData.title || !formData.targetGrades?.length) {
      alert("Please enter a title and select at least one classroom.");
      return;
    }

    const mcqInBank = formData.questionBank?.filter(q => q.type === 'mcq').length || 0;
    const codingInBank = formData.questionBank?.filter(q => q.type === 'coding').length || 0;

    if ((formData.randomMcqCount || 0) > mcqInBank) {
      alert(`Random MCQ count (${formData.randomMcqCount}) exceeds bank size (${mcqInBank}). Please add more questions to the bank.`);
      return;
    }
    if ((formData.randomCodingCount || 0) > codingInBank) {
      alert(`Random Coding count (${formData.randomCodingCount}) exceeds bank size (${codingInBank}). Please add more questions to the bank.`);
      return;
    }

    const assessment: Assessment = {
      ...formData,
      id: editingId || `asmt-${Date.now()}`,
      status
    } as Assessment;

    try {
      await BackendService.saveAssessment(assessment);
      setAssessments(prev => {
        const idx = prev.findIndex(a => a.id === assessment.id);
        if (idx > -1) {
          const updated = [...prev];
          updated[idx] = assessment;
          return updated;
        }
        return [...prev, assessment];
      });
      setShowForm(false);
      setEditingId(null);
      setCurrentStep(1);
      setFormData({ title: '', description: '', targetGrades: [], questionBank: [], randomMcqCount: 0, randomCodingCount: 0, durationMinutes: 30, status: 'draft' });
    } catch (e: any) {
      console.error("Critical: Failed to save assessment object to Firestore.", e);
      alert(`Failed to save assessment: ${e.message || 'Check console for details'}`);
    }
  };

  const addQuestion = (type: 'mcq' | 'coding') => {
    const q: Question = {
      id: `q-${Date.now()}`,
      type,
      title: type === 'mcq' ? 'New MCQ' : 'New Coding Challenge',
      text: '',
      category: 'General',
      difficulty: Difficulty.BEGINNER,
      points: 10,
      ...(type === 'mcq' ? { options: ['', '', '', ''], correctOptionIndex: 0 } : { starterCode: '# Enter starter code\n', testCases: [{ id: 'tc-1', input: '', expectedOutput: '', isHidden: false }] })
    };
    setFormData(prev => ({ ...prev, questionBank: [...(prev.questionBank || []), q] }));
  };

  const updateQuestion = (qId: string, updates: Partial<Question>) => {
    setFormData(prev => ({
      ...prev,
      questionBank: prev.questionBank?.map(q => q.id === qId ? { ...q, ...updates } : q)
    }));
  };

  const removeQuestion = (qId: string) => {
    setFormData(prev => ({
      ...prev,
      questionBank: prev.questionBank?.filter(q => q.id !== qId)
    }));
  };

  const addTestCase = (qId: string) => {
    const q = formData.questionBank?.find(x => x.id === qId);
    if (!q) return;
    const updatedTestCases = [...(q.testCases || []), { id: `tc-${Date.now()}`, input: '', expectedOutput: '', isHidden: false }];
    updateQuestion(qId, { testCases: updatedTestCases });
  };

  const removeTestCase = (qId: string, tcId: string) => {
    const q = formData.questionBank?.find(x => x.id === qId);
    if (!q) return;
    const updatedTestCases = (q.testCases || []).filter(tc => tc.id !== tcId);
    updateQuestion(qId, { testCases: updatedTestCases });
  };

  const updateTestCase = (qId: string, tcIdx: number, updates: Partial<TestCase>) => {
    const q = formData.questionBank?.find(x => x.id === qId);
    if (!q || !q.testCases) return;
    const updatedTestCases = [...q.testCases];
    updatedTestCases[tcIdx] = { ...updatedTestCases[tcIdx], ...updates };
    updateQuestion(qId, { testCases: updatedTestCases });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-2">Examination Bureau</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Assessment Architect</h1>
        </div>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingId(null); setCurrentStep(1); }}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            showForm ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
          }`}
        >
          {showForm ? 'Return to Archive' : 'Create New Assessment'}
        </button>
      </header>

      {showForm ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-12">
          
          <div className="flex gap-4 mb-8 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
             <button onClick={() => setCurrentStep(1)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentStep === 1 ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>1. Strategy Setup</button>
             <button onClick={() => setCurrentStep(2)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentStep === 2 ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-400'}`}>2. Populate Bank</button>
          </div>

          {currentStep === 1 ? (
            <section className="animate-in slide-in-from-left-4 duration-500 space-y-10">
              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-10 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6">Phase 1: Delivery Strategy</h3>
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <input 
                      placeholder="Assessment Title" 
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-black dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                    <textarea 
                      placeholder="Student instructions and policy..." 
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-medium h-24 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-4">
                     <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">Duration (Mins)</label>
                        <input type="number" value={formData.durationMinutes} onChange={e => setFormData({...formData, durationMinutes: parseInt(e.target.value)})} className="w-full bg-transparent font-black text-lg outline-none dark:text-white" />
                     </div>
                     <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">Class Assignment</label>
                        <div className="flex flex-wrap gap-1">
                          {classrooms.map(cls => (
                            <button key={cls.id} onClick={() => setFormData(prev => ({ ...prev, targetGrades: prev.targetGrades?.includes(cls.id) ? prev.targetGrades.filter(g => g !== cls.id) : [...(prev.targetGrades || []), cls.id] }))} className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${formData.targetGrades?.includes(cls.id) ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>{cls.name}</button>
                          ))}
                        </div>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <div className="bg-indigo-600 p-4 rounded-xl text-white shadow-lg shadow-indigo-600/20">
                        <label className="text-[9px] font-black uppercase block mb-2 opacity-70">MCQs per Student</label>
                        <input type="number" value={formData.randomMcqCount} onChange={e => setFormData({...formData, randomMcqCount: parseInt(e.target.value)})} className="w-full bg-transparent font-black text-lg outline-none" />
                     </div>
                     <div className="bg-emerald-600 p-4 rounded-xl text-white shadow-lg shadow-emerald-600/20">
                        <label className="text-[9px] font-black uppercase block mb-2 opacity-70">Coding per Student</label>
                        <input type="number" value={formData.randomCodingCount} onChange={e => setFormData({...formData, randomCodingCount: parseInt(e.target.value)})} className="w-full bg-transparent font-black text-lg outline-none" />
                     </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setCurrentStep(2)} className="px-10 py-4 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl">Proceed to Question Bank</button>
              </div>
            </section>
          ) : (
            <section className="animate-in slide-in-from-right-4 duration-500 space-y-8">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-4">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Phase 2: Question Pool</h3>
                   <div className="flex gap-2">
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${ (formData.questionBank?.filter(q => q.type === 'mcq').length || 0) >= (formData.randomMcqCount || 0) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500 animate-pulse' }`}>MCQ: {formData.questionBank?.filter(q => q.type === 'mcq').length}/{formData.randomMcqCount} Needed</span>
                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${ (formData.questionBank?.filter(q => q.type === 'coding').length || 0) >= (formData.randomCodingCount || 0) ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500 animate-pulse' }`}>Coding: {formData.questionBank?.filter(q => q.type === 'coding').length}/{formData.randomCodingCount} Needed</span>
                   </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => addQuestion('mcq')} className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-black uppercase rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-all">+ Add MCQ</button>
                  <button onClick={() => addQuestion('coding')} className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 text-[10px] font-black uppercase rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all">+ Add Coding</button>
                </div>
              </div>

              <div className="space-y-8 max-h-[700px] overflow-y-auto pr-4 scrollbar-thin">
                {formData.questionBank?.map((q, i) => (
                  <div key={q.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 relative group shadow-sm hover:shadow-xl transition-all">
                    <button onClick={() => removeQuestion(q.id)} className="absolute top-8 right-10 text-slate-300 hover:text-red-500 transition-all">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                    
                    <div className="flex items-center gap-6 mb-8">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${q.type === 'mcq' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {q.type.toUpperCase()} • Q{i+1}
                      </div>
                      <div className="flex items-center gap-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase">Weight:</label>
                         <input type="number" className="w-12 bg-transparent text-sm font-black dark:text-white border-b border-slate-200 dark:border-slate-700" value={q.points} onChange={e => updateQuestion(q.id, {points: parseInt(e.target.value)})} />
                         <span className="text-[9px] font-black text-slate-400 uppercase">PTS</span>
                      </div>
                      <input 
                        placeholder="Internal Identifier (e.g. Loops Basics)" 
                        className="bg-transparent border-b border-slate-200 dark:border-slate-700 text-sm font-black dark:text-white outline-none focus:border-indigo-500 transition-all flex-1"
                        value={q.title}
                        onChange={e => updateQuestion(q.id, { title: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question Text</label>
                          <textarea 
                            placeholder="Type the question content here..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 min-h-[140px]"
                            value={q.text}
                            onChange={e => updateQuestion(q.id, { text: e.target.value })}
                          />
                        </div>

                        {q.type === 'mcq' && (
                          <div className="space-y-4">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Answer Options</label>
                             <div className="grid grid-cols-1 gap-3">
                                {q.options?.map((opt, optIdx) => (
                                  <div key={optIdx} className="flex items-center gap-4 group/opt">
                                     <button 
                                        onClick={() => updateQuestion(q.id, { correctOptionIndex: optIdx })}
                                        className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all ${q.correctOptionIndex === optIdx ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-300'}`}
                                     >
                                        {String.fromCharCode(65 + optIdx)}
                                     </button>
                                     <input 
                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold dark:text-white"
                                        value={opt}
                                        onChange={e => {
                                          const newOpts = [...(q.options || [])];
                                          newOpts[optIdx] = e.target.value;
                                          updateQuestion(q.id, { options: newOpts });
                                        }}
                                        placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                                     />
                                  </div>
                                ))}
                             </div>
                          </div>
                        )}
                      </div>

                      {q.type === 'coding' && (
                        <div className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Starter Code (Initial State)</label>
                              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 shadow-inner">
                                 <textarea 
                                    className="w-full h-40 bg-transparent text-emerald-400 code-font text-xs outline-none resize-none scrollbar-thin"
                                    value={q.starterCode}
                                    onChange={e => updateQuestion(q.id, { starterCode: e.target.value })}
                                    spellCheck={false}
                                 />
                              </div>
                           </div>
                           <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Automated Test Suite</label>
                                <button onClick={() => addTestCase(q.id)} className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">+ Add Verification Case</button>
                              </div>
                              <div className="space-y-3 max-h-[180px] overflow-y-auto scrollbar-thin pr-2">
                                 {q.testCases?.map((tc, tcIdx) => (
                                   <div key={tc.id} className="grid grid-cols-12 gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 group/tc">
                                      <div className="col-span-5">
                                        <input placeholder="StdIn" className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-[10px] code-font dark:text-white outline-none border border-transparent focus:border-indigo-500" value={tc.input} onChange={e => updateTestCase(q.id, tcIdx, {input: e.target.value})} />
                                      </div>
                                      <div className="col-span-5">
                                        <input placeholder="Expected StdOut" className="w-full bg-slate-50 dark:bg-slate-800 p-2.5 rounded-lg text-[10px] code-font text-emerald-500 outline-none border border-transparent focus:border-emerald-500" value={tc.expectedOutput} onChange={e => updateTestCase(q.id, tcIdx, {expectedOutput: e.target.value})} />
                                      </div>
                                      <div className="col-span-2 flex items-center justify-end pr-1">
                                        <button onClick={() => removeTestCase(q.id, tc.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/tc:opacity-100">
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12"/></svg>
                                        </button>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-6 pt-12 border-t border-slate-100 dark:border-slate-800">
                 <button onClick={() => setCurrentStep(1)} className="px-10 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-200 transition-all">Back to Config</button>
                 <button onClick={() => handleSave('draft')} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-3xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-200 transition-all">Archive Project</button>
                 <button onClick={() => handleSave('published')} className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-500 transition-all">Finalize & Deploy</button>
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Profile</th>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivery Strategy</th>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Density</th>
                <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {assessments.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="p-8">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${a.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{a.status}</span>
                      <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{a.durationMinutes} Min Session</p>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase text-indigo-600">{a.randomMcqCount} MCQ / Attempt</span>
                      <span className="text-[9px] font-black uppercase text-emerald-600">{a.randomCodingCount} Coding / Attempt</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex flex-col gap-1">
                       <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-500 w-fit">{a.questionBank.length} Pool Items</span>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex justify-end gap-6">
                      <button onClick={() => { setEditingId(a.id); setFormData(a); setShowForm(true); setCurrentStep(1); }} className="text-indigo-600 font-black text-[10px] uppercase hover:underline">Re-Architect</button>
                      <button onClick={async () => { if (window.confirm("Archive this assessment protocol?")) { await BackendService.deleteAssessment(a.id); setAssessments(prev => prev.filter(x => x.id !== a.id)); } }} className="text-red-500 font-black text-[10px] uppercase">Archive</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!assessments.length && !isLoading && (
                <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs italic">Laboratory of Assessments is currently empty.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ManageAssessments;
