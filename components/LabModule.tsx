
import React, { useState, useEffect } from 'react';
import { LabExperiment, Submission, User } from '../types.ts';
import CodeEditor from './CodeEditor.tsx';
import { BackendService } from '../services/backend.ts';

interface LabModuleProps {
  lab: LabExperiment;
  user: User;
  onBack: () => void;
  classId?: string; // Passed from the LabHub selection
}

const LabModule: React.FC<LabModuleProps> = ({ lab, user, onBack, classId }) => {
  const [currentCode, setCurrentCode] = useState(lab.starterCode || "");
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasLoadedExisting, setHasLoadedExisting] = useState(false);

  useEffect(() => {
    const unsub = BackendService.listenToSubmissions(user.role, user.id, undefined, (subs) => {
        const mySub = subs?.find(s => s.labId === lab.id);
        if (mySub) {
            setSubmission(mySub);
            if (!hasLoadedExisting) {
                setCurrentCode(mySub.code);
                setHasLoadedExisting(true);
            }
        }
    });
    return () => unsub();
  }, [lab.id, user.id, hasLoadedExisting]);

  const handleEditorFinalSubmit = async (submittedCode: string, allPassed: boolean) => {
    if (!allPassed) {
        alert("Verification Failed: Your solution must pass all test cases before it can be saved in your student records.");
        return;
    }

    setIsSyncing(true);
    const newSubmission: Submission = {
      labId: lab.id,
      classId: classId || (user.grades && user.grades[0]) || 'general',
      userId: user.id,
      userName: user.name,
      code: submittedCode,
      status: 'graded', 
      submittedAt: Date.now(),
    };
    
    try {
        await BackendService.submitLab(newSubmission);
        setSubmission(newSubmission);
        alert("All Tests Passed: Your solution has been submitted for review.");
    } catch (e) {
        console.error("Submission failed:", e);
        alert("Connection Error: Could not save solution. Please try again.");
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col -m-6 md:-m-10 bg-[#0f0f0f] text-slate-300">
      <div className="bg-[#1a1a1a] border-b border-white/5 h-14 md:h-12 flex items-center justify-between px-4 shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center min-w-max">
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded text-slate-400 mr-2 md:mr-4 flex items-center gap-2 text-[10px] md:text-xs font-bold transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
              <span className="hidden sm:inline">Back to Hub</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
            <div className="flex items-center gap-2 px-3 md:px-4 h-full border-b-2 border-indigo-500 text-[10px] md:text-xs font-semibold text-indigo-500 whitespace-nowrap">
              <svg width="12" height="12" className="md:w-[14px] md:h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Experiment Lab
            </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
            {submission?.status === 'graded' && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 md:px-3 md:py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[8px] md:text-[9px] font-black uppercase text-emerald-500 tracking-widest whitespace-nowrap">Submitted</span>
                </div>
            )}
            {isSyncing && (
                <span className="text-[8px] md:text-[9px] font-black uppercase text-indigo-400 tracking-widest animate-pulse whitespace-nowrap">Syncing...</span>
            )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Question Panel */}
        <div className="w-full lg:w-[40%] xl:w-[35%] border-b lg:border-b-0 lg:border-r border-white/10 overflow-y-auto bg-[#121212] p-6 md:p-8 scrollbar-thin scrollbar-thumb-white/10">
          <div className="mb-6 md:mb-8">
            <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
              {lab.title}
            </h1>
            <div className="flex items-center gap-3 md:gap-4 mt-3 md:mt-4 text-[9px] md:text-[10px] font-bold">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 uppercase tracking-widest">
                {lab.difficulty}
              </div>
              <div className="text-slate-500 uppercase tracking-widest">
                {lab.category}
              </div>
            </div>
          </div>

          <div className="space-y-6 md:space-y-8">
            <div className="leading-relaxed text-slate-300 text-sm md:text-base">
              {lab.description}
            </div>

            <div className="space-y-4">
              <h3 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 pb-2">Learning Objectives</h3>
              <ul className="space-y-2 text-xs md:text-sm text-slate-400">
                {lab.learningObjectives?.map((obj, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-indigo-500 font-black shrink-0">0{i+1}</span>
                    <span>{obj}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {submission?.feedback && (
               <div className="p-5 md:p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl md:rounded-3xl">
                  <h4 className="text-[8px] md:text-[9px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-3">Teacher Review</h4>
                  <p className="text-xs md:text-sm text-indigo-100/80 leading-relaxed italic">"{submission.feedback}"</p>
               </div>
            )}
          </div>
        </div>

        {/* Code Editor Panel */}
        <div className="flex-1 bg-[#1a1a1a] flex flex-col relative min-h-[400px] lg:min-h-0">
          <CodeEditor 
            initialCode={currentCode} 
            onCodeChange={setCurrentCode} 
            testCases={lab.testCases || []}
            onFinalSubmit={handleEditorFinalSubmit}
          />
        </div>
      </div>
    </div>
  );
};

export default LabModule;
