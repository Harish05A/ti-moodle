
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
  type: 'stdout' | 'stderr' | 'stdin' | 'info';
  content: string;
}

const PythonCompiler: React.FC = () => {
  const [code, setCode] = useState('# Interactive Python Compiler\nname = input("Enter your name: ")\nprint(f"Hello, {name}!")\n\nage = int(input("How old are you? "))\nif age >= 18:\n    print("You are an adult.")\nelse:\n    print("You are a minor.")');
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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
      } catch (e) { console.error(e); }
    }
    init();
  }, []);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory]);

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const run = async () => {
    if (!pyodide || isExecuting) return;
    setIsExecuting(true);
    setTerminalHistory([{ type: 'info', content: '>>> Initializing execution context...' }]);
    
    try {
      // Direct injection into globals as js_input_proxy
      pyodide.globals.set("js_input_proxy", (promptText: string) => {
        const val = window.prompt(promptText || "Input requested:") || "";
        setTerminalHistory(prev => [
            ...prev, 
            { type: 'stdout', content: promptText },
            { type: 'stdin', content: val }
        ]);
        return val;
      });

      await pyodide.runPythonAsync(`
import builtins
def custom_input(prompt=""):
    # js_input_proxy is globally accessible from pyodide.globals.set
    return js_input_proxy(prompt)
builtins.input = custom_input
      `);

      await pyodide.runPythonAsync(code);
      setTerminalHistory(prev => [...prev, { type: 'info', content: '\n[Process completed successfully]' }]);
    } catch (e: any) {
      setTerminalHistory(prev => [...prev, { type: 'stderr', content: `\nTraceback (most recent call last):\n${e.message}` }]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-center shrink-0">
        <div>
          <p className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-1">Advanced Scratchpad</p>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Python Compiler</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setTerminalHistory([])} className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 tracking-widest">
            Clear Terminal
          </button>
          <button onClick={run} disabled={isExecuting}
            className={`px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all flex items-center gap-2 ${
              isExecuting ? 'bg-slate-400 text-white' : 'bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white shadow-indigo-500/10'
            }`}>
            {isExecuting && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isExecuting ? 'Running...' : 'Run Program'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
        {/* Code Editor Container */}
        <div className="flex-[3] min-h-[500px] bg-white dark:bg-[#1e1e1e] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden group flex flex-col transition-colors duration-300">
           <div className="absolute top-4 left-4 z-10 opacity-100 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/5 pointer-events-none">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em]">
                editor.py
              </span>
           </div>
           
           <div className="flex-1 relative mt-12">
             <pre ref={highlightRef} className="absolute inset-0 p-8 pt-0 code-font text-sm whitespace-pre pointer-events-none overflow-hidden m-0 text-slate-800 dark:text-slate-300"
               dangerouslySetInnerHTML={{ __html: highlightPython(code) + '\n' }} />
             <textarea 
              ref={textareaRef}
              value={code} 
              onChange={e => setCode(e.target.value)} 
              onScroll={syncScroll}
              spellCheck={false}
               className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-slate-900 dark:caret-white p-8 pt-0 code-font text-sm focus:outline-none resize-none m-0 border-none scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-white/10" />
           </div>
        </div>

        {/* Terminal Container */}
        <div className="flex-1 lg:max-w-[450px] bg-slate-900 dark:bg-black rounded-3xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 bg-slate-950 dark:bg-[#0a0a0a] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-red-500/80"></div>
               <div className="w-2 h-2 rounded-full bg-amber-500/80"></div>
               <div className="w-2 h-2 rounded-full bg-emerald-500/80"></div>
               <span className="ml-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Standard Output</span>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 code-font text-xs leading-relaxed bg-slate-900 dark:bg-[#050505]">
            {terminalHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 pointer-events-none text-white">
                 <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mb-4"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-center">Output console<br/>Press Run to begin</p>
              </div>
            )}
            
            {terminalHistory.map((line, idx) => (
              <div key={idx} className="mb-1 animate-in fade-in duration-300">
                {line.type === 'stdout' && (
                  <span className="text-emerald-400 whitespace-pre-wrap">{line.content}</span>
                )}
                {line.type === 'stderr' && (
                  <span className="text-red-400 font-bold whitespace-pre-wrap">{line.content}</span>
                )}
                {line.type === 'stdin' && (
                  <span className="text-white font-black underline decoration-indigo-500 underline-offset-4">{line.content}</span>
                )}
                {line.type === 'info' && (
                  <span className="text-slate-500 italic block mt-2 border-t border-white/5 pt-2">{line.content}</span>
                )}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-center gap-4 shrink-0 transition-colors duration-300">
         <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
         </div>
         <p className="text-xs text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed">
           <strong className="block mb-0.5 uppercase tracking-wider text-[10px] opacity-70">Interaction Note</strong>
           This compiler supports real-time input. When your code uses <code>input()</code>, respond in the popup that appears.
         </p>
      </div>
    </div>
  );
};

export default PythonCompiler;
