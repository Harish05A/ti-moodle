
import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { BackendService } from '../services/backend';

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'student' as Role,
    gradeInput: '' 
  });

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const all = await BackendService.getAllUsers();
      setUsers(all);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const grades = formData.gradeInput.split(',').map(g => g.trim()).filter(Boolean);

    try {
      if (editingId) {
        await BackendService.updateAccount(editingId, {
            name: formData.name,
            role: formData.role,
            grades: grades
        });
        setSuccess(`Account updated successfully.`);
      } else {
        await BackendService.createAccount({
            name: formData.name,
            username: formData.username,
            role: formData.role,
            grades: grades
        });
        setSuccess(`User account created.`);
      }
      
      setFormData({ name: '', username: '', role: 'student', gradeInput: '' });
      setShowForm(false);
      setEditingId(null);
      fetchUsers();
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 4000);
    }
  };

  const startEdit = (user: User) => {
    setFormData({
        name: user.name,
        username: user.username,
        role: user.role,
        gradeInput: user.grades?.join(', ') || ''
    });
    setEditingId(user.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRevoke = async (userId: string, name: string) => {
    if (window.confirm(`Permanently remove access for student ${name}?`)) {
        try {
            await BackendService.deleteUser(userId);
            setSuccess(`User account removed.`);
            fetchUsers();
        } catch (e) {
            setError("Error processing request.");
        }
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <p className="text-indigo-600 font-black uppercase tracking-widest text-[10px] mb-2">Accounts Manager</p>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Student & Faculty Registry</h1>
        </div>
        <button 
          onClick={() => {
            if (showForm) { setEditingId(null); setFormData({ name: '', username: '', role: 'student', gradeInput: '' }); }
            setShowForm(!showForm);
          }}
          className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
            showForm ? 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm' : 'bg-indigo-600 text-white shadow-lg'
          }`}
        >
          {showForm ? 'Cancel' : 'Add New User'}
        </button>
      </header>

      {success && (
         <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 text-center animate-in slide-in-from-top-4">
           {success}
         </div>
      )}

      {showForm && (
        <form onSubmit={handleCreateOrUpdate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 shadow-xl space-y-8 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Name</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Student ID / Username</label>
              <input 
                required
                disabled={!!editingId}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white disabled:opacity-50"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Account Role</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as Role})}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Classes (Comma separated)</label>
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white"
                value={formData.gradeInput}
                onChange={e => setFormData({...formData, gradeInput: e.target.value})}
                placeholder="e.g. 11-A, 12-CS"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:opacity-90 transition-all">
            {editingId ? 'Update Account' : 'Register User'}
          </button>
        </form>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name & Role</th>
              <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Classes</th>
              <th className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-8">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{u.role}</p>
                </td>
                <td className="p-8">
                    <div className="flex flex-wrap gap-2">
                        {u.grades?.map(g => (
                            <span key={g} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md text-[8px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800/50">
                                {g}
                            </span>
                        ))}
                    </div>
                </td>
                <td className="p-8 text-right">
                  <div className="flex justify-end gap-6">
                    <button onClick={() => startEdit(u)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">Edit</button>
                    <button onClick={() => handleRevoke(u.id, u.name)} className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:underline">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUsers;
