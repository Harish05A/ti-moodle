
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
  const [code, setCode] = useState('# Collaborative Python Workspace\n# Write your code here and press Execute\n\ndef greet(name):\n    return f"Welcome to TI Moodle, {name}!"\n\nprint(greet("Student"))');
  const [stdin, setStdin] = useState('Input parameters...');
  const [replInput, setReplInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
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
        setTerminalHistory([{ type: 'info', content: 'Python Runtime Initialized. Environment Ready.' }]);
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

  const runScript = async () => {
    if (!pyodide || isExecuting) return;
    setIsExecuting(true);
    setTerminalHistory(prev => [...prev, { type: 'info', content: '\n[Executing Script...]' }]);
    
    try {
      pyodide.globals.set("_stdin_content", stdin);
      await pyodide.runPythonAsync(`
import builtins
import sys
_stdin_lines = str(_stdin_content).split('\\n')
_line_idx = 0
def custom_input(prompt=""):
    global _line_idx
    if prompt: print(prompt, end="")
    if _line_idx < len(_stdin_lines):
        val = _stdin_lines[_line_idx]; _line_idx += 1; print(val); return val
    return ""
builtins.input = custom_input
      `);
      await pyodide.runPythonAsync(code);
      setTerminalHistory(prev => [...prev, { type: 'info', content: '[Finished]' }]);
    } catch (e: any) {
      setTerminalHistory(prev => [...prev, { type: 'stderr', content: `Runtime Error: ${e.message}` }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReplSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pyodide || !replInput.trim() || isExecuting) return;
    
    const cmd = replInput.trim();
    setTerminalHistory(prev => [...prev, { type: 'prompt', content: `>>> ${cmd}` }]);
    setHistory(prev => [cmd, ...prev]);
    setReplInput('');
    setHistoryIdx(-1);
    setIsExecuting(true);

    try {
      // Direct execution in global scope for REPL behavior
      const result = await pyodide.runPythonAsync(cmd);
      if (result !== undefined) {
        setTerminalHistory(prev => [...prev, { type: 'stdout', content: String(result) }]);
      }
    } catch (e: any) {
      setTerminalHistory(prev => [...prev, { type: 'stderr', content: e.message }]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4">
        <div>
          <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-1">Interactive Sandbox</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Coding Lab</h1>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-2xl border border-slate-300 dark:border-slate-700">
             <button onClick={() => setMode('script')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'script' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-lg' : 'text-slate-500'}`}>Editor</button>
             <button onClick={() => setMode('repl')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'repl' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-lg' : 'text-slate-500'}`}>Interactive REPL</button>
          </div>

          {mode === 'script' ? (
            <button onClick={runScript} disabled={isExecuting} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-500 transition-all flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m5 3 14 9-14 9V3z"/></svg>
              Execute
            </button>
          ) : (
            <button onClick={() => setTerminalHistory([])} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest">Clear Logs</button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        <div className={`flex-[3] transition-all duration-500 ${mode === 'repl' ? 'opacity-40 grayscale scale-95 lg:flex-[1]' : ''}`}>
          <div className="h-full bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden flex flex-col">
            <div className="absolute top-6 left-8 z-10 flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">workspace.py</span>
            </div>
            <div className="flex-1 relative mt-16">
              <pre ref={highlightRef} className="absolute inset-0 p-8 pt-0 code-font text-sm whitespace-pre pointer-events-none overflow-hidden text-slate-800 dark:text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: highlightPython(code) + '\n' }} />
              <textarea ref={textareaRef} value={code} onChange={e => setCode(e.target.value)} onScroll={syncScroll} spellCheck={false}
                className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-indigo-600 p-8 pt-0 code-font text-sm focus:outline-none resize-none m-0 border-none scrollbar-thin" />
            </div>
          </div>
        </div>

        <div className={`flex-1 flex flex-col gap-6 min-h-0 transition-all duration-500 ${mode === 'repl' ? 'lg:flex-[3]' : 'lg:max-w-[450px]'}`}>
          {mode === 'script' && (
            <div className="h-1/4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col overflow-hidden">
               <div className="px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-950 text-[9px] font-black text-slate-400 uppercase tracking-widest">Standard Input</div>
               <textarea value={stdin} onChange={e => setStdin(e.target.value)} className="flex-1 p-6 bg-transparent text-slate-700 dark:text-indigo-300 code-font text-xs focus:outline-none resize-none" />
            </div>
          )}

          <div className="flex-1 bg-slate-900 dark:bg-black rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
            <div className="px-8 py-4 border-b border-white/10 bg-slate-950 flex justify-between items-center shrink-0">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{mode === 'repl' ? 'Python Interpreter' : 'System Logs'}</span>
               {isExecuting && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
            </div>
            <div className="flex-1 p-8 overflow-y-auto scrollbar-thin code-font text-sm leading-relaxed text-slate-300">
              {terminalHistory.map((line, idx) => (
                <div key={idx} className={`mb-1 ${line.type === 'prompt' ? 'mt-4' : ''}`}>
                  {line.type === 'stdout' && <span className="text-white whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'stderr' && <span className="text-red-400 font-bold whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'prompt' && <span className="text-indigo-500 font-black">{line.content}</span>}
                  {line.type === 'info' && <span className="text-slate-500 italic block mt-2 border-t border-white/5 pt-2 text-[10px]">{line.content}</span>}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
            {mode === 'repl' && (
              <form onSubmit={handleReplSubmit} className="p-6 bg-slate-950 border-t border-white/5 flex items-center gap-4">
                <span className="text-indigo-500 font-black">>>></span>
                <input ref={replInputRef} type="text" value={replInput} onChange={e => setReplInput(e.target.value)} className="flex-1 bg-transparent text-white code-font text-sm outline-none placeholder:opacity-20" placeholder="Type command..." />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PythonCompiler;
