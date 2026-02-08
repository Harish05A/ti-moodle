
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
    // Listen for current lab submission from backend
    const unsub = BackendService.listenToSubmissions(user.role, user.id, undefined, (subs) => {
        const mySub = subs?.find(s => s.labId === lab.id);
        if (mySub) {
            setSubmission(mySub);
            // Only overwrite the editor code once when the lab first loads
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
        alert("Validation Failed: Your solution must pass all test cases before it can be archived in the campus vault.");
        return;
    }

    setIsSyncing(true);
    const newSubmission: Submission = {
      labId: lab.id,
      classId: classId || (user.grades && user.grades[0]) || 'general',
      userId: user.id,
      userName: user.name,
      code: submittedCode,
      status: 'graded', // Automated Verification
      submittedAt: Date.now(),
    };
    
    try {
        await BackendService.submitLab(newSubmission);
        // Explicitly update local state to reflect 'graded' immediately
        setSubmission(newSubmission);
        alert("Verification Success: Your solution has been verified and archived for instructor review.");
    } catch (e) {
        console.error("Submission failed:", e);
        alert("Network Protocol Error: Could not save solution to the vault.");
    } finally {
        setIsSyncing(false);
    }
  };

  return (
    <div className="h-screen flex flex-col -m-10 bg-[#0f0f0f] text-slate-300">
      <div className="bg-[#1a1a1a] border-b border-white/5 h-12 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center">
            <button onClick={onBack} className="p-2 hover:bg-white/5 rounded text-slate-400 mr-4 flex items-center gap-2 text-xs font-bold transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
              Back to Dashboard
            </button>
            <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
            <div className="flex items-center gap-2 px-4 h-full border-b-2 border-emerald-500 text-xs font-semibold text-emerald-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Experiment Lab
            </div>
        </div>

        <div className="flex items-center gap-4">
            {submission?.status === 'graded' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Verified Completion</span>
                </div>
            )}
            {isSyncing && (
                <div className="flex items-center gap-2 pr-4">
                    <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest animate-pulse">Synchronizing Vault...</span>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[45%] border-r border-white/10 overflow-y-auto bg-[#121212] p-8 scrollbar-thin scrollbar-thumb-white/10">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              {lab.title}
            </h1>
            <div className="flex items-center gap-4 mt-3 text-[10px] font-bold">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 uppercase tracking-widest">
                {lab.difficulty}
              </div>
              <div className="text-slate-500 uppercase tracking-widest">
                {lab.category}
              </div>
            </div>
          </div>

          <div className="prose prose-invert prose-sm max-w-none text-slate-400 space-y-6">
            <div className="leading-relaxed text-slate-300">
              {lab.description}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Objectives</h3>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {lab.learningObjectives?.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>
            
            {submission?.feedback && (
               <div className="mt-10 p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Faculty Feedback</h4>
                  <p className="text-xs text-indigo-100/80 leading-relaxed italic">"{submission.feedback}"</p>
               </div>
            )}
          </div>
        </div>

        <div className="flex-1 bg-[#1a1a1a] flex flex-col relative">
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
