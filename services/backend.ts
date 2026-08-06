
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  browserSessionPersistence,
  setPersistence,
  Auth,
  updatePassword
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  Timestamp,
  updateDoc,
  Firestore,
  increment,
  writeBatch,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { LabExperiment, Submission, User, Role, Classroom, Assessment, AssessmentSubmission } from "../types.ts";

const firebaseConfig = {
  apiKey: "AIzaSyD83PRhNFvqgmd69LH5pBPzSMlyufXVhhc",
  authDomain: "ti-moodle.firebaseapp.com",
  projectId: "ti-moodle",
  storageBucket: "ti-moodle.firebasestorage.app",
  messagingSenderId: "280993977735",
  appId: "1:280993977735:web:4418b1c7b1a26534b1ef22"
};

const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

const secondaryAppName = "IdentityProvisioner";
const secondaryApp: FirebaseApp = getApps().find(a => a.name === secondaryAppName) || initializeApp(firebaseConfig, secondaryAppName);
const secondaryAuth: Auth = getAuth(secondaryApp);

setPersistence(secondaryAuth, browserSessionPersistence).catch(console.warn);

export const DEFAULT_GRADE_12_CLASS: Classroom = {
  id: 'cls-grade-12-cs',
  name: 'Grade 12 Computer Science',
  teacherId: 'teacher-1',
  teacherName: 'Dr. K. Ramanathan'
};

export const DEFAULT_GRADE_11_CLASS: Classroom = {
  id: 'cls-grade-11-cs',
  name: 'Grade 11 Computer Science',
  teacherId: 'teacher-1',
  teacherName: 'Dr. K. Ramanathan'
};

export const DEFAULT_G12_STUDENTS: User[] = [
  {
    id: '12024',
    username: '12024',
    name: 'SANTHOSH A',
    role: 'student',
    grades: ['cls-grade-12-cs', '12', 'Grade 12'],
    points: 200,
    streak: 2,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs101',
    username: '2024CS101',
    name: 'Ananya Sharma',
    role: 'student',
    grades: ['cls-grade-12-cs', '12', 'Grade 12'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs102',
    username: '2024CS102',
    name: 'Kavya Raman',
    role: 'student',
    grades: ['cls-grade-12-cs', '12', 'Grade 12'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs103',
    username: '2024CS103',
    name: 'Rohit Varma',
    role: 'student',
    grades: ['cls-grade-12-cs', '12', 'Grade 12'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs104',
    username: '2024CS104',
    name: 'Siddharth Nair',
    role: 'student',
    grades: ['cls-grade-12-cs', '12', 'Grade 12'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs105',
    username: '2024CS105',
    name: 'Priya Sundaram',
    role: 'student',
    grades: ['cls-grade-12-cs', '12', 'Grade 12'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  }
];

export const DEFAULT_G11_STUDENTS: User[] = [
  {
    id: '11003',
    username: '11003',
    name: 'Avanthika',
    role: 'student',
    grades: ['cls-grade-11-cs', '11', 'Grade 11'],
    points: 400,
    streak: 4,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs1102',
    username: '2024CS1102',
    name: 'Aditya Krishnan',
    role: 'student',
    grades: ['cls-grade-11-cs', '11', 'Grade 11'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs1103',
    username: '2024CS1103',
    name: 'Sneha Murali',
    role: 'student',
    grades: ['cls-grade-11-cs', '11', 'Grade 11'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs1104',
    username: '2024CS1104',
    name: 'Harish Kumar',
    role: 'student',
    grades: ['cls-grade-11-cs', '11', 'Grade 11'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  },
  {
    id: 'std-2024cs1105',
    username: '2024CS1105',
    name: 'Deepika S',
    role: 'student',
    grades: ['cls-grade-11-cs', '11', 'Grade 11'],
    points: 0,
    streak: 1,
    isFirstLogin: false
  }
];

export const BackendService = {
  async ensureGrade12Data(): Promise<void> {
    return this.ensureAcademicData();
  },

  async ensureAcademicData(): Promise<void> {
    // 1. Clean localStorage and seed verified submissions for Avanthika and Santhosh
    try {
      const localStr = localStorage.getItem("ti_moodle_local_submissions");
      let localSubs: Submission[] = localStr ? JSON.parse(localStr) : [];
      
      // Clean out fake default seeded submissions & extra submissions for Santhosh if not the 2 Grade 12 labs
      localSubs = localSubs.filter(s => {
        if (s.feedback?.includes('Auto-Verified: All recursive')) return false;
        const isSanthoshSub = s.userId === '12024' || s.userId === 'std-santhosh' || s.userName?.toLowerCase().includes('santhosh');
        if (isSanthoshSub && s.labId !== 'fibonacci-adv' && s.labId !== 'data-structures-linked') return false;
        return true;
      });

      // Seed submissions for Avanthika (Grade 11 - 4 experiments solved = 400 XP)
      const avanthikaSubs: Submission[] = [
        {
          userId: 'std-avanthika',
          userName: 'Avanthika',
          labId: 'fibonacci-adv',
          classId: 'cls-grade-11-cs',
          status: 'graded',
          pointsAwarded: 100,
          submittedAt: Date.now() - 3600000 * 24 * 3,
          code: `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n\nn = int(input())\nprint(fib(n))`,
          feedback: 'Auto-Verified: Recursive approach verified with optimal complexity.'
        },
        {
          userId: 'std-avanthika',
          userName: 'Avanthika',
          labId: 'factorial-recur',
          classId: 'cls-grade-11-cs',
          status: 'graded',
          pointsAwarded: 100,
          submittedAt: Date.now() - 3600000 * 24 * 2,
          code: `def factorial(n):\n    if n <= 1:\n        return 1\n    return n * factorial(n - 1)\n\nn = int(input())\nprint(factorial(n))`,
          feedback: 'Auto-Verified: All test cases passed with valid base cases.'
        },
        {
          userId: 'std-avanthika',
          userName: 'Avanthika',
          labId: 'palindrome-checker',
          classId: 'cls-grade-11-cs',
          status: 'graded',
          pointsAwarded: 100,
          submittedAt: Date.now() - 3600000 * 24 * 1,
          code: `text = input().strip()\nif text == text[::-1]:\n    print("Palindrome")\nelse:\n    print("Not Palindrome")`,
          feedback: 'Auto-Verified: Correct string slice reversing and boundary checks.'
        },
        {
          userId: 'std-avanthika',
          userName: 'Avanthika',
          labId: 'matrix-addition',
          classId: 'cls-grade-11-cs',
          status: 'graded',
          pointsAwarded: 100,
          submittedAt: Date.now() - 3600000 * 2,
          code: `r, c = map(int, input().split())\nmat1 = [list(map(int, input().split())) for _ in range(r)]\nmat2 = [list(map(int, input().split())) for _ in range(r)]\nres = [[mat1[i][j] + mat2[i][j] for j in range(c)] for i in range(r)]\nfor row in res:\n    print(*(row))`,
          feedback: 'Auto-Verified: 2D matrix manipulation verified.'
        }
      ];

      // Seed submissions for Santhosh A (Grade 12 - 2 experiments solved out of 2 = 200 XP)
      const santhoshSubs: Submission[] = [
        {
          userId: '12024',
          userName: 'SANTHOSH A',
          labId: 'fibonacci-adv',
          classId: 'cls-grade-12-cs',
          status: 'graded',
          pointsAwarded: 100,
          submittedAt: Date.now() - 3600000 * 24 * 2,
          code: `def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n\nn = int(input())\nprint(fib(n))`,
          feedback: 'Auto-Verified: All test cases passed with optimal recursive stack.'
        },
        {
          userId: '12024',
          userName: 'SANTHOSH A',
          labId: 'data-structures-linked',
          classId: 'cls-grade-12-cs',
          status: 'graded',
          pointsAwarded: 100,
          submittedAt: Date.now() - 3600000 * 12,
          code: `class Stack:\n    def __init__(self):\n        self.items = []\n    def push(self, item):\n        self.items.append(item)\n    def pop(self):\n        return self.items.pop()\n\ns = Stack()\ns.push(5)\nprint(s.pop())`,
          feedback: 'Auto-Verified: Stack LIFO behavior verified.'
        }
      ];

      // Merge into local submissions
      [...avanthikaSubs, ...santhoshSubs].forEach(seedSub => {
        const idx = localSubs.findIndex(s => (s.userId === seedSub.userId || (s.userName && s.userName.toLowerCase() === seedSub.userName.toLowerCase())) && s.labId === seedSub.labId);
        if (idx >= 0) {
          localSubs[idx] = seedSub;
        } else {
          localSubs.push(seedSub);
        }
      });

      localStorage.setItem("ti_moodle_local_submissions", JSON.stringify(localSubs));
    } catch (e) {
      console.warn("Local storage cleanup warning:", e);
    }

    // 2. Sync to Firestore (Ensure classrooms and students exist with exact points)
    try {
      await setDoc(doc(db, "classrooms", DEFAULT_GRADE_12_CLASS.id), DEFAULT_GRADE_12_CLASS, { merge: true });
      await setDoc(doc(db, "classrooms", DEFAULT_GRADE_11_CLASS.id), DEFAULT_GRADE_11_CLASS, { merge: true });

      // Ensure students in Firestore
      for (const student of DEFAULT_G12_STUDENTS) {
        const userRef = doc(db, "users", student.id);
        await setDoc(userRef, student, { merge: true });
      }

      for (const student of DEFAULT_G11_STUDENTS) {
        const userRef = doc(db, "users", student.id);
        await setDoc(userRef, student, { merge: true });
      }

      // Reset any legacy students with 50 XP and ensure SANTHOSH A has 200 XP
      const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "student")));
      for (const d of usersSnap.docs) {
        const u = d.data() as User;
        if (u.name?.toLowerCase().includes('santhosh') || u.id === '12024' || u.username === '12024' || u.id === 'std-santhosh') {
          await updateDoc(d.ref, { name: 'SANTHOSH A', username: '12024', points: 200, streak: 2 });
        } else if (u.name?.toLowerCase().includes('avanthika')) {
          await updateDoc(d.ref, { points: 400, streak: 4 });
        } else if (u.points === 50 && (!u.grades || u.grades.some(g => g.includes('12')))) {
          await updateDoc(d.ref, { points: 0 });
        }
      }
    } catch (e: any) {
      console.warn("Firestore sync in ensureAcademicData:", e);
    }
  },
  async repairAdminIdentity(fbUser: any) {
    const userId = fbUser.uid || fbUser.id;
    if (!userId) throw new Error("ID_MISSING: Authentication state is invalid.");

    const adminDocRef = doc(db, "users", userId);
    const adminData: User = { 
      id: userId, 
      username: fbUser.username || 'admin', 
      name: fbUser.name || 'System Administrator', 
      role: 'admin',
      points: 9999,
      streak: 1,
      grades: [],
      isFirstLogin: false
    };
    
    try {
        await setDoc(adminDocRef, adminData);
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            throw new Error("DATABASE_LOCK: Firestore security rules are blocking your identity sync.");
        }
        throw e;
    }
    return adminData;
  },

  onAuth(callback: (user: User | null) => void) {
    let unsubDoc: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (unsubDoc) {
        unsubDoc();
        unsubDoc = null;
      }
      if (fbUser) {
        try {
          const userDocRef = doc(db, "users", fbUser.uid);
          unsubDoc = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const userData = snap.data() as User;
              const normalized: User = {
                ...userData,
                id: fbUser.uid,
                grades: userData.grades || [],
                points: userData.points || 0,
                streak: userData.streak || 0,
                isFirstLogin: userData.isFirstLogin ?? false
              };
              localStorage.setItem('ti_moodle_user', JSON.stringify(normalized));
              callback(normalized);
            } else if (fbUser.email?.startsWith('admin')) {
              this.repairAdminIdentity(fbUser).then((admin) => {
                callback(admin);
              }).catch(() => {
                callback(null);
              });
            } else {
              callback(null);
            }
          }, (err) => {
            console.error("Firestore user doc snap error:", err);
            callback(null);
          });
        } catch (e) {
          callback(null);
        }
      } else {
        localStorage.removeItem('ti_moodle_user');
        callback(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubDoc) unsubDoc();
    };
  },

  async login(username: string, password: string): Promise<User> {
    let targetEmail = username.includes('@') ? username : `${username}@ti-moodle.edu`;
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const uData = snap.docs[0].data() as User & { authEmail?: string };
        if (uData.authEmail) {
          targetEmail = uData.authEmail;
        }
      } else if (username !== 'admin') {
        throw new Error("Academic profile not found.");
      }
    } catch (e: any) {
      if (e.message?.includes("not found")) throw e;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
          if (username === 'admin') {
            return await this.repairAdminIdentity(userCredential.user);
          }
          throw new Error("Academic profile not found.");
      }
      
      const userData = userDoc.data() as User;
      return {
          ...userData,
          id: userCredential.user.uid,
          grades: userData.grades || [],
          points: userData.points || 0,
          streak: userData.streak || 0
      };
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') 
        throw new Error("Identity verification failed.");
      throw new Error(error.message || "Auth protocol error.");
    }
  },

  async logout() {
    await signOut(auth);
    localStorage.removeItem('ti_moodle_user');
  },

  async createAccount(data: { name: string, username: string, role: Role, grades?: string[] }): Promise<void> {
    const password = "password123";

    // 1. Check if an active user document already exists in Firestore for this username
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", data.username));
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        throw new Error(`Username "${data.username}" is already assigned to an active user.`);
      }
    } catch (err: any) {
      if (err.message?.includes('already assigned')) throw err;
      // Continue if Firestore query error occurs
    }

    // 2. Try creating a new account in Firebase Auth
    const primaryEmail = `${data.username}@ti-moodle.edu`;
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, primaryEmail, password);
      const newUser: User & { authEmail?: string } = { 
        id: cred.user.uid, 
        username: data.username, 
        name: data.name, 
        role: data.role, 
        grades: data.grades || [],
        points: 0,
        streak: 0,
        isFirstLogin: true,
        authEmail: primaryEmail
      };
      await setDoc(doc(db, "users", cred.user.uid), newUser);
      await signOut(secondaryAuth);
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        // The username exists in Firebase Auth, but was deleted/removed from Firestore.
        // Try signing in with default password first
        try {
          const cred = await signInWithEmailAndPassword(secondaryAuth, primaryEmail, password);
          const newUser: User & { authEmail?: string } = { 
            id: cred.user.uid, 
            username: data.username, 
            name: data.name, 
            role: data.role, 
            grades: data.grades || [],
            points: 0,
            streak: 0,
            isFirstLogin: true,
            authEmail: primaryEmail
          };
          await setDoc(doc(db, "users", cred.user.uid), newUser);
          await signOut(secondaryAuth);
          return;
        } catch (signInErr: any) {
          // If the deleted user changed their password previously, create a fresh Auth user record with a unique timestamped alias
          const altEmail = `${data.username}.${Date.now()}@ti-moodle.edu`;
          const cred = await createUserWithEmailAndPassword(secondaryAuth, altEmail, password);
          const newUser: User & { authEmail?: string } = { 
            id: cred.user.uid, 
            username: data.username, 
            name: data.name, 
            role: data.role, 
            grades: data.grades || [],
            points: 0,
            streak: 0,
            isFirstLogin: true,
            authEmail: altEmail
          };
          await setDoc(doc(db, "users", cred.user.uid), newUser);
          await signOut(secondaryAuth);
          return;
        }
      }
      throw new Error(`Provisioning Error: ${e.message}`);
    }
  },

  async updateAccount(userId: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(db, "users", userId), data);
  },

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(db, "users", userId));
  },

  async enrollStudent(studentId: string, classId: string): Promise<void> {
    const userRef = doc(db, "users", studentId);
    await updateDoc(userRef, {
      grades: arrayUnion(classId)
    });
  },

  async unenrollStudent(studentId: string, classId: string): Promise<void> {
    const userRef = doc(db, "users", studentId);
    await updateDoc(userRef, {
      grades: arrayRemove(classId)
    });
  },

  async getAllUsers(): Promise<User[]> {
    try {
        const snap = await getDocs(collection(db, "users"));
        if (!snap.empty) {
          const users = snap.docs.map(d => ({
              ...d.data(),
              id: d.id,
              grades: d.data().grades || [],
              points: d.data().points || 0,
              streak: d.data().streak || 0
          } as User));
          return users;
        }
        return [...DEFAULT_G12_STUDENTS, ...DEFAULT_G11_STUDENTS];
    } catch (e: any) {
        return [...DEFAULT_G12_STUDENTS, ...DEFAULT_G11_STUDENTS];
    }
  },

  async getClassrooms(user?: User | null): Promise<Classroom[]> {
    if (!user) return [DEFAULT_GRADE_12_CLASS, DEFAULT_GRADE_11_CLASS];
    try {
      const colRef = collection(db, "classrooms");
      let snap;
      if (user.role === 'admin') {
        snap = await getDocs(colRef);
      } else if (user.role === 'teacher') {
        const q = query(colRef, where("teacherId", "==", user.id));
        snap = await getDocs(q);
        if (snap.empty) {
          snap = await getDocs(colRef);
        }
      } else if (user.role === 'student' && user.grades && user.grades.length > 0) {
        const results: Classroom[] = [];
        for (const classId of user.grades) {
          const snapDoc = await getDoc(doc(db, "classrooms", classId));
          if (snapDoc.exists()) {
            results.push({ ...snapDoc.data(), id: snapDoc.id } as Classroom);
          }
        }
        if (results.length > 0) return results;
      }

      if (snap && !snap.empty) {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Classroom));
        if (!list.some(c => c.id === 'cls-grade-12-cs' || c.name.toLowerCase().includes('grade 12'))) {
          list.unshift(DEFAULT_GRADE_12_CLASS);
        }
        if (!list.some(c => c.id === 'cls-grade-11-cs' || c.name.toLowerCase().includes('grade 11'))) {
          list.push(DEFAULT_GRADE_11_CLASS);
        }
        return list;
      }
      return [DEFAULT_GRADE_12_CLASS, DEFAULT_GRADE_11_CLASS];
    } catch (e: any) {
      return [DEFAULT_GRADE_12_CLASS, DEFAULT_GRADE_11_CLASS];
    }
  },

  async saveClassroom(cls: Classroom): Promise<void> {
    try {
        await setDoc(doc(db, "classrooms", cls.id), cls);
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            throw new Error("PERMISSION_DENIED: Admin role check failed.");
        }
        throw e;
    }
  },

  async deleteClassroom(id: string): Promise<void> {
    await deleteDoc(doc(db, "classrooms", id));
  },

  async finalizeProfile(userId: string, newPassword?: string, profileData?: Partial<User>): Promise<void> {
    const userRef = doc(db, "users", userId);
    if (newPassword) {
      const user = auth.currentUser;
      if (user) await updatePassword(user, newPassword);
    }
    await updateDoc(userRef, { ...profileData, isFirstLogin: false });
  },

  async getLabs(): Promise<LabExperiment[]> {
    try {
      const snap = await getDocs(collection(db, "labs"));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as LabExperiment));
    } catch (e) {
      return [];
    }
  },

  async saveLab(lab: LabExperiment): Promise<void> {
    await setDoc(doc(db, "labs", lab.id), lab);
  },

  async deleteLab(labId: string): Promise<void> {
    await deleteDoc(doc(db, "labs", labId));
  },

  async syncCustomLabs(labs: LabExperiment[]): Promise<void> {
    const batch = writeBatch(db);
    labs.forEach(lab => {
      batch.set(doc(db, "labs", lab.id), lab);
    });
    await batch.commit();
  },

  async submitLab(submission: Submission, xpAward: number = 100): Promise<void> {
    const subId = `${submission.userId}_${submission.labId}`;
    
    // 1. Always save to local storage first as a secure fallback
    try {
      const localStr = localStorage.getItem("ti_moodle_local_submissions");
      const localSubs: Submission[] = localStr ? JSON.parse(localStr) : [];
      const filtered = localSubs.filter(s => !(s.userId === submission.userId && s.labId === submission.labId));
      filtered.push({ ...submission, submittedAt: Date.now() });
      localStorage.setItem("ti_moodle_local_submissions", JSON.stringify(filtered));
    } catch (e) {
      console.warn("Failed to write submission to localStorage:", e);
    }

    let wasAlreadyGraded = false;
    const subRef = doc(db, "submissions", subId);
    
    // 2. Try to get existing submission from Firestore, catch permissions errors
    try {
      const existingDoc = await getDoc(subRef);
      wasAlreadyGraded = existingDoc.exists() && existingDoc.data()?.status === 'graded';
    } catch (e) {
      console.warn("Firestore getDoc failed (permissions or connection), assuming not graded:", e);
    }

    // 3. Try to save submission to Firestore
    try {
      await setDoc(subRef, {
        ...submission,
        submittedAt: Date.now()
      });
    } catch (e) {
      console.error("Firestore setDoc failed, falling back to local submission record:", e);
      // Do not throw error here, since it is safely stored in localStorage and UI will load it
    }

    // 4. Try to increment user's XP in Firestore and update local cache
    if (!wasAlreadyGraded) {
      try {
        const userRef = doc(db, "users", submission.userId);
        await updateDoc(userRef, {
          points: increment(xpAward)
        });
      } catch (e) {
        console.warn("Firestore updateDoc for user points failed:", e);
      }

      try {
        const userStr = localStorage.getItem("ti_moodle_user");
        if (userStr) {
          const u = JSON.parse(userStr);
          if (u.id === submission.userId) {
            u.points = (u.points || 0) + xpAward;
            localStorage.setItem("ti_moodle_user", JSON.stringify(u));
            // Trigger storage event or direct UI update if needed
            window.dispatchEvent(new Event('storage'));
          }
        }
      } catch (e) {
        console.warn("Failed to update local cached user points:", e);
      }
    }
  },

  listenToStudents(callback: (users: User[]) => void) {
    const q = query(collection(db, "users"), where("role", "==", "student"));
    return onSnapshot(q, (snap) => {
      let students = snap.docs.map(d => ({
        ...d.data(),
        id: d.id,
        grades: d.data().grades || [],
        points: d.data().points || 0,
        streak: d.data().streak || 0
      } as User));
      if (students.length === 0) {
        students = [...DEFAULT_G12_STUDENTS, ...DEFAULT_G11_STUDENTS];
      } else {
        // If Grade 12 students are missing in Firestore, include default Grade 12 students
        const hasG12 = students.some(s => s.grades?.some(g => g.includes('12') || g === 'cls-grade-12-cs'));
        if (!hasG12) {
          students = [...students, ...DEFAULT_G12_STUDENTS];
        } else if (!students.some(s => s.name?.toLowerCase().includes('santhosh') || s.username?.toLowerCase().includes('santhosh'))) {
          const santhosh = DEFAULT_G12_STUDENTS.find(s => s.name.toLowerCase().includes('santhosh'));
          if (santhosh) students.push(santhosh);
        }

        // If Grade 11 students are missing in Firestore, include default Grade 11 students
        const hasG11 = students.some(s => s.grades?.some(g => g.includes('11') || g === 'cls-grade-11-cs'));
        if (!hasG11) {
          students = [...students, ...DEFAULT_G11_STUDENTS];
        } else if (!students.some(s => s.name?.toLowerCase().includes('avanthika') || s.username?.toLowerCase().includes('avanthika'))) {
          const avanthika = DEFAULT_G11_STUDENTS.find(s => s.name.toLowerCase().includes('avanthika'));
          if (avanthika) students.push(avanthika);
        }
      }
      callback(students);
    }, (err) => {
      console.warn("Listen to students failed:", err);
      callback([...DEFAULT_G12_STUDENTS, ...DEFAULT_G11_STUDENTS]);
    });
  },

  listenToSubmissions(role: Role, userId: string, classId: string | undefined, callback: (subs: Submission[]) => void) {
    const colRef = collection(db, "submissions");
    let q;
    
    // Scoped query: students query their own submissions; teachers and admins listen to all submissions
    if (role === 'student') {
      q = query(colRef, where("userId", "==", userId));
    } else {
      q = query(colRef);
    }

    const getMergedSubs = (firestoreSubs: Submission[]) => {
      try {
        const localStr = localStorage.getItem("ti_moodle_local_submissions");
        const localSubs: Submission[] = localStr ? JSON.parse(localStr) : [];
        const mergedMap = new Map<string, Submission>();
        
        localSubs.forEach(s => {
          // Exclude any fake seeded submissions
          if (!s.feedback?.includes('Auto-Verified: All recursive')) {
            mergedMap.set(`${s.userId}_${s.labId}`, s);
          }
        });
        firestoreSubs.forEach(s => {
          if (!s.feedback?.includes('Auto-Verified: All recursive')) {
            mergedMap.set(`${s.userId}_${s.labId}`, s);
          }
        });
        return Array.from(mergedMap.values());
      } catch (e) {
        return firestoreSubs;
      }
    };

    // Emit local storage submissions immediately so that UI is super responsive
    try {
      const localStr = localStorage.getItem("ti_moodle_local_submissions");
      if (localStr) {
        const parsed: Submission[] = JSON.parse(localStr);
        callback(parsed.filter(s => !s.feedback?.includes('Auto-Verified: All recursive')));
      }
    } catch (e) {}

    return onSnapshot(q, (snap) => {
      const firestoreSubs = snap.docs.map(d => d.data() as Submission);
      callback(getMergedSubs(firestoreSubs));
    }, (err) => {
      console.warn("Firestore snapshot error (permissions or offline), using localStorage:", err);
      try {
        const localStr = localStorage.getItem("ti_moodle_local_submissions");
        const localSubs: Submission[] = localStr ? JSON.parse(localStr) : [];
        callback(localSubs.filter(s => !s.feedback?.includes('Auto-Verified: All recursive')));
      } catch (e) {
        callback([]);
      }
    });
  },

  // Assessment Methods
  async getAssessments(): Promise<Assessment[]> {
    try {
      const snap = await getDocs(collection(db, "assessments"));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Assessment));
    } catch (e) {
      return [];
    }
  },

  async saveAssessment(assessment: Assessment): Promise<void> {
    try {
      await setDoc(doc(db, "assessments", assessment.id), assessment);
    } catch (e: any) {
      console.error("Firestore Save Error [Assessments]:", e.code, e.message);
      throw e;
    }
  },

  async deleteAssessment(id: string): Promise<void> {
    await deleteDoc(doc(db, "assessments", id));
  },

  async submitAssessment(submission: AssessmentSubmission): Promise<void> {
    const subId = `${submission.userId}_${submission.assessmentId}`;
    await setDoc(doc(db, "assessment_submissions", subId), submission);
    
    // Reward points
    const userRef = doc(db, "users", submission.userId);
    await updateDoc(userRef, {
      points: increment(submission.score * 10) // 10 points per mark
    });
  },

  listenToAssessmentSubmissions(userId: string, callback: (subs: AssessmentSubmission[]) => void) {
    const q = query(collection(db, "assessment_submissions"), where("userId", "==", userId));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as AssessmentSubmission));
    }, (err) => {
        console.warn("Assessment submission snapshot error:", err);
        callback([]);
    });
  },

  // Listener for teachers/admins to view assessment submissions
  listenToClassAssessmentSubmissions(role: Role, classId: string | undefined, callback: (subs: AssessmentSubmission[]) => void) {
    const colRef = collection(db, "assessment_submissions");
    const q = query(colRef);

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as AssessmentSubmission));
    }, (err) => {
        console.warn("Class assessment submission snapshot error:", err);
        callback([]);
    });
  },

  async resetSystem(adminId: string): Promise<void> {
    const collections = ["labs", "classrooms", "submissions", "users", "assessments", "assessment_submissions"];
    for (const col of collections) {
      try {
        const snap = await getDocs(collection(db, col));
        const batch = writeBatch(db);
        snap.docs.forEach(d => {
          if (col === "users" && d.id === adminId) return;
          batch.delete(d.ref);
        });
        await batch.commit();
      } catch (e) {
        console.error(`Clear failed: ${col}`, e);
      }
    }
    const fbUser = auth.currentUser;
    if (fbUser) {
        await this.repairAdminIdentity(fbUser);
    }
  }
};
