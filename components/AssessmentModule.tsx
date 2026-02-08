
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Assessment, User, Question, AssessmentSubmission, Difficulty } from '../types.ts';
import { BackendService } from '../services/backend.ts';
import CodeEditor from './CodeEditor.tsx';

interface AssessmentModuleProps {
  assessment: Assessment;
  user: User;
  onBack: (force?: boolean) => void;
  classId: string;
}

const AssessmentModule: React.FC<AssessmentModuleProps> = ({ assessment, user, onBack, classId }) => {
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [id: string]: any }>({});
  const [timeLeft, setTimeLeft] = useState(assessment.durationMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Proctoring State
  const [integrityAttempts, setIntegrityAttempts] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTabActive, setIsTabActive] = useState(true);
  
  // Ref for submission lock to prevent double-submits across ticks
  const submissionStarted = useRef(false);
  const answersRef = useRef(answers);

  // Sync ref with answer state
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Stable questions list
  const activeQuestions = useMemo(() => {
    const mcqs = assessment.questionBank.filter(q => q.type === 'mcq').sort(() => 0.5 - Math.random());
    const coding = assessment.questionBank.filter(q => q.type === 'coding').sort(() => 0.5 - Math.random());
    
    const pickedMcqs = mcqs.slice(0, assessment.randomMcqCount || 0);
    const pickedCoding = coding.slice(0, assessment.randomCodingCount || 0);
    
    return [...pickedMcqs, ...pickedCoding].sort(() => 0.5 - Math.random());
  }, [assessment]);

  // Core submission function - removed timeLeft dependency to keep it stable
  const executeSubmission = useCallback(async (isAuto = false) => {
    if (submissionStarted.current) return;
    
    submissionStarted.current = true;
    setIsSubmitting(true);
    
    const finalAnswers = answersRef.current;
    let score = 0;
    let totalPossible = 0;

    activeQuestions.forEach(q => {
      totalPossible += q.points;
      const ans = finalAnswers[q.id];
      if (q.type === 'mcq') {
        if (ans !== undefined && ans === q.correctOptionIndex) {
          score += q.points;
        }
      } else if (ans && String(ans).trim().length > 10) {
        score += q.points; 
      }
    });

    const submission: AssessmentSubmission = {
      assessmentId: assessment.id,
      userId: user.id,
      userName: user.name,
      classId, 
      answers: finalAnswers,
      score,
      totalPoints: totalPossible,
      submittedAt: Date.now(),
      status: 'completed'
    };

    try {
      console.log("Submitting test to faculty server...", submission);
      await BackendService.submitAssessment(submission);
      
      // Attempt to clean up proctoring environment
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
      }

      if (isAuto) {
        alert("Integrity Protocol: Test terminated and submitted to the academic vault.");
      } else {
        alert(`Verification Success: Your results have been archived.\n\nFinal Score: ${score}/${totalPossible}`);
      }
      
      onBack(true); 
    } catch (e: any) {
      console.error("Submission Failure:", e);
      alert(`Sync Error: ${e.message || "Failed to transmit results. Please check your internet connection."}`);
      submissionStarted.current = false;
      setIsSubmitting(false); 
    }
  }, [assessment.id, user.id, user.name, classId, activeQuestions, onBack]);

  // Handle external force-submit events (e.g. from App.tsx navigation)
  useEffect(() => {
    const handleForce = () => executeSubmission(true);
    window.addEventListener('force-assessment-submit', handleForce);
    return () => window.removeEventListener('force-assessment-submit', handleForce);
  }, [executeSubmission]);

  // Timer and Proctoring
  useEffect(() => {
    if (!isStarted || submissionStarted.current) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
        setIntegrityAttempts(prev => {
          const next = prev - 1;
          if (next <= 0 && !submissionStarted.current) {
            executeSubmission(true); 
          }
          return next;
        });
      } else {
        setIsTabActive(true);
      }
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1 && !submissionStarted.current) {
          executeSubmission(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearInterval(timer);
    };
  }, [isStarted, executeSubmission]);

  const startSecureSession = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsStarted(true);
      setIsFullscreen(true);
    } catch (err) {
      alert("Proctoring Protocol: Fullscreen authorization is mandatory.");
    }
  };

  const reEnterFullscreen = async () => {
    try { await document.documentElement.requestFullscreen(); } catch (e) { /* ignore */ }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isStarted) {
    return (
      <div className="h-screen -m-10 bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[3rem] p-12 text-center space-y-8 shadow-2xl">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-xl shadow-indigo-600/20">🛡️</div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Authorized Assessment</h2>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">Automated proctoring active.</p>
          </div>
          <button 
            onClick={startSecureSession}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl"
          >
            Launch Test Protocol
          </button>
        </div>
      </div>
    );
  }

  if ((!isFullscreen || !isTabActive) && !submissionStarted.current) {
    return (
      <div className="fixed inset-0 z-[999] bg-red-950/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
        <div className="max-w-lg space-y-8">
          <div className="w-24 h-24 bg-red-600 rounded-full mx-auto flex items-center justify-center text-4xl text-white shadow-2xl animate-pulse">⚠️</div>
          <h1 className="text-4xl font-black text-white uppercase">Security Alert</h1>
          <p className="text-red-200 text-sm font-bold">Integrity Tokens: {integrityAttempts}</p>
          <button onClick={reEnterFullscreen} className="px-12 py-5 bg-white text-red-600 rounded-2xl font-black uppercase tracking-widest">Restore Session</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col -m-10 bg-[#0f0f0f] text-slate-300 select-none overflow-hidden relative">
      {isSubmitting && (
        <div className="absolute inset-0 z-[1000] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Synchronizing Data Vault...</p>
        </div>
      )}

      <div className="bg-red-600 h-1 w-full relative">
        <div className="absolute top-0 left-0 h-full bg-white transition-all duration-1000" style={{ width: `${(integrityAttempts / 5) * 100}%` }}></div>
      </div>

      <div className="bg-[#1a1a1a] border-b border-white/5 h-16 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">{assessment.title}</h2>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Health: {integrityAttempts}/5</p>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-full flex items-center gap-3">
             <span className={`text-xs font-black font-mono ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-300'}`}>
               {formatTime(timeLeft)}
             </span>
          </div>
          <button 
            type="button"
            onClick={() => window.confirm("Ready to finalize and submit your test?") && executeSubmission()}
            disabled={isSubmitting}
            className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-500 transition-all disabled:opacity-50"
          >
            {isSubmitting ? 'Syncing...' : 'Submit Test'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[45%] border-r border-white/10 overflow-y-auto bg-[#121212] p-10 scrollbar-thin">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-400">Task {currentQuestionIndex + 1}</span>
            <h3 className="text-2xl font-bold text-white leading-relaxed">{activeQuestions[currentQuestionIndex].text}</h3>
            {activeQuestions[currentQuestionIndex].type === 'mcq' && (
              <div className="space-y-4 pt-4">
                {activeQuestions[currentQuestionIndex].options?.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => setAnswers(prev => ({ ...prev, [activeQuestions[currentQuestionIndex].id]: i }))}
                    className={`w-full text-left p-6 rounded-2xl border transition-all flex items-center gap-4 ${answers[activeQuestions[currentQuestionIndex].id] === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-[#1a1a1a] border-white/5 text-slate-400 hover:border-white/10'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${answers[activeQuestions[currentQuestionIndex].id] === i ? 'bg-white text-indigo-600' : 'bg-white/5 text-slate-500'}`}>{String.fromCharCode(65 + i)}</div>
                    <span className="font-medium">{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 bg-[#1a1a1a]">
          {activeQuestions[currentQuestionIndex].type === 'coding' && (
            <CodeEditor 
              initialCode={answers[activeQuestions[currentQuestionIndex].id] || activeQuestions[currentQuestionIndex].starterCode || ""}
              onCodeChange={(val) => setAnswers(prev => ({ ...prev, [activeQuestions[currentQuestionIndex].id]: val }))}
              testCases={activeQuestions[currentQuestionIndex].testCases || []}
              hideSubmit={true}
            />
          )}
        </div>
      </div>

      <div className="h-16 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between px-8">
        <button disabled={currentQuestionIndex === 0} onClick={() => setCurrentQuestionIndex(prev => prev - 1)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20">Previous</button>
        <div className="flex gap-3">
          {activeQuestions.map((q, i) => (
            <div key={i} onClick={() => setCurrentQuestionIndex(i)} className={`h-1.5 w-10 rounded-full transition-all cursor-pointer ${currentQuestionIndex === i ? 'bg-indigo-600 w-16' : answers[activeQuestions[i].id] !== undefined ? 'bg-emerald-500' : 'bg-white/10'}`} />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button disabled={currentQuestionIndex === activeQuestions.length - 1} onClick={() => setCurrentQuestionIndex(prev => prev + 1)} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20">Next Question</button>
          {currentQuestionIndex === activeQuestions.length - 1 && (
            <button 
              type="button"
              onClick={() => window.confirm("Finish and submit now?") && executeSubmission()}
              disabled={isSubmitting}
              className="ml-4 px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 shadow-xl disabled:opacity-50"
            >
              Finalize Attempt
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentModule;
