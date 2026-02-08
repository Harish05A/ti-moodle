
import React, { useState, useEffect } from 'react';
import { LabExperiment, Difficulty, TestCase, User, Classroom } from '../types';
import { BackendService } from '../services/backend';

interface ManageLabsProps {
  labs: LabExperiment[];
  onAddLab: (lab: LabExperiment) => void;
  onDeleteLab?: (labId: string) => void;
}

const ManageLabs: React.FC<ManageLabsProps> = ({ labs = [], onAddLab, onDeleteLab }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const savedUser = localStorage.getItem('ti_moodle_user');
    if (savedUser) {
        const u = JSON.parse(savedUser);
        setCurrentUser(u);
        loadClassrooms(u);
    }
  }, []);

  const loadClassrooms = async (user: User) => {
    try {
        const cls = await BackendService.getClassrooms(user);
        setClassrooms(cls || []);
    } catch (e) {
        console.warn("Could not load classrooms for filtering.");
    }
  };

  const initialLabState: Partial<LabExperiment> = {
    title: '',
    category: 'Programming',
    difficulty: Difficulty.BEGINNER,
    description: '',
    starterCode: 'import sys\n\n# Your logic here\n',
    solutionHint: '',
    targetGrades: [],
    learningObjectives: [''],
    testCases: [{ id: 'tc-1', input: '', expectedOutput: '', isHidden: false }],
    status: 'draft',
    deadline: undefined
  };

  const [newLab, setNewLab] = useState<Partial<LabExperiment>>(initialLabState);

  const startEditing = (lab: LabExperiment) => {
    setNewLab({ ...lab });
    setEditingId(lab.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showTempFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleDelete = (labId: string, title: string) => {
    if (window.confirm(`Permanently delete "${title}"?`)) {
      if (onDeleteLab) {
        onDeleteLab(labId);
        showTempFeedback('success', 'Experiment removed.');
      }
    }
  };

  const toggleClassroom = (classId: string) => {
    const current = newLab.targetGrades || [];
    if (current.includes(classId)) {
        setNewLab({ ...newLab, targetGrades: current.filter(id => id !== classId) });
    } else {
        setNewLab({ ...newLab, targetGrades: [...current, classId] });
    }
  };

  const saveExperiment = (status: 'draft' | 'published') => {
    if (!newLab.title || !newLab.description) {
        showTempFeedback('error', 'Title and Description are required.');
        return;
    }

    if (!newLab.targetGrades || newLab.targetGrades.length === 0) {
        showTempFeedback('error', 'You must assign this experiment to at least one classroom.');
        return;
    }

    const lab: LabExperiment = {
      ...newLab,
      id: editingId || `lab-${Date.now()}`,
      learningObjectives: (newLab.learningObjectives || []).filter(o => o.trim() !== ''),
      testCases: (newLab.testCases || []).filter(tc => tc.expectedOutput.trim() !== ''),
      status: status
    } as LabExperiment;

    onAddLab(lab);
    setShowForm(false);
    setEditingId(null);
    setNewLab(initialLabState);
    showTempFeedback('success', status === 'published' ? 'Experiment deployed to classrooms.' : 'Experiment saved as draft.');
  };

  const handlePublishNow = (lab: LabExperiment) => {
    const updated = { ...lab, status: 'published' as const };
    onAddLab(updated);
    showTempFeedback('success', `"${lab.title}" is now live.`);
  };

  const addTestCase = () => {
    setNewLab({
      ...newLab,
      testCases: [...(newLab.testCases || []), { id: `tc-${Date.now()}`, input: '', expectedOutput: '', isHidden: false }]
    });
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const updated = [...(newLab.testCases || [])];
    updated[index] = { ...updated[index], [field]: value };
    setNewLab({ ...newLab, testCases: updated });
  };

  const addObjective = () => {
    setNewLab({ ...newLab, learningObjectives: [...(newLab.learningObjectives || []), ''] });
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...(newLab.learningObjectives || [])];
    updated[index] = value;
    setNewLab({ ...newLab, learningObjectives: updated });
  };

  const formatTimestampForInput = (ts?: number) => {
    if (!ts) return '';
    const date = new Date(ts);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const filteredLabs = labs.filter(lab => {
    const matchesSearch = lab.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || lab.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-2">Curriculum Architect</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Experiment Builder</h1>
        </div>
        <button 
          type="button"
          onClick={() => {
            if (showForm) {
              setEditingId(null);
              setNewLab(initialLabState);
            }
            setShowForm(!showForm);
          }}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl ${
            showForm ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400' : 'bg-indigo-600 text-white shadow-indigo-500/20'
          }`}
        >
          {showForm ? 'Cancel Creation' : 'Create New Experiment'}
        </button>
      </header>

      {feedback && (
        <div className={`fixed bottom-10 right-10 p-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center shadow-2xl z-50 animate-in slide-in-from-right-10 ${
          feedback.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {feedback.message}
        </div>
      )}

      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-2xl space-y-12 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <section className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Core Properties
                </h3>
                <div className="space-y-4">
                  <input 
                    placeholder="Experiment Title (e.g., Matrix Multiplier)" 
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    value={newLab.title}
                    onChange={e => setNewLab({...newLab, title: e.target.value})}
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      value={newLab.category}
                      onChange={e => setNewLab({...newLab, category: e.target.value})}
                    >
                      <option>Programming</option>
                      <option>Algorithms</option>
                      <option>Data Structures</option>
                      <option>Mathematics</option>
                    </select>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                      value={newLab.difficulty}
                      onChange={e => setNewLab({...newLab, difficulty: e.target.value as Difficulty})}
                    >
                      <option value={Difficulty.BEGINNER}>Beginner</option>
                      <option value={Difficulty.INTERMEDIATE}>Intermediate</option>
                      <option value={Difficulty.ADVANCED}>Advanced</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deadline (Optional)</label>
                      <input 
                        type="datetime-local"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                        value={formatTimestampForInput(newLab.deadline)}
                        onChange={e => setNewLab({...newLab, deadline: e.target.value ? new Date(e.target.value).getTime() : undefined})}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deploy to Classrooms</label>
                    <div className="flex flex-wrap gap-2">
                        {classrooms.length === 0 ? (
                            <p className="text-[10px] text-red-500 font-bold uppercase italic">Error: No assigned classrooms found.</p>
                        ) : (
                            classrooms.map(cls => (
                                <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => toggleClassroom(cls.id)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                        newLab.targetGrades?.includes(cls.id)
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20'
                                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                                    }`}
                                >
                                    {cls.name}
                                </button>
                            ))
                        )}
                    </div>
                  </div>

                  <textarea 
                    placeholder="Problem description and constraints..." 
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                    value={newLab.description}
                    onChange={e => setNewLab({...newLab, description: e.target.value})}
                    required
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Learning Objectives
                  </h3>
                  <button type="button" onClick={addObjective} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">+ Add</button>
                </div>
                <div className="space-y-2">
                   {newLab.learningObjectives?.map((obj, i) => (
                     <input 
                       key={i}
                       placeholder={`Objective ${i+1}`}
                       className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                       value={obj}
                       onChange={e => updateObjective(i, e.target.value)}
                     />
                   ))}
                </div>
              </section>
            </div>

            <div className="space-y-8 flex flex-col">
              <section className="flex-1 min-h-[300px] flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Initial Skeleton Code
                </h3>
                <div className="flex-1 bg-[#1a1a1a] rounded-2xl p-6 relative border border-white/10">
                  <textarea 
                    className="w-full h-full bg-transparent text-emerald-400 code-font text-sm outline-none resize-none scrollbar-thin"
                    value={newLab.starterCode}
                    onChange={e => setNewLab({...newLab, starterCode: e.target.value})}
                    spellCheck={false}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div> Test Case Suite
                  </h3>
                  <button type="button" onClick={addTestCase} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest">+ Add Case</button>
                </div>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                    {newLab.testCases?.map((tc, i) => (
                      <div key={tc.id} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                              placeholder="Input"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs code-font dark:text-white"
                              value={tc.input}
                              onChange={e => updateTestCase(i, 'input', e.target.value)}
                            />
                            <input 
                              placeholder="Expected Output"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs code-font text-emerald-600"
                              value={tc.expectedOutput}
                              onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)}
                            />
                         </div>
                      </div>
                    ))}
                </div>
              </section>
            </div>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={() => saveExperiment('draft')}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] hover:bg-slate-200 transition-all"
            >
              Save as Draft
            </button>
            <button 
              onClick={() => saveExperiment('published')}
              className="flex-[2] bg-indigo-600 text-white py-6 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-indigo-700 transition-all"
            >
              {editingId ? 'Push Updates' : 'Deploy Experiment'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title & Identity</th>
              <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status & Deadline</th>
              <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Classrooms</th>
              <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredLabs.map((lab) => (
              <tr key={lab.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-8">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{lab.title}</p>
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">{lab.category} • {lab.difficulty}</p>
                </td>
                <td className="p-8">
                    <div className="flex flex-col gap-2">
                        <span className={`w-fit px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                            lab.status === 'published' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border-emerald-100 dark:border-emerald-800' 
                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-800'
                        }`}>
                            {lab.status}
                        </span>
                        {lab.deadline ? (
                            <span className={`text-[9px] font-bold uppercase tracking-tight ${
                                Date.now() > lab.deadline ? 'text-red-500' : 'text-slate-400'
                            }`}>
                                {Date.now() > lab.deadline ? 'Expired: ' : 'Due: '}
                                {new Date(lab.deadline).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                        ) : (
                            <span className="text-[9px] text-slate-300 italic uppercase">No deadline set</span>
                        )}
                    </div>
                </td>
                <td className="p-8">
                    <div className="flex flex-wrap gap-1.5">
                        {lab.targetGrades?.map(tg => {
                           const cls = classrooms.find(c => c.id === tg);
                           return (
                               <span key={tg} className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                                   {cls ? cls.name : tg}
                               </span>
                           );
                        })}
                    </div>
                </td>
                <td className="p-8 text-right">
                  <div className="flex justify-end gap-6 items-center">
                    {lab.status === 'draft' && (
                        <button 
                            onClick={() => handlePublishNow(lab)}
                            className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:underline"
                        >
                            Deploy
                        </button>
                    )}
                    <button onClick={() => startEditing(lab)} className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:underline">Edit</button>
                    <button onClick={() => handleDelete(lab.id, lab.title)} className="text-red-500 text-[10px] font-black uppercase tracking-widest">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 

export default ManageLabs;
