
import React, { useState } from 'react';
import { User } from '../types.ts';
import { BackendService } from '../services/backend.ts';

interface ProfileSetupProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const AVATARS = ['👨‍💻', '👩‍💻', '🚀', '🧠', '👾', '🐱‍💻', '🤖', '⚡'];

const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  const handleFinalize = async () => {
    if (password.length < 6) {
        setError('Security key must be at least 6 characters.');
        return;
    }
    setIsSyncing(true);
    setError('');
    try {
      const profileData = { 
        bio, 
        avatar: selectedAvatar,
        isFirstLogin: false 
      };
      
      await BackendService.finalizeProfile(user.id, password, profileData);
      
      onComplete({
        ...user,
        ...profileData
      });
    } catch (e: any) {
      setError(e.message || 'Synchronization failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
        
        <div className="bg-indigo-600 p-10 text-white relative">
          <div className="absolute top-4 right-10 flex gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-white' : 'w-4 bg-white/30'}`} />
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Campus Onboarding</p>
          <h1 className="text-3xl font-black tracking-tight">
            {step === 1 && "Security Protocol"}
            {step === 2 && "Identity Design"}
            {step === 3 && "Persona Selection"}
          </h1>
        </div>

        <div className="p-10">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center border border-red-100 dark:border-red-900/30">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Define Your New Access Key</label>
                <input 
                  type="password"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white font-bold text-lg"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 ml-2 italic">Choose a strong password to protect your academic records.</p>
              </div>
              <button 
                onClick={() => password.length >= 6 ? setStep(2) : setError('Security key too weak.')}
                className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500 transition-all"
              >
                Next Phase
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Academic Biography</label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white h-40 resize-none font-medium leading-relaxed"
                  placeholder="Tell us about your interests in tech or what you hope to achieve this year..."
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Back</button>
                <button onClick={() => setStep(3)} className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500 transition-all">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-10 animate-in slide-in-from-right-10">
              <div className="grid grid-cols-4 gap-4">
                {AVATARS.map(a => (
                  <button
                    key={a}
                    onClick={() => setSelectedAvatar(a)}
                    className={`h-24 rounded-[2rem] text-4xl flex items-center justify-center transition-all ${selectedAvatar === a ? 'bg-indigo-600 shadow-xl shadow-indigo-500/40 scale-110' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button disabled={isSyncing} onClick={() => setStep(2)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-2xl font-black text-xs uppercase tracking-widest">Back</button>
                <button 
                  disabled={isSyncing}
                  onClick={handleFinalize}
                  className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Initializing...
                    </>
                  ) : "Complete Setup"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
