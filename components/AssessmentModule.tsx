
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
  
  const answersRef = useRef(answers);
  const isSyncing = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const activeQuestions = useMemo(() => {
    const mcqs = assessment.questionBank.filter(q => q.type === 'mcq').sort(() => 0.5 - Math.random());
    const coding = assessment.questionBank.filter(q => q.type === 'coding').sort(() => 0.5 - Math.random());
    
    const pickedMcqs = mcqs.slice(0, assessment.randomMcqCount || 0);
    const pickedCoding = coding.slice(0, assessment.randomCodingCount || 0);
    
    return [...pickedMcqs, ...pickedCoding].sort(() => 0.5 - Math.random());
  }, [assessment]);

  const handleSubmissionAction = useCallback(async (isAuto = false) => {
    if (isSyncing.current) return;

    if (!isAuto) {
      if (!window.confirm("Submit Assessment?\n\nThis will end your test and submit all answers. You cannot return once submitted.")) return;
    }

    isSyncing.current = true;
    setIsSubmitting(true);
    
    const currentAnswers = answersRef.current;
    let finalScore = 0;
    let totalPointsPossible = 0;

    activeQuestions.forEach(q => {
      totalPointsPossible += q.points;
      const studentAnswer = currentAnswers[q.id];
      if (q.type === 'mcq') {
        if (studentAnswer !== undefined && studentAnswer === q.correctOptionIndex) {
          finalScore += q.points;
        }
      } else if (studentAnswer && String(studentAnswer).trim().length > 5) {
        finalScore += q.points; 
      }
    });

    const submissionPayload: AssessmentSubmission = {
      assessmentId: assessment.id,
      userId: user.id,
      userName: user.name,
      classId, 
      answers: currentAnswers,
      score: finalScore,
      totalPoints: totalPointsPossible,
      submittedAt: Date.now(),
      status: 'completed'
    };

    try {
      await BackendService.submitAssessment(submissionPayload);
      
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch (e) { /* ignore */ }
      }

      if (isAuto) {
        alert("The assessment has been automatically submitted due to system policy.");
      } else {
        alert(`Assessment successfully submitted.\n\nScore: ${finalScore} / ${totalPointsPossible}`);
      }
      
      onBack(true); 
    } catch (error: any) {
      console.error("Submission Failure:", error);
      alert(`Network error: ${error.message || "Failed to reach server"}. Please try again.`);
      isSyncing.current = false;
      setIsSubmitting(false); 
    }
  }, [assessment.id, user.id, user.name, classId, activeQuestions, onBack]);

  useEffect(() => {
    const handleGlobalSubmit = () => handleSubmissionAction(true);
    window.addEventListener('force-assessment-submit', handleGlobalSubmit);
    return () => window.removeEventListener('force-assessment-submit', handleGlobalSubmit);
  }, [handleSubmissionAction]);

  useEffect(() => {
    if (!isStarted || isSyncing.current) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        setIsTabActive(false);
        setIntegrityAttempts(prev => {
          const next = prev - 1;
          if (next <= 0 && !isSyncing.current) {
            handleSubmissionAction(true); 
          }
          return next;
        });
      } else {
        setIsTabActive(true);
      }
    };

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    const timerInterval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1 && !isSyncing.current) {
          handleSubmissionAction(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      clearInterval(timerInterval);
    };
  }, [isStarted, handleSubmissionAction]);

  const launchTest = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsStarted(true);
      setIsFullscreen(true);
    } catch (err) {
      alert("Please enable fullscreen mode to begin the assessment.");
    }
  };

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  if (!isStarted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-12 text-center space-y-8 shadow-xl">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl mx-auto flex items-center justify-center text-indigo-600 shadow-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Secure Assessment</h2>
            <p className="text-slate-500 text-xs font-medium leading-relaxed">System monitoring will be active during this test. Please ensure you have finished all tasks before clicking submit.</p>
          </div>
          <button 
            onClick={launchTest}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg"
          >
            Begin Test
          </button>
        </div>
      </div>
    );
  }

  if ((!isFullscreen || !isTabActive) && !isSyncing.current) {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
        <div className="max-w-lg space-y-8">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mx-auto text-amber-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          <h1 className="text-4xl font-black text-white uppercase">Focus Notice</h1>
          <p className="text-slate-300 text-sm font-bold tracking-widest">Integrity Allowance: {integrityAttempts}/5 Tokens Remaining</p>
          <button onClick={() => document.documentElement.requestFullscreen()} className="px-12 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest shadow-2xl hover:bg-slate-50 transition-all">Return to Assessment</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-900 text-slate-300 select-none overflow-hidden relative rounded-[3rem] border border-white/5">
      
      {isSubmitting && (
        <div className="absolute inset-0 z-[1000] bg-slate-950/98 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 animate-in fade-in duration-300">
          <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-indigo-400 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Saving Results...</p>
        </div>
      )}

      <div className="bg-[#1a1a1a] border-b border-white/5 h-16 flex items-center justify-between px-8 shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <h2 className="text-sm font-black text-white uppercase tracking-widest truncate max-w-[200px]">{assessment.title}</h2>
          </div>
          <div className="h-6 w-[1px] bg-white/10"></div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Remaining Attempts: {integrityAttempts}</p>
        </div>
        
        <div className="flex items-center gap-8">
          <div className="bg-slate-800 border border-white/5 px-4 py-1.5 rounded-full">
             <span className={`text-xs font-black font-mono ${timeLeft < 300 ? 'text-amber-500 animate-pulse' : 'text-slate-300'}`}>
               {formatTimer(timeLeft)}
             </span>
          </div>
          <button 
            type="button"
            onClick={() => handleSubmissionAction()}
            disabled={isSubmitting}
            className="px-8 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
          >
            Submit Test
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[45%] border-r border-white/10 overflow-y-auto bg-slate-900 p-10 scrollbar-thin">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-indigo-400">Question {currentQuestionIndex + 1}</span>
            <h3 className="text-xl font-bold text-white leading-relaxed">{activeQuestions[currentQuestionIndex].text}</h3>
            
            {activeQuestions[currentQuestionIndex].type === 'mcq' && (
              <div className="space-y-4 pt-4">
                {activeQuestions[currentQuestionIndex].options?.map((opt, i) => (
                  <button 
                    key={i}
                    disabled={isSubmitting}
                    onClick={() => setAnswers(prev => ({ ...prev, [activeQuestions[currentQuestionIndex].id]: i }))}
                    className={`w-full text-left p-6 rounded-2xl border transition-all flex items-center gap-4 group ${answers[activeQuestions[currentQuestionIndex].id] === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-[#1a1a1a] border-white/5 text-slate-400 hover:border-white/10'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${answers[activeQuestions[currentQuestionIndex].id] === i ? 'bg-white text-indigo-600' : 'bg-white/5 text-slate-500'}`}>{String.fromCharCode(65 + i)}</div>
                    <span className="font-medium">{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 bg-slate-950">
          {activeQuestions[currentQuestionIndex].type === 'coding' && (
            <CodeEditor 
              initialCode={answers[activeQuestions[currentQuestionIndex].id] || activeQuestions[currentQuestionIndex].starterCode || ""}
              onCodeChange={(val) => setAnswers(prev => ({ ...prev, [activeQuestions[currentQuestionIndex].id]: val }))}
              testCases={activeQuestions[currentQuestionIndex].testCases || []}
              hideSubmit={true}
            />
          )}
          {activeQuestions[currentQuestionIndex].type === 'mcq' && (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
               <p className="text-[10px] font-black uppercase tracking-widest mt-4">Multiple Choice Question</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-16 bg-[#1a1a1a] border-t border-white/5 flex items-center justify-between px-8 shrink-0">
        <button 
          disabled={currentQuestionIndex === 0 || isSubmitting} 
          onClick={() => setCurrentQuestionIndex(prev => prev - 1)} 
          className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
        >
          Previous
        </button>
        <div className="flex gap-3">
          {activeQuestions.map((_, i) => (
            <div 
              key={i} 
              onClick={() => !isSubmitting && setCurrentQuestionIndex(i)} 
              className={`h-1.5 w-10 rounded-full transition-all cursor-pointer ${currentQuestionIndex === i ? 'bg-indigo-600 w-16' : answers[activeQuestions[i].id] !== undefined ? 'bg-emerald-500' : 'bg-white/10'}`} 
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button 
            disabled={currentQuestionIndex === activeQuestions.length - 1 || isSubmitting} 
            onClick={() => setCurrentQuestionIndex(prev => prev + 1)} 
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white disabled:opacity-20 transition-colors"
          >
            Next
          </button>
          
          {currentQuestionIndex === activeQuestions.length - 1 && (
            <button 
              type="button"
              onClick={() => handleSubmissionAction()}
              disabled={isSubmitting}
              className="ml-4 px-10 py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg disabled:opacity-50"
            >
              Final Submission
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentModule;
