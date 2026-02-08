
import React, { useState } from 'react';
import { User } from '../types';
import { BackendService } from '../services/backend';

interface LoginProps {
  onLogin: (user: User) => void;
  isDarkMode?: boolean;
  toggleTheme?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, isDarkMode, toggleTheme }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      const user = await BackendService.login(username, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or connection error.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all hover:scale-[1.01] relative">
        
        {toggleTheme && (
          <button 
            onClick={toggleTheme}
            className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:scale-110 transition-transform z-10"
          >
            {isDarkMode ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            )}
          </button>
        )}

        <div className="bg-slate-900 p-12 text-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-6 flex items-center justify-center font-bold text-4xl text-white shadow-2xl shadow-indigo-500/40 transform -rotate-3">
            TI
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">TI Moodle</h1>
          <p className="text-slate-400 text-sm mt-3 font-semibold uppercase tracking-widest opacity-80">Higher Secondary Portal</p>
        </div>

        <form onSubmit={handleLogin} className="p-12 space-y-8">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold animate-pulse text-center uppercase tracking-wider">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 group-focus-within:text-indigo-600 transition-colors">Credential ID</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or student_id"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 group-focus-within:text-indigo-600 transition-colors">Access Key</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-3 ${
              isLoggingIn 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                : 'bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 hover:shadow-indigo-500/20 active:scale-95'
            }`}
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Authorize Access'
            )}
          </button>

          <div className="flex flex-col items-center gap-4 pt-4">
            <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center uppercase tracking-widest font-black opacity-50">
              SECURE ACADEMIC INFRASTRUCTURE
            </p>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"></div>)}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
