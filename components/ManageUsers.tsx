import React, { useState, useEffect, useMemo } from 'react';
import { User, Role } from '../types';
import { BackendService } from '../services/backend';
import { 
  Search, 
  RotateCcw, 
  UserPlus, 
  Trash2, 
  Edit3, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap, 
  ShieldCheck, 
  Users, 
  Archive,
  BookOpen
} from 'lucide-react';

const ManageUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<(User & { deletedAt?: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');
  const [restoreSearchQuery, setRestoreSearchQuery] = useState('');

  // Status Notifications
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastDeletedUser, setLastDeletedUser] = useState<User | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    role: 'student' as Role,
    gradeInput: '' 
  });

  const fetchUsersAndDeleted = async () => {
    setIsLoading(true);
    try {
      const [all, deleted] = await Promise.all([
        BackendService.getAllUsers(),
        BackendService.getDeletedUsers()
      ]);
      setUsers(all);
      setDeletedUsers(deleted);
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndDeleted();
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
        setSuccess(`Account for "${formData.name}" updated successfully.`);
      } else {
        await BackendService.createAccount({
          name: formData.name,
          username: formData.username,
          role: formData.role,
          grades: grades
        });
        setSuccess(`User "${formData.name}" registered successfully.`);
      }
      
      setFormData({ name: '', username: '', role: 'student', gradeInput: '' });
      setShowForm(false);
      setEditingId(null);
      await fetchUsersAndDeleted();
      
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to process request.");
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
    setShowRestoreModal(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRevoke = async (user: User) => {
    if (window.confirm(`Are you sure you want to remove "${user.name}" (${user.username}) from active registry? They can be restored anytime from the Restore Center.`)) {
      try {
        await BackendService.deleteUser(user.id, user);
        setLastDeletedUser(user);
        setSuccess(`User "${user.name}" moved to deleted archive.`);
        await fetchUsersAndDeleted();
        setTimeout(() => setSuccess(''), 5000);
      } catch (e: any) {
        setError("Error processing removal: " + (e.message || "Operation failed"));
      }
    }
  };

  const handleRestoreUser = async (userToRestore: User) => {
    try {
      await BackendService.restoreUser(userToRestore);
      setSuccess(`Student "${userToRestore.name}" successfully restored to Identity Management!`);
      if (lastDeletedUser?.id === userToRestore.id) {
        setLastDeletedUser(null);
      }
      await fetchUsersAndDeleted();
      setTimeout(() => setSuccess(''), 4000);
    } catch (e: any) {
      setError("Failed to restore user: " + (e.message || "Operation failed"));
    }
  };

  const handleRestoreAll = async () => {
    if (deletedUsers.length === 0) return;
    if (window.confirm(`Restore all ${deletedUsers.length} archived students back to the active Identity Registry?`)) {
      try {
        for (const u of deletedUsers) {
          await BackendService.restoreUser(u);
        }
        setSuccess(`All ${deletedUsers.length} archived accounts successfully restored!`);
        setShowRestoreModal(false);
        await fetchUsersAndDeleted();
        setTimeout(() => setSuccess(''), 4000);
      } catch (e: any) {
        setError("Failed to restore all users: " + (e.message || "Operation failed"));
      }
    }
  };

  const handlePermanentDelete = async (user: User) => {
    if (window.confirm(`Permanently erase "${user.name}" from archive? This action cannot be undone.`)) {
      try {
        await BackendService.permanentlyDeleteArchivedUser(user.id);
        setSuccess(`Archived record for "${user.name}" permanently deleted.`);
        await fetchUsersAndDeleted();
        setTimeout(() => setSuccess(''), 4000);
      } catch (e: any) {
        setError("Permanent delete failed.");
      }
    }
  };

  // Filter Active Users
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter(u => {
      // Role filter
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      
      // Text search query
      if (!query) return true;
      const nameMatch = (u.name || '').toLowerCase().includes(query);
      const usernameMatch = (u.username || '').toLowerCase().includes(query);
      const roleMatch = (u.role || '').toLowerCase().includes(query);
      const gradeMatch = (u.grades || []).some(g => g.toLowerCase().includes(query));
      
      return nameMatch || usernameMatch || roleMatch || gradeMatch;
    });
  }, [users, searchQuery, roleFilter]);

  // Filter Deleted Users
  const filteredDeletedUsers = useMemo(() => {
    const query = restoreSearchQuery.trim().toLowerCase();
    if (!query) return deletedUsers;
    return deletedUsers.filter(u => {
      const nameMatch = (u.name || '').toLowerCase().includes(query);
      const usernameMatch = (u.username || '').toLowerCase().includes(query);
      const gradeMatch = (u.grades || []).some(g => g.toLowerCase().includes(query));
      return nameMatch || usernameMatch || gradeMatch;
    });
  }, [deletedUsers, restoreSearchQuery]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full font-black uppercase tracking-widest text-[9px] border border-indigo-100 dark:border-indigo-800">
              Identity MGMT
            </span>
            <span className="text-xs text-slate-400 font-bold">•</span>
            <span className="text-xs text-slate-500 font-semibold">{users.length} Active Accounts</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Student & Faculty Registry
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Search, manage user access, assign classroom cohorts, and restore deleted profiles
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* RESTORE OPTION BUTTON AT THE TOP */}
          <button
            id="restore-mgmt-top-btn"
            onClick={() => setShowRestoreModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-6 py-3.5 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm group"
            title="View and restore deleted students and accounts"
          >
            <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:-rotate-45 transition-transform" />
            <span>Restore Center</span>
            {deletedUsers.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-black">
                {deletedUsers.length}
              </span>
            )}
          </button>

          <button 
            id="add-user-mgmt-top-btn"
            onClick={() => {
              if (showForm) { 
                setEditingId(null); 
                setFormData({ name: '', username: '', role: 'student', gradeInput: '' }); 
              }
              setShowForm(!showForm);
            }}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
              showForm 
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
            }`}
          >
            {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add New User'}
          </button>
        </div>
      </header>

      {/* Notifications */}
      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{success}</span>
          </div>
          {lastDeletedUser && (
            <button 
              onClick={() => handleRestoreUser(lastDeletedUser)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Undo / Restore
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <form onSubmit={handleCreateOrUpdate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-xl space-y-6 animate-in slide-in-from-top-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {editingId ? 'Edit Student / Faculty Account' : 'Register New User Account'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {editingId ? 'Update user profile details and enrolled classrooms' : 'Provision student or faculty credentials into the system'}
              </p>
            </div>
            <button 
              type="button" 
              onClick={() => setShowForm(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Avanthika, John Doe"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Roll No / Student ID</label>
              <input 
                required
                disabled={!!editingId}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white disabled:opacity-50"
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value})}
                placeholder="e.g. 11003, 12024"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Role</label>
              <select 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as Role})}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher / Faculty</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Classes (Comma separated)</label>
              <input 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white"
                value={formData.gradeInput}
                onChange={e => setFormData({...formData, gradeInput: e.target.value})}
                placeholder="e.g. Grade 11 Computer Science, 11, 12"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all"
            >
              {editingId ? 'Save Changes' : 'Register User'}
            </button>
          </div>
        </form>
      )}

      {/* SEARCH AND FILTER BAR FOR ADDED STUDENTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Main Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              id="search-students-input"
              type="text"
              placeholder="Search added students by name, roll number, class, or role..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-10 py-3.5 text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            {(['all', 'student', 'teacher', 'admin'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setRoleFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  roleFilter === tab 
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All Roles' : tab === 'student' ? 'Students' : tab === 'teacher' ? 'Faculty' : 'Admins'}
              </button>
            ))}
          </div>
        </div>

        {/* Counter and status banner */}
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1 pt-1">
          <p>
            Showing <strong className="text-slate-700 dark:text-slate-200">{filteredUsers.length}</strong> of {users.length} registered accounts
            {searchQuery && <span> matching "<span className="text-indigo-600 dark:text-indigo-400 font-bold">{searchQuery}</span>"</span>}
          </p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE USERS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student / User Profile</th>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID / Roll No</th>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Classrooms</th>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                  <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u, uIdx) => {
                  const initials = (u.name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const isStudent = u.role === 'student';
                  return (
                    <tr key={u.id ? `${u.id}-${uIdx}` : `user-${uIdx}`} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="py-6 px-8">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${
                            u.role === 'admin' 
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' 
                              : u.role === 'teacher'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          }`}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                              {u.name}
                              {u.name.toLowerCase().includes('avanthika') && (
                                <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[9px] font-black rounded-md">
                                  Grade 11 CS
                                </span>
                              )}
                            </p>
                            <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mt-0.5 ${
                              u.role === 'admin' 
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800' 
                                : u.role === 'teacher' 
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {u.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-6 px-8">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {u.username}
                        </span>
                      </td>

                      <td className="py-6 px-8">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {u.grades && u.grades.length > 0 ? (
                            u.grades.map(g => (
                              <span 
                                key={g} 
                                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-lg text-[9px] font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/60"
                              >
                                {g}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400 italic">No class assigned</span>
                          )}
                        </div>
                      </td>

                      <td className="py-6 px-8">
                        {isStudent ? (
                          <div className="text-xs space-y-0.5">
                            <p className="font-black text-indigo-600 dark:text-indigo-400">{u.points || 0} XP</p>
                            <p className="text-[10px] text-slate-400 font-semibold">{u.streak || 0} Days active</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-6 px-8 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => startEdit(u)} 
                            className="p-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                            title="Edit student account"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => handleRevoke(u)} 
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all font-bold text-xs flex items-center gap-1"
                            title="Remove student (can be restored later)"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center p-8">
            <Search className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h4 className="text-base font-black text-slate-700 dark:text-slate-300">No students or accounts found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {searchQuery ? `No active users match your query "${searchQuery}".` : 'No accounts currently registered.'}
            </p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-black uppercase tracking-wider"
              >
                Reset Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* RESTORE OPTION MODAL (RECYCLE ARCHIVE) */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center border border-amber-200 dark:border-amber-800/60">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    Deleted Students & Recovery Center
                    <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full text-xs font-black">
                      {deletedUsers.length} archived
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Select any deleted student or account to restore them back to the active Identity Registry
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowRestoreModal(false)}
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Search and Action bar */}
            <div className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text"
                  placeholder="Search deleted students by name, roll no, or class..."
                  value={restoreSearchQuery}
                  onChange={e => setRestoreSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-8 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
                {restoreSearchQuery && (
                  <button onClick={() => setRestoreSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {deletedUsers.length > 1 && (
                <button
                  onClick={handleRestoreAll}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restore All ({deletedUsers.length})
                </button>
              )}
            </div>

            {/* Deleted Students List */}
            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
              {filteredDeletedUsers.length > 0 ? (
                filteredDeletedUsers.map((du, idx) => {
                  const duInitials = (du.name || 'S').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                  const deletedDate = du.deletedAt ? new Date(du.deletedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently removed';

                  return (
                    <div 
                      key={du.id || `deleted-${idx}`}
                      className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-amber-300 dark:hover:border-amber-700 transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center font-black text-xs shrink-0">
                          {duInitials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                              {du.name}
                            </h4>
                            <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                              {du.username}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400 font-semibold">
                            <span className="capitalize">{du.role}</span>
                            <span>•</span>
                            <span>Archived: {deletedDate}</span>
                            {du.grades && du.grades.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{du.grades.join(', ')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => handleRestoreUser(du)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore Student
                        </button>
                        <button
                          onClick={() => handlePermanentDelete(du)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                          title="Permanently remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center">
                  <Archive className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No deleted students in archive</p>
                  <p className="text-xs text-slate-400 mt-0.5">When accounts are removed from identity mgmt, they will appear here and can be restored anytime.</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-6 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
