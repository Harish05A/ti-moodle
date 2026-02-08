
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

export const BackendService = {
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
    return onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDocRef = doc(db, "users", fbUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
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
            const admin = await this.repairAdminIdentity(fbUser);
            localStorage.setItem('ti_moodle_user', JSON.stringify(admin));
            callback(admin);
          } else {
            callback(null);
          }
        } catch (e) {
          callback(null);
        }
      } else {
        localStorage.removeItem('ti_moodle_user');
        callback(null);
      }
    });
  },

  async login(username: string, password: string): Promise<User> {
    const email = username.includes('@') ? username : `${username}@ti-moodle.edu`;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') 
        throw new Error("Identity verification failed.");
      throw new Error(error.message || "Auth protocol error.");
    }
  },

  async logout() {
    await signOut(auth);
    localStorage.removeItem('ti_moodle_user');
  },

  async createAccount(data: { name: string, username: string, role: Role, grades?: string[] }): Promise<void> {
    const email = `${data.username}@ti-moodle.edu`;
    const password = "password123";
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser: User = { 
        id: cred.user.uid, 
        username: data.username, 
        name: data.name, 
        role: data.role, 
        grades: data.grades || [],
        points: 0,
        streak: 0,
        isFirstLogin: true
      };
      await setDoc(doc(db, "users", cred.user.uid), newUser);
      await signOut(secondaryAuth);
    } catch (e: any) {
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
        return snap.docs.map(d => ({
            ...d.data(),
            id: d.id,
            grades: d.data().grades || [],
            points: d.data().points || 0,
            streak: d.data().streak || 0
        } as User));
    } catch (e: any) {
        return [];
    }
  },

  async getClassrooms(user?: User | null): Promise<Classroom[]> {
    if (!user) return [];
    try {
      const colRef = collection(db, "classrooms");
      if (user.role === 'admin') {
        const snap = await getDocs(colRef);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Classroom));
      } 
      if (user.role === 'teacher') {
        const q = query(colRef, where("teacherId", "==", user.id));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Classroom));
      } 
      if (user.role === 'student' && user.grades && user.grades.length > 0) {
        const results: Classroom[] = [];
        for (const classId of user.grades) {
          const snap = await getDoc(doc(db, "classrooms", classId));
          if (snap.exists()) {
            results.push({ ...snap.data(), id: snap.id } as Classroom);
          }
        }
        return results;
      }
      return [];
    } catch (e: any) {
      return [];
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

  async submitLab(submission: Submission): Promise<void> {
    const subId = `${submission.userId}_${submission.labId}`;
    await setDoc(doc(db, "submissions", subId), {
      ...submission,
      submittedAt: Date.now()
    });
  },

  listenToSubmissions(role: Role, userId: string, classId: string | undefined, callback: (subs: Submission[]) => void) {
    const colRef = collection(db, "submissions");
    let q;
    
    // Scoped query to prevent permission errors on high-level collections
    if (role === 'student') {
      q = query(colRef, where("userId", "==", userId));
    } else if (classId) {
      q = query(colRef, where("classId", "==", classId));
    } else if (role === 'admin') {
      q = query(colRef);
    } else {
        callback([]);
        return () => {};
    }

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as Submission));
    }, (err) => {
      console.warn("Firestore snapshot error:", err);
      callback([]);
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

  // NEW: Added listener for teachers to view assessment submissions per class
  listenToClassAssessmentSubmissions(role: Role, classId: string | undefined, callback: (subs: AssessmentSubmission[]) => void) {
    const colRef = collection(db, "assessment_submissions");
    let q;
    
    if (role === 'admin') {
      q = query(colRef);
    } else if (classId) {
      q = query(colRef, where("classId", "==", classId));
    } else {
      callback([]);
      return () => {};
    }

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
