
import React, { useState, useEffect, useRef } from 'react';
import { TestCase } from '../types';

interface TestResult {
  id: string;
  status: 'passed' | 'failed' | 'running' | 'idle' | 'error';
  actualOutput?: string;
  error?: string;
  isHidden?: boolean;
}

interface CodeEditorProps {
  initialCode: string;
  onCodeChange?: (code: string) => void;
  testCases?: TestCase[];
  onFinalSubmit?: (code: string, allPassed: boolean) => void;
  hideSubmit?: boolean;
}

const highlightPython = (code: string) => {
  if (!code) return '';
  
  let h = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const tokens: { [key: string]: string } = {};
  let tokenCount = 0;
  const addToken = (html: string) => {
    const key = `__TK${tokenCount++}__`;
    tokens[key] = html;
    return key;
  };

  h = h.replace(/(""".*?"""|'''.*?''')/gs, (m) => addToken(`<span class="text-amber-400 opacity-90">${m}</span>`));
  h = h.replace(/(#.*)/g, (m) => addToken(`<span class="text-slate-500 italic">${m}</span>`));
  h = h.replace(/(".*?"|'.*?')/g, (m) => addToken(`<span class="text-amber-400">${m}</span>`));
  h = h.replace(/(@[\w.]+)/g, (m) => addToken(`<span class="text-yellow-300 opacity-80 italic">${m}</span>`));
  h = h.replace(/\bdef\s+([\w_]+)\b/g, (m, name) => `def ` + addToken(`<span class="text-sky-400 font-semibold">${name}</span>`));
  h = h.replace(/\bclass\s+([\w_]+)\b/g, (m, name) => `class ` + addToken(`<span class="text-rose-400 font-bold">${name}</span>`));
  const keywords = /\b(def|class|if|else|elif|for|while|return|import|from|as|try|except|finally|with|pass|break|continue|del|global|nonlocal|assert|raise|yield|async|await|and|or|not|in|is|lambda)\b/g;
  h = h.replace(keywords, (m) => addToken(`<span class="text-indigo-400 font-bold">${m}</span>`));
  const constants = /\b(True|False|None|self|cls)\b/g;
  h = h.replace(constants, (m) => addToken(`<span class="text-orange-400 italic">${m}</span>`));
  const builtins = /\b(print|input|int|float|str|list|dict|set|tuple|range|len|max|min|sum|open|sorted|reversed|enumerate|zip|map|filter|all|any|abs|pow|round|id|type|chr|ord|bin|hex|oct|super|classmethod|staticmethod|property|isinstance|issubclass|vars|dir|help|eval|exec)\b/g;
  h = h.replace(builtins, (m) => addToken(`<span class="text-emerald-400 font-medium">${m}</span>`));
  h = h.replace(/\b(\d+(\.\d+)?)\b/g, (m) => addToken(`<span class="text-pink-400 font-mono">${m}</span>`));

  Object.keys(tokens).sort((a, b) => parseInt(b.replace(/\D/g, '')) - parseInt(a.replace(/\D/g, ''))).forEach(key => {
    h = h.replace(key, tokens[key]);
  });

  return h;
};

const CodeEditor: React.FC<CodeEditorProps> = ({ initialCode, onCodeChange, testCases = [], onFinalSubmit, hideSubmit }) => {
  const [code, setCode] = useState(initialCode || "");
  const [stdout, setStdout] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [activeTab, setActiveTab] = useState<'testcase' | 'result' | 'stdout'>('testcase');
  const [customInput, setCustomInput] = useState(testCases[0]?.input || '');
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);
  const [verdict, setVerdict] = useState<'accepted' | 'failed' | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (initialCode !== undefined) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    async function init() {
      try {
        const loader = (window as any).loadPyodide;
        if (!loader) return;
        const py = await loader({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
        py.setStdout({ batched: (t: string) => setStdout(p => p + t + '\n') });
        setPyodide(py);
      } catch (e) { console.error(e); }
    }
    init();
  }, []);

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const runCode = async (isSubmission: boolean) => {
    if (!pyodide) return;
    setIsProcessing(true);
    setStdout('');
    setVerdict(null);
    setActiveTab('result');
    setDrawerOpen(true);

    const casesToRun = isSubmission ? testCases : [
        { id: 'custom', input: customInput, expectedOutput: '?', isHidden: false }
    ];

    const results: TestResult[] = [];
    let allPassed = true;

    for (const tc of casesToRun) {
      try {
        pyodide.globals.set("_input_val", tc.input);
        await pyodide.runPythonAsync(`
import sys, io, builtins
sys.stdout = io.StringIO()
_lines = str(_input_val).split('\\n')
_idx = 0
def mock_in(p=""):
    global _idx
    if _idx < len(_lines):
        v = _lines[_idx]; _idx += 1; return v
    raise EOFError()
builtins.input = mock_in
        `);
        await pyodide.runPythonAsync(code);
        const actual = pyodide.runPython("sys.stdout.getvalue()").trim();
        
        if (isSubmission) {
            const passed = actual === tc.expectedOutput.trim();
            results.push({ id: tc.id, status: passed ? 'passed' : 'failed', actualOutput: actual, isHidden: tc.isHidden });
            if (!passed) allPassed = false;
        } else {
            results.push({ id: 'custom', status: 'idle', actualOutput: actual });
        }
      } catch (e: any) {
        results.push({ id: tc.id, status: 'error', error: e.message });
        allPassed = false;
      }
    }

    setTestResults(results);
    setIsProcessing(false);
    if (isSubmission) {
        setVerdict(allPassed ? 'accepted' : 'failed');
        if (onFinalSubmit) onFinalSubmit(code, allPassed);
    }
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false);
    runCode(true);
  };

  const currentResult = testResults[selectedCaseIdx];

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] overflow-hidden text-slate-300">
      <div className="bg-[#1a1a1a] border-b border-white/5 px-4 py-2 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <select className="bg-[#2a2a2a] text-slate-300 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-emerald-500">
            <option>Python3</option>
          </select>
          <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
          {!hideSubmit && (
            <button 
              onClick={() => setShowSubmitConfirm(true)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/10 disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
              Submit for Grading
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-4">
           <button title="Reset" onClick={() => setCode(initialCode)} className="text-slate-500 hover:text-white transition-colors">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
           </button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#1a1a1a] border-r border-white/5 flex flex-col items-center pt-8 text-[11px] text-slate-600 font-mono select-none">
          {Array.from({length: 40}).map((_,i) => <div key={i} className="h-[20px] leading-[20px]">{i+1}</div>)}
        </div>
        
        <div className="absolute inset-0 ml-12 overflow-hidden">
            <pre ref={highlightRef} className="absolute inset-0 p-8 pt-0 mt-8 code-font text-[13px] leading-[20px] whitespace-pre pointer-events-none overflow-hidden m-0"
              dangerouslySetInnerHTML={{ __html: highlightPython(code) + '\n' }} />
            <textarea ref={textareaRef} value={code} onChange={e => { setCode(e.target.value); onCodeChange?.(e.target.value); }}
              onScroll={syncScroll} spellCheck={false}
              className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-white p-8 pt-0 mt-8 code-font text-[13px] focus:outline-none resize-none leading-[20px] m-0 border-none scrollbar-thin scrollbar-thumb-white/10" />
        </div>
      </div>

      <div className={`transition-all duration-300 flex flex-col ${drawerOpen ? 'h-72' : 'h-10'} bg-[#121212] border-t border-white/10`}>
        <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/5 shrink-0">
          <div className="flex gap-4">
            {['testcase', 'result', 'stdout'].map((t: any) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`text-[10px] font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${activeTab === t ? 'text-emerald-500 border-emerald-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => runCode(false)} disabled={isProcessing} className="text-[10px] font-bold text-white px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-[10px] border border-white/10 transition-all">
                {isProcessing ? 'Executing...' : 'Run Code'}
             </button>
             {hideSubmit && (
               <button onClick={() => runCode(true)} disabled={isProcessing} className="text-[10px] font-bold text-emerald-500 px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-[10px] border border-emerald-500/20 transition-all">
                  Run All Tests
               </button>
             )}
             <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
             <button onClick={() => setDrawerOpen(!drawerOpen)} className="p-1 hover:text-white text-slate-500 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={drawerOpen ? 'rotate-180' : ''}><path d="m18 15-6-6-6 6"/></svg>
             </button>
          </div>
        </div>

        {drawerOpen && (
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 bg-[#0c0c0c]">
            {activeTab === 'testcase' && (
              <div className="space-y-4 max-w-2xl animate-in fade-in duration-300">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                  Custom Test Input
                </p>
                <textarea 
                  value={customInput} onChange={e => setCustomInput(e.target.value)}
                  className="w-full h-24 bg-[#1a1a1a] border border-white/5 rounded-lg p-4 code-font text-xs text-slate-300 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                  placeholder="Enter inputs here..." />
              </div>
            )}

            {activeTab === 'result' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {testResults.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] py-20">No execution results available</div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex gap-2 flex-wrap">
                      {testResults.map((r, i) => (
                        <button key={i} onClick={() => setSelectedCaseIdx(i)}
                          className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all flex items-center gap-2 border ${
                            selectedCaseIdx === i ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-slate-500 border-transparent hover:bg-white/10'}`}>
                          {r.id === 'custom' ? 'Standard Run' : (r.isHidden ? `Case ${i+1} 🔒` : `Case ${i+1}`)}
                          <div className={`w-1 h-1 rounded-full ${r.status === 'passed' ? 'bg-emerald-500' : r.status === 'idle' ? 'bg-slate-500' : 'bg-red-500'}`} />
                        </button>
                      ))}
                    </div>
                    
                    {currentResult && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {currentResult.isHidden ? (
                          <div className="col-span-2 bg-[#1a1a1a] rounded-2xl p-8 border border-white/5 text-center space-y-3">
                            <div className="w-10 h-10 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-slate-500">
                               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hidden Test Case</p>
                            <div className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] ${currentResult.status === 'passed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                               Status: {currentResult.status === 'passed' ? 'Passed' : 'Failed'}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Actual Output</p>
                              <pre className={`p-4 rounded-xl text-xs code-font bg-[#1a1a1a] border border-white/5 min-h-[60px] ${currentResult.status === 'passed' ? 'text-emerald-400' : 'text-red-400'}`}>
                                {currentResult.actualOutput || currentResult.error || '(no output)'}
                              </pre>
                            </div>
                            {currentResult.id !== 'custom' && (
                               <div className="space-y-3">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Expected Output</p>
                                <pre className="p-4 rounded-xl text-xs code-font bg-[#1a1a1a] border border-white/5 text-emerald-500/70 min-h-[60px]">
                                  {testCases[selectedCaseIdx]?.expectedOutput}
                                </pre>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'stdout' && (
               <div className="animate-in fade-in duration-300">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Logs & Debug Info</p>
                 <pre className="text-xs code-font text-emerald-500/50 bg-[#1a1a1a] p-6 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
                   {stdout || 'Process finished with no logs.'}
                 </pre>
               </div>
            )}
          </div>
        )}
      </div>

      {!hideSubmit && showSubmitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center text-2xl shadow-xl shadow-indigo-600/20">🚀</div>
            <h2 className="text-2xl font-black text-white tracking-tight uppercase tracking-widest">Final Submission</h2>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">Are you sure you want to finalize this experiment? Your solution will be sent to your instructor for evaluation.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmSubmit}
                className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/10"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {verdict && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className={`p-10 rounded-3xl border shadow-2xl text-center max-w-sm w-full transform transition-all ${verdict === 'accepted' ? 'bg-[#0a2010] border-emerald-500/50 text-emerald-100' : 'bg-[#200a0a] border-red-500/50 text-red-100'}`}>
            <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-3xl font-bold ${verdict === 'accepted' ? 'bg-emerald-50 text-white' : 'bg-red-500 text-white'}`}>
              {verdict === 'accepted' ? '✓' : '✕'}
            </div>
            <h2 className="text-3xl font-black uppercase tracking-[0.2em] mb-2">{verdict === 'accepted' ? 'Accepted' : 'Failed'}</h2>
            <div className="h-[1px] w-12 bg-white/10 mx-auto mb-4"></div>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-8 leading-relaxed">
              {verdict === 'accepted' ? 'Passed all validation tests, including hidden cases.' : 'Solution failed on one or more validation test cases.'}
            </p>
            <button onClick={() => setVerdict(null)} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${verdict === 'accepted' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} text-white shadow-xl shadow-black/40`}>Return to IDE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodeEditor;
