
import React, { useState, useEffect } from 'react';
import { LabExperiment, Classroom, User, Submission, Assessment, AssessmentSubmission } from '../types.ts';
import { BackendService } from '../services/backend.ts';

interface LabHubProps {
  user: User;
  labs: LabExperiment[];
  onSelectLab: (lab: LabExperiment) => void;
  onSelectAssessment: (assessment: Assessment) => void;
}

const LabHub: React.FC<LabHubProps> = ({ user, labs, onSelectLab, onSelectAssessment }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentSubmissions, setAssessmentSubmissions] = useState<AssessmentSubmission[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'labs' | 'tests'>('labs');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cls, allAssessments] = await Promise.all([
          BackendService.getClassrooms(user),
          BackendService.getAssessments()
        ]);
        setClassrooms(cls);
        setAssessments(allAssessments);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();

    const unsubLabs = BackendService.listenToSubmissions(user.role, user.id, undefined, (subs) => {
      setSubmissions(subs || []);
    });
    const unsubAssessments = BackendService.listenToAssessmentSubmissions(user.id, (subs) => {
      setAssessmentSubmissions(subs || []);
    });

    return () => {
      unsubLabs();
      unsubAssessments();
    };
  }, [user]);

  const filteredLabs = labs.filter(lab => {
    const isTargeted = selectedClassId ? lab.targetGrades.includes(selectedClassId) : false;
    const isVisible = user.role === 'student' ? lab.status === 'published' : true;
    return isTargeted && isVisible;
  });

  const filteredAssessments = assessments.filter(a => {
    const isTargeted = selectedClassId ? a.targetGrades.includes(selectedClassId) : false;
    const isVisible = user.role === 'student' ? a.status === 'published' : true;
    return isTargeted && isVisible;
  });

  const getDeadlineInfo = (ts?: number) => {
    if (!ts) return null;
    const isPast = Date.now() > ts;
    const isUrgent = !isPast && (ts - Date.now()) < 86400000;
    return {
      text: isPast ? 'Deadline Passed' : `Due: ${new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
      style: isPast ? 'bg-red-50 text-red-500 border-red-100 dark:bg-red-950/20 dark:border-red-900' : isUrgent ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900' : 'bg-slate-50 text-slate-400 border-slate-100 dark:bg-slate-800 dark:border-slate-700'
    };
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse">Scanning Classrooms...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <p className="text-indigo-600 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Resource Gateway</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {selectedClassId ? classrooms.find(c => c.id === selectedClassId)?.name : 'Academic Hub'}
          </h1>
          {selectedClassId && (
            <button 
              onClick={() => setSelectedClassId(null)}
              className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m15 18-6-6 6-6"/></svg>
              Switch Classroom
            </button>
          )}
        </div>

        {selectedClassId && (
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => setActiveTab('labs')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'labs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              Experiments
            </button>
            <button 
              onClick={() => setActiveTab('tests')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tests' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}
            >
              Assessments
            </button>
          </div>
        )}
      </header>

      {!selectedClassId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {classrooms.map(cls => {
            const classLabsCount = labs.filter(l => l.targetGrades.includes(cls.id)).length;
            const classTestsCount = assessments.filter(a => a.targetGrades.includes(cls.id)).length;

            return (
              <div 
                key={cls.id} 
                onClick={() => setSelectedClassId(cls.id)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-sm hover:shadow-2xl hover:border-indigo-400 cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                    📚
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 leading-tight">{cls.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cls.teacherName}</p>
                </div>
                <div className="mt-12 flex items-center gap-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                    {classLabsCount} Labs
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800/50">
                    {classTestsCount} Tests
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {activeTab === 'labs' ? (
            filteredLabs.map(lab => {
              const isCompleted = submissions.some(s => s.labId === lab.id && s.status === 'graded');
              return (
                <div 
                  key={lab.id} 
                  onClick={() => onSelectLab(lab)}
                  className={`bg-white dark:bg-slate-900 border rounded-[2.5rem] p-8 hover:shadow-xl cursor-pointer transition-all flex flex-col min-h-[220px] relative overflow-hidden ${isCompleted ? 'border-emerald-500/50 dark:border-emerald-500/30 shadow-emerald-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'}`}
                >
                  {isCompleted && (
                    <div className="absolute top-0 right-0 p-4">
                      <div className="bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5"/></svg>
                      </div>
                    </div>
                  )}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{lab.category}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded text-indigo-600">{lab.difficulty}</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">{lab.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 mb-6 flex-1">{lab.description}</p>
                  <div className="flex justify-end">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isCompleted ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-indigo-600 text-white shadow-indigo-500/30'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            filteredAssessments.map(assessment => {
              const isCompleted = assessmentSubmissions.some(s => s.assessmentId === assessment.id);
              const submission = assessmentSubmissions.find(s => s.assessmentId === assessment.id);
              return (
                <div 
                  key={assessment.id} 
                  onClick={() => !isCompleted && onSelectAssessment(assessment)}
                  className={`bg-white dark:bg-slate-900 border rounded-[2.5rem] p-8 hover:shadow-xl cursor-pointer transition-all flex flex-col min-h-[220px] relative overflow-hidden ${isCompleted ? 'border-emerald-500/50 dark:border-emerald-500/30 opacity-80' : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400'}`}
                >
                  {isCompleted && (
                    <div className="absolute top-0 right-0 p-6 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rotate-45 translate-x-12 -translate-y-4 w-32 text-center shadow-lg">
                      {submission?.score}/{submission?.totalPoints}
                    </div>
                  )}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-emerald-600">Graded Test</span>
                    <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">{assessment.durationMinutes} Mins</span>
                  </div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">{assessment.title}</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2 mb-6 flex-1">{assessment.description}</p>
                  <div className="flex justify-between items-center">
                    {/* Fix: use sum of random counts instead of non-existent randomPickCount */}
                    <span className="text-[9px] font-black uppercase text-slate-400">{(assessment.randomMcqCount || 0) + (assessment.randomCodingCount || 0)} Random Questions</span>
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-colors ${isCompleted ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white shadow-emerald-500/30'}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2v20M2 12h20"/></svg>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LabHub;
