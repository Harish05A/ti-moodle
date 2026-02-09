
import React, { useState, useEffect, useRef } from 'react';

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

interface TerminalLine {
  type: 'stdout' | 'stderr' | 'stdin' | 'info' | 'prompt';
  content: string;
}

const PythonCompiler: React.FC = () => {
  const [mode, setMode] = useState<'script' | 'repl'>('script');
  const [code, setCode] = useState('# Try out your Python code here\nname = input("Enter your name: ")\nprint(f"Hello, {name}!")\n\nage = int(input("How old are you? "))\nif age >= 18:\n    print("Welcome to the TI Moodle.")\nelse:\n    print("Keep learning!")');
  const [stdin, setStdin] = useState('Rahul\n17');
  const [replInput, setReplInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  
  // Command History for REPL
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const replInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function init() {
      try {
        const loader = (window as any).loadPyodide;
        if (!loader) return;
        const py = await loader({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
        
        py.setStdout({ batched: (t: string) => {
          setTerminalHistory(prev => [...prev, { type: 'stdout', content: t }]);
        }});
        py.setStderr({ batched: (t: string) => {
          setTerminalHistory(prev => [...prev, { type: 'stderr', content: t }]);
        }});

        setPyodide(py);
        setTerminalHistory([{ type: 'info', content: 'Python VM Loaded. Ready for input.' }]);
      } catch (e) { console.error(e); }
    }
    init();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (mode === 'repl' && replInputRef.current) {
      replInputRef.current.focus();
    }
  }, [terminalHistory, mode]);

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const setupInputMock = async (inputStr: string) => {
    if (!pyodide) return;
    pyodide.globals.set("_stdin_content", inputStr);
    await pyodide.runPythonAsync(`
import builtins
import sys

_stdin_lines = str(_stdin_content).split('\\n')
_line_idx = 0

def custom_input(prompt=""):
    global _line_idx
    if prompt:
        print(prompt, end="")
    
    if _line_idx < len(_stdin_lines):
        val = _stdin_lines[_line_idx]
        _line_idx += 1
        print(val)
        return val
    else:
        raise EOFError("No more input available in Stdin field.")

builtins.input = custom_input
    `);
  };

  const runScript = async () => {
    if (!pyodide || isExecuting) return;
    setIsExecuting(true);
    setTerminalHistory(prev => [...prev, { type: 'info', content: '\n>>> Running script...' }]);
    
    try {
      await setupInputMock(stdin);
      await pyodide.runPythonAsync(code);
      setTerminalHistory(prev => [...prev, { type: 'info', content: '[Process exited successfully]' }]);
    } catch (e: any) {
      setTerminalHistory(prev => [...prev, { type: 'stderr', content: `\nRuntime Error:\n${e.message}` }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReplSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pyodide || !replInput.trim() || isExecuting) return;
    
    const command = replInput.trim();
    setTerminalHistory(prev => [...prev, { type: 'prompt', content: `>>> ${command}` }]);
    setHistory(prev => [command, ...prev]);
    setReplInput('');
    setHistoryIdx(-1);
    setIsExecuting(true);

    try {
      // In REPL mode we don't mock input unless specifically requested by the code itself 
      // but for simple interactive commands we use a dummy input just in case
      await pyodide.runPythonAsync(`import builtins; builtins.input = lambda p="": ""`);
      
      // Try to evaluate the expression first to print its result (like standard REPL)
      try {
        const result = await pyodide.runPythonAsync(command);
        if (result !== undefined) {
          setTerminalHistory(prev => [...prev, { type: 'stdout', content: String(result) }]);
        }
      } catch (err) {
        // If evaluation fails, it might be a statement (e.g. x = 5), so run it as such
        await pyodide.runPythonAsync(command);
      }
    } catch (e: any) {
      setTerminalHistory(prev => [...prev, { type: 'stderr', content: e.message }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReplKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = historyIdx + 1;
      if (nextIdx < history.length) {
        setHistoryIdx(nextIdx);
        setReplInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = historyIdx - 1;
      if (nextIdx >= 0) {
        setHistoryIdx(nextIdx);
        setReplInput(history[nextIdx]);
      } else if (nextIdx === -1) {
        setHistoryIdx(-1);
        setReplInput('');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 px-2 md:px-0 gap-4">
        <div className="flex flex-col">
          <p className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-1">Advanced Development Hub</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Coding Lab</h1>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Mode Toggle */}
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl border border-slate-300 dark:border-slate-700">
             <button 
                onClick={() => setMode('script')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'script' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400'}`}
             >
                Script Editor
             </button>
             <button 
                onClick={() => setMode('repl')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'repl' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-400'}`}
             >
                Interactive Shell
             </button>
          </div>

          <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 hidden md:block"></div>

          {mode === 'script' ? (
            <button onClick={runScript} disabled={isExecuting}
              className={`flex-1 md:flex-none px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${
                isExecuting ? 'bg-slate-400 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/10'
              }`}>
              {isExecuting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 3 14 9-14 9V3z"/></svg>
              )}
              {isExecuting ? 'Running...' : 'Execute Script'}
            </button>
          ) : (
            <button onClick={() => setTerminalHistory([])} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
              Clear Console
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Workspace: Script Editor or REPL Visuals */}
        <div className={`flex-[3] flex flex-col min-h-[400px] lg:min-h-0 transition-all duration-500 ${mode === 'repl' ? 'opacity-50 grayscale pointer-events-none scale-95 lg:flex-[1]' : 'opacity-100'}`}>
          <div className="flex-1 bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="absolute top-6 left-8 z-10 flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/5 pointer-events-none">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">main.py</span>
            </div>
            
            <div className="flex-1 relative mt-16">
              <pre ref={highlightRef} className="absolute inset-0 p-8 pt-0 code-font text-sm whitespace-pre pointer-events-none overflow-hidden m-0 text-slate-800 dark:text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightPython(code) + '\n' }} />
              <textarea 
                ref={textareaRef}
                value={code} 
                onChange={e => setCode(e.target.value)} 
                onScroll={syncScroll}
                spellCheck={false}
                className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-slate-900 dark:caret-white p-8 pt-0 code-font text-sm focus:outline-none resize-none m-0 border-none scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10 leading-relaxed" 
              />
            </div>
          </div>
        </div>

        {/* Execution Area: Terminal and Inputs */}
        <div className={`flex-1 flex flex-col gap-6 min-h-0 transition-all duration-500 ${mode === 'repl' ? 'lg:flex-[3]' : 'lg:max-w-[450px]'}`}>
          
          {/* Stdin Panel (only in script mode) */}
          <div className={`transition-all duration-500 overflow-hidden ${mode === 'script' ? 'h-1/4' : 'h-0 opacity-0'}`}>
            <div className="h-full bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
              <div className="px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Program Stdin</span>
                <span className="text-[7px] font-bold uppercase bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded">Pre-filled</span>
              </div>
              <textarea 
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                placeholder="Line-by-line inputs..."
                className="flex-1 p-6 bg-transparent text-slate-700 dark:text-indigo-300 code-font text-xs focus:outline-none resize-none scrollbar-thin placeholder:opacity-30"
              />
            </div>
          </div>

          {/* Terminal Panel */}
          <div className="flex-1 bg-slate-900 dark:bg-[#050505] rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
            <div className="px-8 py-4 border-b border-white/10 bg-slate-950 dark:bg-[#0a0a0a] flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${isExecuting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mode === 'repl' ? 'Interactive Shell' : 'System Terminal'}</span>
               </div>
               {mode === 'repl' && <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter animate-pulse">Live Interpreter</span>}
            </div>
            
            <div className="flex-1 p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 code-font text-sm leading-relaxed text-slate-300">
              {terminalHistory.map((line, idx) => (
                <div key={idx} className={`mb-1 animate-in fade-in duration-300 ${line.type === 'prompt' ? 'mt-4' : ''}`}>
                  {line.type === 'stdout' && <span className="text-white whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'stderr' && <span className="text-red-400 font-bold whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'stdin' && <span className="text-indigo-400 font-black">{line.content}</span>}
                  {line.type === 'prompt' && <span className="text-indigo-500 font-black whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'info' && <span className="text-slate-500 italic block mt-2 border-t border-white/5 pt-2 text-[10px]">{line.content}</span>}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Interactive REPL Input */}
            {mode === 'repl' && (
              <div className="p-6 bg-slate-950 dark:bg-[#0a0a0a] border-t border-white/5">
                <form onSubmit={handleReplSubmit} className="flex items-center gap-4">
                  <span className="text-indigo-500 font-black shrink-0">>>></span>
                  <input 
                    ref={replInputRef}
                    type="text"
                    value={replInput}
                    onChange={e => setReplInput(e.target.value)}
                    onKeyDown={handleReplKeyDown}
                    placeholder="Type Python code and press Enter..."
                    className="flex-1 bg-transparent text-white code-font text-sm outline-none placeholder:opacity-20"
                    autoFocus
                  />
                  {isExecuting && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0"></div>}
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2rem] flex items-center gap-4 shrink-0 mx-2 md:mx-0">
         <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
         </div>
         <div className="text-[10px] md:text-xs">
           <p className="text-slate-900 dark:text-white font-black uppercase tracking-widest mb-0.5">Lab Assistant</p>
           <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
             {mode === 'script' 
               ? "Use the Script Editor for multi-line logic and full programs. Inputs are consumed from the Stdin panel."
               : "The Interactive Shell runs code immediately. It's perfect for testing functions or mathematical expressions."
             }
           </p>
         </div>
      </div>
    </div>
  );
};

export default PythonCompiler;
