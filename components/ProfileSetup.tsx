
import React, { useState } from 'react';
import { User } from '../types.ts';
import { BackendService } from '../services/backend.ts';

interface ProfileSetupProps {
  user: User;
  onComplete: (updatedUser: User) => void;
}

const AVATAR_ICONS = [
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>,
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-10 h-10"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
];

const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete }) => {
  const [step, setStep] = useState(1);
  const [password, setPassword] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  
  const [profileData, setProfileData] = useState({
    bio: '',
    dob: '',
    bloodGroup: '',
    parentName: '',
    phone: '',
    address: '',
    selectedIdx: 0
  });

  const handleFinalize = async () => {
    if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
    }
    setIsSyncing(true);
    setError('');
    try {
      const payload = { 
        bio: profileData.bio,
        dob: profileData.dob,
        bloodGroup: profileData.bloodGroup,
        parentName: profileData.parentName,
        phone: profileData.phone,
        address: profileData.address,
        avatar: `avatar-${profileData.selectedIdx}`,
        isFirstLogin: false 
      };
      
      await BackendService.finalizeProfile(user.id, password, payload);
      
      onComplete({
        ...user,
        ...payload
      });
    } catch (e: any) {
      setError(e.message || 'Update failed. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 overflow-y-auto">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 my-10">
        
        <div className="bg-indigo-600 p-10 text-white relative">
          <div className="absolute top-4 right-10 flex gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? 'w-8 bg-white' : 'w-4 bg-white/30'}`} />
            ))}
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-70 mb-2">Student Onboarding</p>
          <h1 className="text-3xl font-black tracking-tight">
            {step === 1 && "Account Security"}
            {step === 2 && "Personal Details"}
            {step === 3 && "Student Bio"}
            {step === 4 && "Avatar Selection"}
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Set Your Password</label>
                <input 
                  type="password"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white font-bold text-lg"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 ml-2 italic">Choose a secure password to protect your academic records.</p>
              </div>
              <button 
                onClick={() => password.length >= 6 ? setStep(2) : setError('Password is too short.')}
                className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500 transition-all"
              >
                Next Step
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-10">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Date of Birth</label>
                  <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none dark:text-white" value={profileData.dob} onChange={e => setProfileData({...profileData, dob: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Blood Group</label>
                  <input placeholder="e.g. O+" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none dark:text-white" value={profileData.bloodGroup} onChange={e => setProfileData({...profileData, bloodGroup: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Parent/Guardian Name</label>
                <input placeholder="Full Name" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none dark:text-white" value={profileData.parentName} onChange={e => setProfileData({...profileData, parentName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Phone Number</label>
                <input type="tel" placeholder="10-digit number" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none dark:text-white" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Residential Address</label>
                <textarea rows={2} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 outline-none dark:text-white resize-none" value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">Back</button>
                <button onClick={() => setStep(3)} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Continue</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Academic Statement</label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white h-40 resize-none font-medium leading-relaxed"
                  placeholder="Share your interests in Computer Science or your academic goals..."
                  value={profileData.bio}
                  onChange={e => setProfileData({...profileData, bio: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep(2)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Back</button>
                <button onClick={() => setStep(4)} className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500 transition-all">Continue</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-10 animate-in slide-in-from-right-10">
              <div className="grid grid-cols-3 gap-4">
                {AVATAR_ICONS.map((icon, idx) => (
                  <button
                    key={idx}
                    onClick={() => setProfileData({...profileData, selectedIdx: idx})}
                    className={`h-24 rounded-[2rem] flex items-center justify-center transition-all ${profileData.selectedIdx === idx ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-105' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex gap-4">
                <button disabled={isSyncing} onClick={() => setStep(3)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-5 rounded-2xl font-black text-xs uppercase tracking-widest">Back</button>
                <button 
                  disabled={isSyncing}
                  onClick={handleFinalize}
                  className="flex-[2] bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-3"
                >
                  {isSyncing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : "Complete Profile"}
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
