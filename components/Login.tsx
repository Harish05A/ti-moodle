
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

  const schoolLogoUrl = "https://tischool.org/wp-content/uploads/2023/11/ti-school.png";
  const buildingHeroUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR49WioaHLTJRJ_Nj0MBaAYqsrWAy_HuQEiGw&s";
  const foundationLogoUrl = "https://tischool.org/wp-content/uploads/2024/05/amm-foundation-logo-white.png";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      {/* Left side: School Building Hero (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-indigo-900">
         <img 
            src={buildingHeroUrl} 
            alt="TI School Ambattur Building" 
            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay"
         />
         <div className="relative z-10 p-20 flex flex-col justify-end text-white bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent h-full">
            <h1 className="text-6xl font-black tracking-tighter leading-none mb-6">TI School Ambattur</h1>
            <p className="text-xl font-bold text-indigo-100 max-w-md">Empowering future innovators through technology and comprehensive computer science education.</p>
            <div className="mt-12 flex items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 w-fit">
               <img 
                 src={schoolLogoUrl} 
                 alt="TI Crest" 
                 className="w-12 h-12 object-contain"
               />
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Motto</p>
                  <p className="text-sm font-bold uppercase tracking-tight italic">Lead Us to Light</p>
               </div>
            </div>
         </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all relative">
          
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
            <img 
               src={schoolLogoUrl} 
               alt="TI School Logo" 
               className="w-24 h-24 mx-auto mb-6 object-contain"
            />
            <h1 className="text-3xl font-black text-white tracking-tight">Student Login</h1>
            <p className="text-slate-400 text-[10px] mt-3 font-black uppercase tracking-[0.3em] opacity-80">Learning Management System</p>
          </div>

          <form onSubmit={handleLogin} className="p-12 space-y-8">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold animate-pulse text-center uppercase tracking-wider">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 group-focus-within:text-indigo-600 transition-colors">Roll Number</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 2024CS001"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-600 dark:focus:border-indigo-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 dark:text-white"
                />
              </div>

              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 group-focus-within:text-indigo-600 transition-colors">Password</label>
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
                'Authorize Entry'
              )}
            </button>
          </form>
          
          {/* Foundation Branding */}
          <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 bg-slate-950">
             <div className="flex items-center gap-4 opacity-90 hover:opacity-100 transition-all cursor-default">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    <img 
                    src={foundationLogoUrl} 
                    alt="A.M.M. Foundation" 
                    className="w-full h-full object-contain p-1"
                    onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-[8px] font-black text-indigo-600">AMM</span>' }}
                    />
                </div>
                <div className="h-6 w-[1px] bg-white/20"></div>
                <div className="text-left">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Affiliated with</p>
                  <p className="text-[10px] font-black text-white uppercase tracking-tighter">A.M.M. Foundation</p>
                </div>
             </div>
          </div>
        </div>
        
        <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center uppercase tracking-[0.4em] font-black mt-12 opacity-50">
          TI School • Ambattur • Chennai
        </p>
      </div>
    </div>
  );
};

export default Login;
