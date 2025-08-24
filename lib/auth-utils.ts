import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User as FirebaseUser,
  sendPasswordResetEmail,
} from "firebase/auth"
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  deleteDoc,
  writeBatch,
} from "firebase/firestore"
import { auth, db } from "./firebase"

export interface UserProfile {
  uid: string
  email: string
  name: string
  role: "admin" | "teacher" | "student"
  uniqueId: string
  grade?: string
  class?: string
  teacherSubject?: string
  profileImageUrl?: string
  createdAt: Date
  updatedAt?: Date
  isActive: boolean
}

export interface CreateUserData {
  email: string
  password: string
  name: string
  role: "admin" | "teacher" | "student"
  grade?: string
  class?: string
  teacherSubject?: string
}

// 고유 ID 생성 함수
export const generateUniqueId = async (): Promise<string> => {
  const generateId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  let uniqueId = generateId()
  let isUnique = false

  while (!isUnique) {
    const q = query(collection(db, "users"), where("uniqueId", "==", uniqueId))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      isUnique = true
    } else {
      uniqueId = generateId()
    }
  }

  return uniqueId
}

// 사용자 생성 (Firebase Auth + Firestore)
export const createUser = async (userData: CreateUserData): Promise<UserProfile> => {
  try {
    // Firebase Auth에서 사용자 생성
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)

    const user = userCredential.user
    const uniqueId = await generateUniqueId()

    // Firestore에 사용자 프로필 저장
    const userProfile: UserProfile = {
      uid: user.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      uniqueId,
      grade: userData.grade,
      class: userData.class,
      teacherSubject: userData.teacherSubject,
      createdAt: new Date(),
      isActive: true,
    }

    await setDoc(doc(db, "users", user.uid), userProfile)

    return userProfile
  } catch (error: any) {
    console.error("Error creating user:", error)
    throw new Error(error.message || "사용자 생성 중 오류가 발생했습니다.")
  }
}

// 사용자 프로필만 생성 (Firebase Auth 없이)
export const createUserProfile = async (
  uid: string,
  profileData: Omit<UserProfile, "uid" | "createdAt">,
): Promise<UserProfile> => {
  try {
    const userProfile: UserProfile = {
      uid,
      ...profileData,
      createdAt: new Date(),
    }

    await setDoc(doc(db, "users", uid), userProfile)
    return userProfile
  } catch (error: any) {
    console.error("Error creating user profile:", error)
    throw new Error(error.message || "사용자 프로필 생성 중 오류가 발생했습니다.")
  }
}

// 로그인
export const loginUser = async (email: string, password: string): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return userCredential.user
  } catch (error: any) {
    console.error("Error logging in:", error)
    throw new Error(error.message || "로그인 중 오류가 발생했습니다.")
  }
}

// 로그아웃
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth)
  } catch (error: any) {
    console.error("Error logging out:", error)
    throw new Error(error.message || "로그아웃 중 오류가 발생했습니다.")
  }
}

// 사용자 프로필 조회
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, "users", uid)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as UserProfile
    }

    return null
  } catch (error: any) {
    console.error("Error getting user profile:", error)
    throw new Error(error.message || "사용자 프로필 조회 중 오류가 발생했습니다.")
  }
}

// 사용자 프로필 업데이트
export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>): Promise<void> => {
  try {
    const docRef = doc(db, "users", uid)
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    }

    await updateDoc(docRef, updateData)
  } catch (error: any) {
    console.error("Error updating user profile:", error)
    throw new Error(error.message || "사용자 프로필 업데이트 중 오류가 발생했습니다.")
  }
}

// 비밀번호 변경
export const changePassword = async (user: FirebaseUser, newPassword: string): Promise<void> => {
  try {
    await updatePassword(user, newPassword)
  } catch (error: any) {
    console.error("Error changing password:", error)
    throw new Error(error.message || "비밀번호 변경 중 오류가 발생했습니다.")
  }
}

// 비밀번호 재설정 이메일 발송
export const sendPasswordReset = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email)
  } catch (error: any) {
    console.error("Error sending password reset email:", error)
    throw new Error(error.message || "비밀번호 재설정 이메일 발송 중 오류가 발생했습니다.")
  }
}

// 사용자 검색 및 필터링
export const searchUsers = async (searchTerm: string, role?: string): Promise<UserProfile[]> => {
  try {
    let q = query(collection(db, "users"))

    if (role) {
      q = query(q, where("role", "==", role))
    }

    q = query(q, orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const users: UserProfile[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      const user = {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as UserProfile

      // 검색어가 있으면 필터링
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        if (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower) ||
          user.uniqueId.toLowerCase().includes(searchLower)
        ) {
          users.push(user)
        }
      } else {
        users.push(user)
      }
    })

    return users
  } catch (error: any) {
    console.error("Error searching users:", error)
    throw new Error(error.message || "사용자 검색 중 오류가 발생했습니다.")
  }
}

// 역할별 사용자 조회
export const getUsersByRole = async (role: string): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "users"), where("role", "==", role), orderBy("createdAt", "desc"))

    const querySnapshot = await getDocs(q)
    const users: UserProfile[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      users.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as UserProfile)
    })

    return users
  } catch (error: any) {
    console.error("Error getting users by role:", error)
    throw new Error(error.message || "역할별 사용자 조회 중 오류가 발생했습니다.")
  }
}

// 사용자 삭제
export const deleteUser = async (uid: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, "users", uid))
  } catch (error: any) {
    console.error("Error deleting user:", error)
    throw new Error(error.message || "사용자 삭제 중 오류가 발생했습니다.")
  }
}

// 여러 사용자 일괄 삭제
export const deleteMultipleUsers = async (uids: string[]): Promise<void> => {
  try {
    const batch = writeBatch(db)

    uids.forEach((uid) => {
      const userRef = doc(db, "users", uid)
      batch.delete(userRef)
    })

    await batch.commit()
  } catch (error: any) {
    console.error("Error deleting multiple users:", error)
    throw new Error(error.message || "여러 사용자 삭제 중 오류가 발생했습니다.")
  }
}

// 사용자 활성화/비활성화
export const toggleUserStatus = async (uid: string, isActive: boolean): Promise<void> => {
  try {
    await updateUserProfile(uid, { isActive, updatedAt: new Date() })
  } catch (error: any) {
    console.error("Error toggling user status:", error)
    throw new Error(error.message || "사용자 상태 변경 중 오류가 발생했습니다.")
  }
}

// 고유 ID로 사용자 찾기
export const findUserByIdNumber = async (idNumber: string): Promise<UserProfile | null> => {
  try {
    // 먼저 uniqueId로 검색
    let q = query(collection(db, "users"), where("uniqueId", "==", idNumber))
    let querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as UserProfile
    }

    // uniqueId로 찾지 못하면 이메일 앞부분으로 검색
    q = query(collection(db, "users"), where("email", ">=", idNumber), where("email", "<=", idNumber + "\uf8ff"))
    querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      const data = doc.data()
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as UserProfile
    }

    return null
  } catch (error: any) {
    console.error("Error finding user by ID number:", error)
    throw new Error(error.message || "ID로 사용자 찾기 중 오류가 발생했습니다.")
  }
}

// 역할별 리다이렉트 경로 반환
export const getRoleRedirectPath = (role: string): string => {
  switch (role) {
    case "admin":
      return "/admin"
    case "teacher":
      return "/teacher"
    case "student":
      return "/student"
    default:
      return "/dashboard"
  }
}

// 사용자 통계 조회
export const getUserStats = async (): Promise<{
  total: number
  admins: number
  teachers: number
  students: number
  active: number
  inactive: number
}> => {
  try {
    const q = query(collection(db, "users"))
    const querySnapshot = await getDocs(q)

    let total = 0
    let admins = 0
    let teachers = 0
    let students = 0
    let active = 0
    let inactive = 0

    querySnapshot.forEach((doc) => {
      const data = doc.data() as UserProfile
      total++

      switch (data.role) {
        case "admin":
          admins++
          break
        case "teacher":
          teachers++
          break
        case "student":
          students++
          break
      }

      if (data.isActive) {
        active++
      } else {
        inactive++
      }
    })

    return { total, admins, teachers, students, active, inactive }
  } catch (error: any) {
    console.error("Error getting user stats:", error)
    throw new Error(error.message || "사용자 통계 조회 중 오류가 발생했습니다.")
  }
}

// 최근 가입한 사용자 조회
export const getRecentUsers = async (limitCount = 10): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(limitCount))

    const querySnapshot = await getDocs(q)
    const users: UserProfile[] = []

    querySnapshot.forEach((doc) => {
      const data = doc.data()
      users.push({
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
      } as UserProfile)
    })

    return users
  } catch (error: any) {
    console.error("Error getting recent users:", error)
    throw new Error(error.message || "최근 사용자 조회 중 오류가 발생했습니다.")
  }
}

// 이메일 중복 확인
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const q = query(collection(db, "users"), where("email", "==", email))
    const querySnapshot = await getDocs(q)
    return !querySnapshot.empty
  } catch (error: any) {
    console.error("Error checking email exists:", error)
    throw new Error(error.message || "이메일 중복 확인 중 오류가 발생했습니다.")
  }
}

// 사용자 프로필 삭제 (관련 데이터도 함께 삭제)
export const deleteUserProfile = async (uid: string): Promise<void> => {
  try {
    const batch = writeBatch(db)

    // 사용자 프로필 삭제
    const userRef = doc(db, "users", uid)
    batch.delete(userRef)

    // 관련 데이터들도 삭제할 수 있도록 확장 가능
    // 예: 사용자가 작성한 게시물, 댓글 등

    await batch.commit()
  } catch (error: any) {
    console.error("Error deleting user profile:", error)
    throw new Error(error.message || "사용자 프로필 삭제 중 오류가 발생했습니다.")
  }
}
