
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
  const [code, setCode] = useState('# Collaborative Python Workspace\n# Write your code here and press Execute\n\nname = input("Enter your name: ")\nprint(f"Welcome to Python IDLE, {name}!")');
  const [replInput, setReplInput] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pyodide, setPyodide] = useState<any>(null);
  const [history, setHistory] = useState<string[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const replInputRef = useRef<HTMLInputElement>(null);

  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [activeInputValue, setActiveInputValue] = useState('');
  const activeInputRef = useRef<HTMLInputElement>(null);
  const inputResolverRef = useRef<((val: string) => void) | null>(null);

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

        await py.runPythonAsync(`
import ast
import builtins
import js

async def __async_input(prompt=""):
    p = str(prompt) if prompt is not None else ""
    res = await js.window.__get_terminal_input(p)
    return str(res) if res is not None else ""

builtins.input = __async_input

class TerminalInputTransformer(ast.NodeTransformer):
    def __init__(self):
        self.async_funcs = set()

    def visit_Call(self, node):
        self.generic_visit(node)
        
        is_input = False
        if isinstance(node.func, ast.Name) and node.func.id in ('input', 'custom_input', '__async_input'):
            is_input = True
        elif isinstance(node.func, ast.Attribute) and node.func.attr == 'input':
            is_input = True

        if is_input:
            return ast.Await(
                value=ast.Call(
                    func=ast.Name(id='__async_input', ctx=ast.Load()),
                    args=node.args,
                    keywords=node.keywords
                )
            )

        if isinstance(node.func, ast.Name) and node.func.id in self.async_funcs:
            return ast.Await(value=node)

        return node

    def visit_FunctionDef(self, node):
        self.generic_visit(node)
        has_await = any(isinstance(n, ast.Await) for n in ast.walk(node))
        if has_await:
            self.async_funcs.add(node.name)
            return ast.AsyncFunctionDef(
                name=node.name,
                args=node.args,
                body=node.body,
                decorator_list=node.decorator_list,
                returns=node.returns,
                type_comment=getattr(node, 'type_comment', None)
            )
        return node

def __transform_code(user_code_str):
    if not user_code_str:
        return ""
    sanitized = user_code_str.replace('\xa0', ' ').replace('\r\n', '\n').replace('\r', '\n')
    if 'input' not in sanitized:
        return sanitized
    try:
        parsed = ast.parse(sanitized)
        transformer = TerminalInputTransformer()
        for _ in range(3):
            parsed = transformer.visit(parsed)
        ast.fix_missing_locations(parsed)
        return ast.unparse(parsed)
    except Exception:
        return sanitized
        `);

        setPyodide(py);
        setTerminalHistory([{ type: 'info', content: 'Python Runtime Initialized. Environment Ready.' }]);
      } catch (e) { console.error(e); }
    }
    init();
  }, []);

  useEffect(() => {
    if (activePrompt !== null && activeInputRef.current) {
      activeInputRef.current.focus();
    }
  }, [activePrompt]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    if (mode === 'repl' && replInputRef.current && activePrompt === null) {
      replInputRef.current.focus();
    }
  }, [terminalHistory, mode, activePrompt]);

  const cancelPendingInput = () => {
    if (inputResolverRef.current) {
      inputResolverRef.current("");
      inputResolverRef.current = null;
    }
    setActivePrompt(null);
    setActiveInputValue('');
  };

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleActiveInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = activeInputValue;
    const prompt = activePrompt || '';

    setTerminalHistory(prev => [
      ...prev,
      { type: 'stdin', content: `${prompt}${val}\n` }
    ]);

    setActivePrompt(null);
    setActiveInputValue('');

    if (inputResolverRef.current) {
      const resolve = inputResolverRef.current;
      inputResolverRef.current = null;
      resolve(val);
    }
  };

  const runScript = async () => {
    if (!pyodide || isExecuting) return;
    cancelPendingInput();
    setIsExecuting(true);
    setTerminalHistory(prev => [...prev, { type: 'info', content: '\n[Executing Script in Python IDLE...]' }]);
    
    try {
      (window as any).__get_terminal_input = (promptText: string) => {
        return new Promise<string>((resolve) => {
          setActivePrompt(promptText || "Input: ");
          setActiveInputValue('');
          inputResolverRef.current = resolve;
        });
      };

      const cleanCode = (code || '').replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
      const transformFunc = pyodide.globals.get("__transform_code");
      const transformedCode = transformFunc ? transformFunc(cleanCode) : cleanCode;

      await pyodide.runPythonAsync(transformedCode);

      setTerminalHistory(prev => [...prev, { type: 'info', content: '[Process finished]' }]);
    } catch (e: any) {
      setTerminalHistory(prev => [...prev, { type: 'stderr', content: `Runtime Error: ${e.message}` }]);
    } finally {
      setIsExecuting(false);
      setActivePrompt(null);
    }
  };

  const handleReplSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pyodide || !replInput.trim() || isExecuting) return;
    
    const cmd = replInput.trim();
    setTerminalHistory(prev => [...prev, { type: 'prompt', content: `>>> ${cmd}` }]);
    setHistory(prev => [cmd, ...prev]);
    setReplInput('');
    setIsExecuting(true);

    try {
      (window as any).__get_terminal_input = (promptText: string) => {
        return new Promise<string>((resolve) => {
          setActivePrompt(promptText || "Input: ");
          setActiveInputValue('');
          inputResolverRef.current = resolve;
        });
      };

      const cleanCmd = cmd.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');
      const transformFunc = pyodide.globals.get("__transform_code");
      const transformedCmd = transformFunc ? transformFunc(cleanCmd) : cleanCmd;

      const result = await pyodide.runPythonAsync(transformedCmd);

      if (result !== undefined) {
        setTerminalHistory(prev => [...prev, { type: 'stdout', content: String(result) }]);
      }
    } catch (e: any) {
      setTerminalHistory(prev => [...prev, { type: 'stderr', content: e.message }]);
    } finally {
      setIsExecuting(false);
      setActivePrompt(null);
    }
  };

  // Fixed Style Definition for Parity
  const editorStyles: React.CSSProperties = {
    fontFamily: "'Fira Code', monospace",
    fontSize: "14px",
    lineHeight: "24px",
    tabSize: 4,
    padding: "32px",
    paddingTop: "24px",
    margin: 0,
    border: "none",
    boxSizing: "border-box",
    letterSpacing: "normal",
    fontVariantLigatures: "none",
    textAlign: "left",
    whiteSpace: "pre",
    wordBreak: "normal"
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // 1. Enter key: Auto-indent and Colon handling
    if (e.key === 'Enter') {
      e.preventDefault();
      const beforeCursor = value.substring(0, selectionStart);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const currentLine = beforeCursor.substring(lineStart);

      const indentMatch = currentLine.match(/^([ \t]*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';

      const lineCodeWithoutComments = currentLine.replace(/#.*$/, '').trimEnd();
      const endsWithColon = lineCodeWithoutComments.endsWith(':');

      const nextIndent = currentIndent + (endsWithColon ? '    ' : '');
      const textToInsert = '\n' + nextIndent;

      const afterCursor = value.substring(selectionEnd);
      const updatedCode = beforeCursor + textToInsert + afterCursor;

      setCode(updatedCode);

      const newCursorPos = selectionStart + textToInsert.length;
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
          syncScroll();
        }
      });
      return;
    }

    // 2. Tab key: Indent or Block Indent / Shift+Tab: Dedent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        // Shift + Tab: Dedent
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const lineEnd = value.indexOf('\n', selectionEnd);
        const effectiveEnd = lineEnd === -1 ? value.length : lineEnd;
        const selectedBlock = value.substring(lineStart, effectiveEnd);
        const lines = selectedBlock.split('\n');

        let removedCountFirstLine = 0;
        let totalRemoved = 0;

        const dedentedLines = lines.map((line, idx) => {
          let toRemove = 0;
          if (line.startsWith('    ')) toRemove = 4;
          else if (line.startsWith('\t')) toRemove = 1;
          else if (line.startsWith('  ')) toRemove = 2;
          else if (line.startsWith(' ')) toRemove = 1;

          if (idx === 0) removedCountFirstLine = toRemove;
          totalRemoved += toRemove;
          return line.substring(toRemove);
        });

        const newBlock = dedentedLines.join('\n');
        const updatedCode = value.substring(0, lineStart) + newBlock + value.substring(effectiveEnd);

        setCode(updatedCode);

        requestAnimationFrame(() => {
          if (textareaRef.current) {
            if (selectionStart === selectionEnd) {
              const newPos = Math.max(lineStart, selectionStart - removedCountFirstLine);
              textareaRef.current.selectionStart = newPos;
              textareaRef.current.selectionEnd = newPos;
            } else {
              textareaRef.current.selectionStart = Math.max(lineStart, selectionStart - removedCountFirstLine);
              textareaRef.current.selectionEnd = Math.max(lineStart, selectionEnd - totalRemoved);
            }
            syncScroll();
          }
        });
      } else {
        // Tab: Indent 4 spaces
        if (selectionStart === selectionEnd) {
          const updatedCode = value.substring(0, selectionStart) + '    ' + value.substring(selectionEnd);
          setCode(updatedCode);
          const newPos = selectionStart + 4;
          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = newPos;
              textareaRef.current.selectionEnd = newPos;
              syncScroll();
            }
          });
        } else {
          const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
          const lineEnd = value.indexOf('\n', selectionEnd);
          const effectiveEnd = lineEnd === -1 ? value.length : lineEnd;
          const selectedBlock = value.substring(lineStart, effectiveEnd);
          const lines = selectedBlock.split('\n');
          const indentedLines = lines.map(line => '    ' + line);
          const newBlock = indentedLines.join('\n');
          const totalAdded = lines.length * 4;
          const updatedCode = value.substring(0, lineStart) + newBlock + value.substring(effectiveEnd);

          setCode(updatedCode);

          requestAnimationFrame(() => {
            if (textareaRef.current) {
              textareaRef.current.selectionStart = selectionStart + 4;
              textareaRef.current.selectionEnd = selectionEnd + totalAdded;
              syncScroll();
            }
          });
        }
      }
      return;
    }

    // 3. Backspace on 4-space tab indentation
    if (e.key === 'Backspace' && selectionStart === selectionEnd) {
      const beforeCursor = value.substring(0, selectionStart);
      const lineStart = beforeCursor.lastIndexOf('\n') + 1;
      const currentLineBeforeCursor = beforeCursor.substring(lineStart);

      if (/^[ ]+$/.test(currentLineBeforeCursor) && currentLineBeforeCursor.length >= 4 && currentLineBeforeCursor.length % 4 === 0) {
        e.preventDefault();
        const updatedCode = value.substring(0, selectionStart - 4) + value.substring(selectionEnd);
        setCode(updatedCode);
        const newPos = selectionStart - 4;
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            syncScroll();
          }
        });
        return;
      }
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
            <div className="flex-1 relative mt-16 overflow-hidden">
              <pre 
                ref={highlightRef} 
                style={editorStyles}
                className="absolute inset-0 whitespace-pre pointer-events-none overflow-hidden text-slate-800 dark:text-slate-300"
                dangerouslySetInnerHTML={{ __html: highlightPython(code) + '\n' }} 
              />
              <textarea 
                ref={textareaRef} 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                onKeyDown={handleKeyDown}
                onScroll={syncScroll} 
                spellCheck={false}
                style={editorStyles}
                className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-indigo-600 focus:outline-none resize-none scrollbar-thin overflow-auto" 
              />
            </div>
          </div>
        </div>

        <div className={`flex-1 flex flex-col gap-6 min-h-0 transition-all duration-500 ${mode === 'repl' ? 'lg:flex-[3]' : 'lg:flex-[2]'}`}>
          <div className="flex-1 bg-slate-900 dark:bg-black rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
            <div className="px-8 py-4 border-b border-white/10 bg-slate-950 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mode === 'repl' ? 'Python REPL Shell' : 'Python IDLE Output Screen'}</span>
               </div>
               <div className="flex items-center gap-3">
                 {isExecuting && <span className="text-[9px] font-bold text-indigo-400 animate-pulse uppercase tracking-wider">Executing...</span>}
                 <button onClick={() => setTerminalHistory([])} className="text-[9px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest">Clear Shell</button>
               </div>
            </div>
            <div 
              className="flex-1 p-8 overflow-y-auto scrollbar-thin code-font text-sm leading-relaxed text-slate-300 cursor-text select-text"
              onClick={() => {
                if (activePrompt !== null && activeInputRef.current) {
                  activeInputRef.current.focus();
                }
              }}
            >
              {terminalHistory.map((line, idx) => (
                <div key={idx} className={`mb-1 ${line.type === 'prompt' ? 'mt-4' : ''}`}>
                  {line.type === 'stdout' && <span className="text-white whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'stderr' && <span className="text-red-400 font-bold whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'stdin' && <span className="text-emerald-400 font-bold whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'prompt' && <span className="text-indigo-400 font-bold whitespace-pre-wrap">{line.content}</span>}
                  {line.type === 'info' && <span className="text-slate-500 italic block mt-2 border-t border-white/5 pt-2 text-[10px]">{line.content}</span>}
                </div>
              ))}

              {activePrompt !== null && (
                <form onSubmit={handleActiveInputSubmit} className="flex items-center flex-wrap gap-x-1 my-1">
                  <span className="text-white whitespace-pre code-font text-sm font-normal">{activePrompt}</span>
                  <input
                    ref={activeInputRef}
                    type="text"
                    value={activeInputValue}
                    onChange={e => setActiveInputValue(e.target.value)}
                    className="flex-1 min-w-[120px] bg-transparent text-emerald-400 font-bold caret-emerald-400 code-font text-sm outline-none border-none p-0 m-0 focus:outline-none focus:ring-0"
                    autoFocus
                  />
                </form>
              )}

              <div ref={terminalEndRef} />
            </div>
            {mode === 'repl' && (
              <form onSubmit={handleReplSubmit} className="p-6 bg-slate-950 border-t border-white/5 flex items-center gap-4">
                <span className="text-indigo-500 font-black">{"\u003E\u003E\u003E"}</span>
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
