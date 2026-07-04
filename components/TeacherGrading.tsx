import React, { useState, useEffect, useMemo } from 'react';
import { Submission, User, Classroom, AssessmentSubmission, LabExperiment, Assessment } from '../types.ts';
import { BackendService } from '../services/backend.ts';
import { 
  Users, 
  CheckCircle2, 
  Award, 
  BarChart3, 
  Search, 
  Download, 
  ArrowUpDown, 
  Flame, 
  FileCode, 
  BookOpen, 
  ChevronRight, 
  Clock, 
  AlertCircle, 
  Send, 
  X,
  Code,
  GraduationCap,
  Sparkles,
  Check,
  ChevronUp,
  ChevronDown,
  Info,
  Calendar,
  Layers,
  SearchCheck,
  HelpCircle
} from 'lucide-react';

const TeacherGrading: React.FC = () => {
  const [labSubmissions, setLabSubmissions] = useState<Submission[]>([]);
  const [testSubmissions, setTestSubmissions] = useState<AssessmentSubmission[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [labs, setLabs] = useState<LabExperiment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'experiments' | 'labs' | 'exams'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'name' | 'points' | 'labs' | 'streak'>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Drawer/Modal States
  const [inspectingStudent, setInspectingStudent] = useState<User | null>(null);
  const [selectedLabSub, setSelectedLabSub] = useState<Submission | null>(null);
  const [selectedTestSub, setSelectedTestSub] = useState<AssessmentSubmission | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Experiment-wise active states
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('');
  const [experimentStudentTab, setExperimentStudentTab] = useState<'completed' | 'pending'>('completed');
  const [expandedStudentCodeId, setExpandedStudentCodeId] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ti_moodle_user');
    if (savedUser) {
      const u = JSON.parse(savedUser) as User;
      setCurrentUser(u);
      
      const fetchInitial = async () => {
        try {
          const [cls, allLabs, allAssessments] = await Promise.all([
            BackendService.getClassrooms(u),
            BackendService.getLabs(),
            BackendService.getAssessments()
          ]);
          setClassrooms(cls);
          setLabs(allLabs);
          setAssessments(allAssessments);
          if (cls.length > 0) setSelectedClassId(cls[0].id);
        } catch (e) { console.error(e); }
      };
      fetchInitial();
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubStudents = BackendService.listenToStudents((allStudents) => {
      setStudents(allStudents);
    });
    return () => { unsubStudents(); };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !selectedClassId) return;
    const unsubLabs = BackendService.listenToSubmissions(currentUser.role, currentUser.id, selectedClassId, (subs) => setLabSubmissions(subs));
    const unsubTests = BackendService.listenToClassAssessmentSubmissions(currentUser.role, selectedClassId, (subs) => setTestSubmissions(subs));
    return () => { unsubLabs(); unsubTests(); };
  }, [selectedClassId, currentUser]);

  const getLabTitle = (labId: string) => {
    const lab = labs.find(l => l.id === labId);
    return lab ? lab.title : `Practical: ${labId.substring(0, 6)}`;
  };

  const getAssessmentTitle = (assessmentId: string) => {
    const exam = assessments.find(a => a.id === assessmentId);
    return exam ? exam.title : `Assessment: ${assessmentId.substring(0, 6)}`;
  };

  const getStudentTier = (points: number) => {
    if (points < 100) return { title: "Code Novice", icon: <Code className="w-3 h-3 text-indigo-400" />, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" };
    if (points < 300) return { title: "Script Weaver", icon: <Flame className="w-3 h-3 text-teal-400 animate-pulse" />, color: "bg-teal-500/10 text-teal-400 border-teal-500/20" };
    if (points < 600) return { title: "Syntax Alchemist", icon: <Layers className="w-3 h-3 text-amber-400" />, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    return { title: "Python Mastermind", icon: <GraduationCap className="w-3 h-3 text-purple-400" />, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
  };

  // Filter students who are enrolled in the selected class
  const classStudents = useMemo(() => {
    return students.filter(student => student.grades?.includes(selectedClassId));
  }, [students, selectedClassId]);

  // Aggregate student stats for the current selected classroom
  const studentMetrics = useMemo(() => {
    return classStudents.map(student => {
      const studentLabs = labSubmissions.filter(sub => sub.userId === student.id);
      const studentTests = testSubmissions.filter(sub => sub.userId === student.id);
      
      const avgScore = studentTests.length > 0 
        ? Math.round(studentTests.reduce((sum, t) => sum + (t.score / (t.totalPoints || 100)) * 100, 0) / studentTests.length)
        : 0;

      return {
        student,
        labsCompleted: studentLabs.length,
        testsCompleted: studentTests.length,
        averageExamScore: avgScore,
        lastActive: studentLabs.length > 0 || studentTests.length > 0 
          ? Math.max(
              ...studentLabs.map(l => l.submittedAt), 
              ...studentTests.map(t => t.submittedAt),
              0
            )
          : null
      };
    });
  }, [classStudents, labSubmissions, testSubmissions]);

  // Filtered and sorted student metric list for UI table
  const sortedStudentMetrics = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = studentMetrics.filter(m => 
      m.student.name.toLowerCase().includes(query) || 
      (m.student.username && m.student.username.toLowerCase().includes(query))
    );

    return filtered.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      if (sortField === 'name') {
        valA = a.student.name;
        valB = b.student.name;
      } else if (sortField === 'points') {
        valA = a.student.points || 0;
        valB = b.student.points || 0;
      } else if (sortField === 'labs') {
        valA = a.labsCompleted;
        valB = b.labsCompleted;
      } else if (sortField === 'streak') {
        valA = a.student.streak || 0;
        valB = b.student.streak || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [studentMetrics, searchQuery, sortField, sortOrder]);

  // Class-wide summary KPIs
  const classKpis = useMemo(() => {
    const totalEnrolled = classStudents.length;
    if (totalEnrolled === 0) return { avgXp: 0, completionRate: 0, examAvg: 0, submissionCount: 0 };

    const sumXp = classStudents.reduce((sum, s) => sum + (s.points || 0), 0);
    const avgXp = Math.round(sumXp / totalEnrolled);

    const totalPublishedLabs = labs.filter(l => l.status === 'published' && l.targetGrades?.includes(selectedClassId)).length || 5;
    const totalPossibleLabs = totalPublishedLabs * totalEnrolled;
    const completedLabsCount = labSubmissions.length;
    const completionRate = totalPossibleLabs > 0 ? Math.round((completedLabsCount / totalPossibleLabs) * 100) : 0;

    const scores = testSubmissions.map(t => (t.score / (t.totalPoints || 100)) * 100);
    const examAvg = scores.length > 0 ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;

    return {
      avgXp,
      completionRate: Math.min(completionRate, 100),
      examAvg,
      submissionCount: completedLabsCount + testSubmissions.length
    };
  }, [classStudents, labs, labSubmissions, testSubmissions, selectedClassId]);

  // Calculated Experiment-wise Performance
  const experimentPerformance = useMemo(() => {
    return labs
      .filter(lab => lab.status === 'published' && lab.targetGrades?.includes(selectedClassId))
      .map(lab => {
        // Find submissions for this specific lab from students currently in this class
        const labSubs = labSubmissions.filter(sub => sub.labId === lab.id);
        
        const completedStudents = classStudents.filter(student => 
          labSubs.some(sub => sub.userId === student.id)
        );
        
        const pendingStudents = classStudents.filter(student => 
          !labSubs.some(sub => sub.userId === student.id)
        );
        
        const completedCount = completedStudents.length;
        const totalCount = classStudents.length;
        const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        return {
          lab,
          completedStudents,
          pendingStudents,
          completedCount,
          pendingCount: pendingStudents.length,
          completionRate,
          submissions: labSubs
        };
      });
  }, [labs, labSubmissions, classStudents, selectedClassId]);

  // Selected Experiment Object
  const selectedExperiment = useMemo(() => {
    return experimentPerformance.find(ep => ep.lab.id === selectedExperimentId) || experimentPerformance[0] || null;
  }, [experimentPerformance, selectedExperimentId]);

  // Auto-select first experiment when list changes or selectedClassId changes
  useEffect(() => {
    if (experimentPerformance.length > 0) {
      setSelectedExperimentId(experimentPerformance[0].lab.id);
    } else {
      setSelectedExperimentId('');
    }
    setExpandedStudentCodeId(null);
  }, [selectedClassId, labs]);

  const toggleSort = (field: 'name' | 'points' | 'labs' | 'streak') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const exportToCSV = () => {
    const selectedClassName = classrooms.find(c => c.id === selectedClassId)?.name || "Class";
    let csv = "Student Name,Roll Number,Total XP,Streak Days,Labs Completed,Exams Attempted,Avg Exam Score\n";

    studentMetrics.forEach(m => {
      csv += `"${m.student.name}","${m.student.username || 'N/A'}",${m.student.points || 0},${m.student.streak || 0},${m.labsCompleted},${m.testsCompleted},${m.averageExamScore}%\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedClassName.replace(/\s+/g, '_')}_Academic_Performance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveFeedback = async () => {
    if (!selectedLabSub) return;
    setIsUpdating(true);
    try {
      await BackendService.submitLab({ ...selectedLabSub, feedback: feedbackText, status: 'graded' });
      alert("Custom feedback notes attached to student record successfully.");
    } catch (e) { 
      alert('Error saving notes.'); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const handleOpenStudentDrawer = (studentUser: User) => {
    setInspectingStudent(studentUser);
    
    // Auto-select their first lab submission if available
    const subs = labSubmissions.filter(s => s.userId === studentUser.id);
    if (subs.length > 0) {
      setSelectedLabSub(subs[0]);
      setFeedbackText(subs[0].feedback || '');
    } else {
      setSelectedLabSub(null);
      setFeedbackText('');
    }

    const exams = testSubmissions.filter(t => t.userId === studentUser.id);
    if (exams.length > 0) {
      setSelectedTestSub(exams[0]);
    } else {
      setSelectedTestSub(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-page-fade">
      {/* Header Block */}
      <header className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
              <Award className="w-4 h-4 text-indigo-600" />
            </span>
            <p className="text-indigo-600 font-black uppercase tracking-widest text-[9px]">Academic Records & Analytics</p>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">Assessment Hub</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Teacher Friendly Performance Dashboard & Automatic Verification Engine</p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 flex-wrap sm:flex-nowrap">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Roster Matrix
            </button>
            <button 
              onClick={() => setActiveTab('experiments')} 
              className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'experiments' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Experiment-Wise
            </button>
            <button 
              onClick={() => setActiveTab('labs')} 
              className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'labs' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
            >
              <Search className="w-3.5 h-3.5" />
              Review Code
            </button>
            <button 
              onClick={() => setActiveTab('exams')} 
              className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${activeTab === 'exams' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Exams & Tests
            </button>
          </div>

          <select 
            className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-white outline-none cursor-pointer focus:border-indigo-500" 
            value={selectedClassId} 
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            {classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <button 
            onClick={exportToCSV} 
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-emerald-600/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </header>

      {/* Class Statistics Overview Panel */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-indigo-200 dark:hover:border-indigo-900 transition-all shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Class Enrolled Strength</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{classStudents.length}</span>
            <span className="text-xs text-slate-400 font-bold">Students</span>
          </div>
          <div className="absolute right-4 bottom-4 w-10 h-10 bg-indigo-500/5 rounded-2xl flex items-center justify-center text-indigo-500">
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-emerald-200 dark:hover:border-emerald-900 transition-all shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Practical Lab Success</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{classKpis.completionRate}%</span>
            <span className="text-xs text-emerald-500 font-extrabold uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded text-[8px] flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 inline" /> Auto-Verified
            </span>
          </div>
          <div className="absolute right-4 bottom-4 w-10 h-10 bg-emerald-500/5 rounded-2xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-violet-200 dark:hover:border-violet-900 transition-all shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Class Average XP</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{classKpis.avgXp}</span>
            <span className="text-xs text-slate-400 font-bold">Points</span>
          </div>
          <div className="absolute right-4 bottom-4 w-10 h-10 bg-violet-500/5 rounded-2xl flex items-center justify-center text-violet-500">
            <Award className="w-4 h-4 text-violet-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl relative overflow-hidden group hover:border-amber-200 dark:hover:border-amber-900 transition-all shadow-sm">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Exam Performance Average</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{classKpis.examAvg}%</span>
            <span className="text-xs text-slate-400 font-bold">Accuracy</span>
          </div>
          <div className="absolute right-4 bottom-4 w-10 h-10 bg-amber-500/5 rounded-2xl flex items-center justify-center text-amber-500">
            <GraduationCap className="w-4 h-4 text-amber-500" />
          </div>
        </div>
      </section>

      {/* Main Panel Content Render based on Active Tab */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        
        {/* VIEW 1: PERFORMANCE ROSTER DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  Student Performance Matrix
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Sort, filter and inspect academic portfolios for the active roster</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search by student or roll no..." 
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-2.5 text-[10px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white w-64" 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                  />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                </div>
              </div>
            </div>

            {sortedStudentMetrics.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                      <th className="py-4 pl-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => toggleSort('name')}>
                        <span className="flex items-center gap-1">
                          Student Name 
                          <ArrowUpDown className="w-3 h-3 text-slate-400 inline" />
                          {sortField === 'name' && (sortOrder === 'asc' ? ' (Asc)' : ' (Desc)')}
                        </span>
                      </th>
                      <th className="py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => toggleSort('points')}>
                        <span className="flex items-center gap-1">
                          XP / Tier 
                          <ArrowUpDown className="w-3 h-3 text-slate-400 inline" />
                          {sortField === 'points' && (sortOrder === 'asc' ? ' (Asc)' : ' (Desc)')}
                        </span>
                      </th>
                      <th className="py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => toggleSort('labs')}>
                        <span className="flex items-center gap-1">
                          Labs Solved 
                          <ArrowUpDown className="w-3 h-3 text-slate-400 inline" />
                          {sortField === 'labs' && (sortOrder === 'asc' ? ' (Asc)' : ' (Desc)')}
                        </span>
                      </th>
                      <th className="py-4">Exams Completed</th>
                      <th className="py-4">Exam Avg Score</th>
                      <th className="py-4 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => toggleSort('streak')}>
                        <span className="flex items-center gap-1">
                          Streak 
                          <ArrowUpDown className="w-3 h-3 text-slate-400 inline" />
                          {sortField === 'streak' && (sortOrder === 'asc' ? ' (Asc)' : ' (Desc)')}
                        </span>
                      </th>
                      <th className="py-4 text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {sortedStudentMetrics.map(({ student, labsCompleted, testsCompleted, averageExamScore }) => {
                      const tier = getStudentTier(student.points || 0);
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group">
                          <td className="py-4 pl-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 text-indigo-700 dark:text-indigo-300 rounded-xl flex items-center justify-center font-black text-xs">
                                {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{student.name}</p>
                                <p className="text-[9px] text-slate-400 font-semibold tracking-wide">ID: {student.username || student.id.substring(0, 6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white">{student.points || 0} XP</span>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border flex items-center gap-1 ${tier.color}`}>
                                  {tier.icon}
                                  {tier.title}
                                </span>
                              </div>
                              <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min(((student.points || 0) / 800) * 100, 100)}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-2 h-2 rounded-full ${labsCompleted > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300">{labsCompleted} Labs Solved</span>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{testsCompleted} Assessments Taken</span>
                          </td>
                          <td className="py-4">
                            <span className={`text-xs font-black ${averageExamScore >= 75 ? 'text-emerald-500' : averageExamScore >= 50 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {testsCompleted > 0 ? `${averageExamScore}%` : 'N/A'}
                            </span>
                          </td>
                          <td className="py-4">
                            <div className="flex items-center gap-1 text-orange-500">
                              <Flame className="w-4 h-4" />
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200">{student.streak || 0} Days</span>
                            </div>
                          </td>
                          <td className="py-4 text-right pr-4">
                            <button 
                              onClick={() => handleOpenStudentDrawer(student)}
                              className="px-4 py-2 bg-slate-100 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
                            >
                              Inspect Work
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                <Search className="mx-auto mb-4 text-slate-300 dark:text-slate-600 w-10 h-10" />
                <p className="text-xs font-black uppercase tracking-widest">No matching students found in this class</p>
              </div>
            )}
          </div>
        )}

        {/* NEW VIEW: EXPERIMENT-WISE PERFORMANCE */}
        {activeTab === 'experiments' && (
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left sidebar: Experiments List */}
            <div className="lg:col-span-5 border-r border-slate-100 dark:border-slate-800 pr-0 lg:pr-8 space-y-4">
              <div className="space-y-1.5 mb-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-indigo-500" />
                  Practical Experiments
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold">Select a practical laboratory experiment to see student completion lists</p>
              </div>

              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2 scrollbar-thin">
                {experimentPerformance.length > 0 ? (
                  experimentPerformance.map((ep, i) => {
                    const isSelected = selectedExperimentId === ep.lab.id;
                    return (
                      <button 
                        key={ep.lab.id} 
                        onClick={() => { setSelectedExperimentId(ep.lab.id); setExpandedStudentCodeId(null); }} 
                        className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-2xl border transition-all flex flex-col gap-3 group ${isSelected ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 shadow-sm' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}`}
                      >
                        <div className="flex justify-between items-start gap-2 w-full">
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded tracking-wider">
                              {ep.lab.category}
                            </span>
                            <h5 className="font-bold text-slate-950 dark:text-white text-xs mt-1.5 leading-tight truncate">
                              {ep.lab.title}
                            </h5>
                          </div>
                          
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                            ep.lab.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-500' :
                            ep.lab.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-rose-500/10 text-rose-500'
                          }`}>
                            {ep.lab.difficulty}
                          </span>
                        </div>

                        {/* Completion bar */}
                        <div className="w-full space-y-1 mt-1">
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-500">
                            <span>Completion Rate</span>
                            <span className="text-slate-900 dark:text-slate-200 font-extrabold">{ep.completionRate}% ({ep.completedCount}/{classStudents.length})</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                ep.completionRate >= 80 ? 'bg-emerald-500' :
                                ep.completionRate >= 50 ? 'bg-indigo-500' :
                                'bg-amber-500'
                              }`} 
                              style={{ width: `${ep.completionRate}%` }} 
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-semibold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    No active practical experiments assigned.
                  </div>
                )}
              </div>
            </div>

            {/* Right details: Experiment Student Lists & Solutions */}
            <div className="lg:col-span-7 space-y-6">
              {selectedExperiment ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Selected Experiment Header card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[8px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-100/50 dark:bg-indigo-900/40 px-2.5 py-0.5 rounded tracking-widest">
                          {selectedExperiment.lab.category}
                        </span>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1.5">{selectedExperiment.lab.title}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold max-w-lg mt-1 line-clamp-2">
                          {selectedExperiment.lab.description}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                          {selectedExperiment.completionRate}%
                        </div>
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Solved By Classroom</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg px-2.5 py-1">
                        <Award className="w-3.5 h-3.5 text-indigo-500" />
                        Code Weight: 50 XP
                      </span>
                      <span className="flex items-center gap-1 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg px-2.5 py-1">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        Completed: {selectedExperiment.completedCount}
                      </span>
                      <span className="flex items-center gap-1 bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-lg px-2.5 py-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Pending: {selectedExperiment.pendingCount}
                      </span>
                    </div>
                  </div>

                  {/* Tab switches for Completed vs Pending */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setExperimentStudentTab('completed'); setExpandedStudentCodeId(null); }}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${experimentStudentTab === 'completed' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        Completed Students ({selectedExperiment.completedCount})
                      </button>
                      <button 
                        onClick={() => { setExperimentStudentTab('pending'); setExpandedStudentCodeId(null); }}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${experimentStudentTab === 'pending' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        Pending Students ({selectedExperiment.pendingCount})
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: Completed Student Solutions list */}
                  {experimentStudentTab === 'completed' && (
                    <div className="space-y-3">
                      {selectedExperiment.completedStudents.length > 0 ? (
                        selectedExperiment.completedStudents.map(student => {
                          const sub = selectedExperiment.submissions.find(s => s.userId === student.id);
                          const isExpanded = expandedStudentCodeId === student.id;
                          return (
                            <div key={student.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 transition-all shadow-sm">
                              <div className="p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg flex items-center justify-center font-bold text-xs">
                                    <Check className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-slate-900 dark:text-white text-xs leading-none">{student.name}</h5>
                                    <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Roll ID: {student.username || 'N/A'}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  {sub && (
                                    <span className="text-[8px] text-slate-400 font-semibold">
                                      Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                  <button 
                                    onClick={() => setExpandedStudentCodeId(isExpanded ? null : student.id)}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1 transition-all"
                                  >
                                    <Code className="w-3.5 h-3.5" />
                                    {isExpanded ? 'Hide Code' : 'View Code'}
                                  </button>
                                </div>
                              </div>

                              {/* Expended python compiler solution review container */}
                              {isExpanded && sub && (
                                <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-950 p-5 font-mono text-xs text-slate-300 animate-in slide-in-from-top-2 duration-300">
                                  <div className="flex justify-between items-center mb-3 text-slate-500 border-b border-slate-800/80 pb-2 text-[9px]">
                                    <span className="font-bold uppercase tracking-wider text-emerald-500">Auto-Verified Solution code</span>
                                    <span>solution.py • compiler output pass</span>
                                  </div>
                                  <pre className="overflow-x-auto whitespace-pre-wrap max-h-72 scrollbar-thin">
                                    {sub.code}
                                  </pre>
                                  {sub.feedback && (
                                    <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-xl text-[10px] text-indigo-300">
                                      <span className="font-extrabold uppercase tracking-widest text-[8px] block mb-1">Attached Faculty Notes:</span>
                                      {sub.feedback}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-semibold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                          No students in this class have submitted this practical experiment yet.
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Pending Students list */}
                  {experimentStudentTab === 'pending' && (
                    <div className="space-y-2.5">
                      {selectedExperiment.pendingStudents.length > 0 ? (
                        selectedExperiment.pendingStudents.map(student => (
                          <div key={student.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-lg flex items-center justify-center font-bold text-xs">
                                <Clock className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-slate-900 dark:text-white text-xs leading-none">{student.name}</h5>
                                <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Roll ID: {student.username || 'N/A'}</p>
                              </div>
                            </div>

                            <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border border-amber-200/20">
                              <AlertCircle className="w-2.5 h-2.5" />
                              Incomplete
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-semibold bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                          Incredible! 100% completion achieved for this experiment!
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl opacity-40">
                  <FileCode width="40" height="40" className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Select an active experiment from the left pane to view analytical stats</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: LAB REPORT BROWSER */}
        {activeTab === 'labs' && (
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar list of practical subs */}
            <div className="lg:col-span-4 border-r border-slate-100 dark:border-slate-800 pr-0 lg:pr-8 space-y-4">
              <div className="space-y-1.5 mb-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-500" />
                  Submitted Practical Reports
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold">Click a record below to inspect their code</p>
              </div>

              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Filter by student name..." 
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-2.5 text-[9px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white w-full" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                {labSubmissions.filter(sub => sub.userName.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                  labSubmissions
                    .filter(sub => sub.userName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((sub, i) => (
                      <button 
                        key={i} 
                        onClick={() => { setSelectedLabSub(sub); setFeedbackText(sub.feedback || ''); }} 
                        className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border transition-all flex items-center justify-between group ${selectedLabSub?.userId === sub.userId && selectedLabSub?.labId === sub.labId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'border-slate-100 dark:border-slate-800'}`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{sub.userName}</p>
                          <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-extrabold tracking-wider uppercase mt-0.5 truncate">{getLabTitle(sub.labId)}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[8px] font-black uppercase tracking-wider">Passed</span>
                      </button>
                    ))
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-semibold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    No lab reports submitted yet.
                  </div>
                )}
              </div>
            </div>

            {/* View detailed lab submission */}
            <div className="lg:col-span-8 space-y-6">
              {selectedLabSub ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedLabSub.userName}</h3>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mt-0.5 tracking-wider">{getLabTitle(selectedLabSub.labId)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline" /> Auto-Verified
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">Submitted {new Date(selectedLabSub.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                    <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">solution.py</span>
                      <span className="text-[9px] text-slate-500 font-mono">Python 3 Execution Engine</span>
                    </div>
                    <pre className="p-5 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-[350px]">
                      {selectedLabSub.code}
                    </pre>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-[9px] tracking-widest mb-3">Custom Feedback Notes (Optional)</h4>
                    <p className="text-xs text-slate-400 font-medium mb-4">You can optionally send constructive code reviews or tips to the student. Grade points are automatically saved upon submission.</p>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="e.g. Elegant loop structure! Try to optimize the list comprehension next time." 
                        value={feedbackText} 
                        onChange={(e) => setFeedbackText(e.target.value)} 
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-semibold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500" 
                      />
                      <button 
                        onClick={handleSaveFeedback} 
                        disabled={isUpdating} 
                        className="px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5 inline" />
                        {isUpdating ? 'Saving...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl opacity-40">
                  <FileCode width="40" height="40" className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Select a student lab submission record to inspect their code</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: EXAMS & ASSESSMENTS */}
        {activeTab === 'exams' && (
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar list of assessment attempts */}
            <div className="lg:col-span-4 border-r border-slate-100 dark:border-slate-800 pr-0 lg:pr-8 space-y-4">
              <div className="space-y-1.5 mb-4">
                <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  Active Exam Attempts
                </h4>
                <p className="text-[10px] text-slate-400 font-semibold">Click an attempt below to view their exam card</p>
              </div>

              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Filter by student name..." 
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-10 py-2.5 text-[9px] font-bold focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white w-full" 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              </div>

              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
                {testSubmissions.filter(sub => sub.userName.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                  testSubmissions
                    .filter(sub => sub.userName.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((sub, i) => {
                      const scorePercentage = Math.round((sub.score / (sub.totalPoints || 1)) * 100);
                      return (
                        <button 
                          key={i} 
                          onClick={() => setSelectedTestSub(sub)} 
                          className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl border transition-all flex items-center justify-between group ${selectedTestSub?.userId === sub.userId && selectedTestSub?.assessmentId === sub.assessmentId ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'border-slate-100 dark:border-slate-800'}`}
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-900 dark:text-white text-xs truncate">{sub.userName}</p>
                            <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5 truncate">{getAssessmentTitle(sub.assessmentId)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{sub.score} / {sub.totalPoints}</p>
                            <p className="text-[8px] text-slate-400 font-bold">{scorePercentage}%</p>
                          </div>
                        </button>
                      );
                    })
                ) : (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-500 text-xs font-semibold border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                    No exam submissions recorded.
                  </div>
                )}
              </div>
            </div>

            {/* Detailed exam attempt review */}
            <div className="lg:col-span-8">
              {selectedTestSub ? (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedTestSub.userName}</h3>
                      <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase mt-0.5 tracking-wider">{getAssessmentTitle(selectedTestSub.assessmentId)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{selectedTestSub.score} <span className="text-xs text-slate-400">/ {selectedTestSub.totalPoints} points</span></div>
                      <span className="text-[9px] text-slate-400 font-semibold">Submitted {new Date(selectedTestSub.submittedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/20 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h4 className="font-black text-slate-900 dark:text-white uppercase text-[9px] tracking-widest mb-4">Exam Question Log & Student Answers</h4>
                    
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                      {Object.keys(selectedTestSub.answers || {}).map((qId, idx) => {
                        const answer = selectedTestSub.answers[qId];
                        return (
                          <div key={qId} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question {idx + 1}</span>
                              <span className="text-[9px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 rounded font-black uppercase flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                                Verified Answer
                              </span>
                            </div>
                            
                            {typeof answer === 'number' ? (
                              <div className="space-y-1.5">
                                <p className="text-[10px] text-slate-400 font-medium">Multiple Choice Question Option Index Chosen:</p>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg inline-block">
                                  Option #{answer + 1}
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-[10px] text-slate-400 font-medium font-mono">Coding Solution Code Submitted:</p>
                                <pre className="p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-lg overflow-x-auto whitespace-pre-wrap max-h-40">
                                  {String(answer)}
                                </pre>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl opacity-40">
                  <GraduationCap width="40" height="40" className="text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest mt-4">Select an assessment attempt to review question scores</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* INSPECT STUDENT OVERLAY MODAL (Aesthetic detail viewer) */}
      {inspectingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/55 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-4xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            {/* Modal Header */}
            <header className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-sm">
                  {inspectingStudent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{inspectingStudent.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Roll ID: {inspectingStudent.username}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setInspectingStudent(null)} 
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Modal Scroll Canvas */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin">
              {/* Stats Block */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">XP Points</p>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{inspectingStudent.points || 0} XP</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Academic Rank</p>
                  <p className="text-xs font-black text-slate-800 dark:text-white mt-1 truncate flex items-center gap-1">
                    {getStudentTier(inspectingStudent.points || 0).icon}
                    {getStudentTier(inspectingStudent.points || 0).title}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Coding Streak</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-1">
                    <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
                    {inspectingStudent.streak || 0} Days
                  </p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl">
                  <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Classroom Status</p>
                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mt-1">Active</span>
                </div>
              </div>

              {/* Bio block if present */}
              {inspectingStudent.bio && (
                <div className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-1 bg-slate-50/50 dark:bg-slate-800/10">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Student Biography</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{inspectingStudent.bio}"</p>
                </div>
              )}

              {/* Combined lists of lab and test codes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Solved Labs Box */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1">
                    <FileCode className="w-4 h-4 text-indigo-500" />
                    Practical Experiments Solved
                  </h4>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {labSubmissions.filter(s => s.userId === inspectingStudent.id).length > 0 ? (
                      labSubmissions
                        .filter(s => s.userId === inspectingStudent.id)
                        .map((s, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-3">
                            <div className="flex justify-between items-center">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate pr-2">{getLabTitle(s.labId)}</p>
                              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5" />
                                Auto-Verified
                              </span>
                            </div>
                            <pre className="p-3 bg-slate-950 rounded-lg text-indigo-300 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap max-h-32">
                              {s.code}
                            </pre>
                            {s.feedback && (
                              <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg text-[10px] text-indigo-600 dark:text-indigo-400">
                                <span className="font-black">Teacher Notes:</span> {s.feedback}
                              </div>
                            )}
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No lab submissions recorded for this student.</p>
                    )}
                  </div>
                </div>

                {/* Exam Submissions Box */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-1">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    Assessments & Exams Taken
                  </h4>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {testSubmissions.filter(t => t.userId === inspectingStudent.id).length > 0 ? (
                      testSubmissions
                        .filter(t => t.userId === inspectingStudent.id)
                        .map((t, idx) => (
                          <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate pr-2">{getAssessmentTitle(t.assessmentId)}</p>
                              <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">{t.score} / {t.totalPoints}</p>
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold flex justify-between">
                              <span>Submitted {new Date(t.submittedAt).toLocaleDateString()}</span>
                              <span className="font-bold text-slate-500 uppercase">{Math.round((t.score / (t.totalPoints || 1)) * 100)}% Marks</span>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-xs text-slate-400 italic">No assessment attempts recorded for this student.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setInspectingStudent(null)} 
                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl hover:opacity-90 transition-all cursor-pointer"
              >
                Close Report
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherGrading;
