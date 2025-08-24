"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpen,
  FileText,
  Plus,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  Trash2,
  ExternalLink,
  GraduationCap,
  LogOut,
  Settings,
  UserCheck,
  UserX,
  Users,
  Sparkles,
  UserPlus,
  Search,
  Filter,
  Edit,
  User,
  Trash,
  Bell,
  CalendarIcon,
  MessageCircle,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { safeAddDoc, safeDeleteDoc, safeUpdateDoc } from "@/lib/firebase-utils"
import { usePollingData } from "@/hooks/use-polling-data"
import { ClassManagement } from "@/components/class-management"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"
import { RichTextEditor } from "@/components/rich-text-editor"
import { SubmissionViewer } from "@/components/submission-viewer"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"
import { ClassJoinRequest } from "@/components/class-join-request"
import { Calendar } from "@/components/calendar"
import { updateUserProfile, deleteUserProfile, type UserProfile } from "@/lib/auth-utils"
import type { UploadedFile } from "@/lib/storage-utils"
import Link from "next/link"
import { UserCreationModal } from "@/components/user-creation-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ClassInfo {
  id: string
  name: string
  grade: string
  classNumber: string
  subject: string
  teacherId: string
  teacherName: string
  description?: string
  memberCount: number
  createdAt: Date
}

interface ClassMember {
  id: string
  classId: string
  memberId: string
  memberName: string
  memberRole: "student" | "teacher"
  joinedAt: Date
}

interface ClassAssignment {
  id: string
  title: string
  content: string
  dueDate: string
  subject: string
  classId: string
  files?: UploadedFile[]
  createdBy: string
  createdAt: Date
}

interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  content: string
  files?: UploadedFile[]
  submittedAt: Date
  status: "submitted" | "graded"
  grade?: number
  feedback?: string
}

interface JoinRequest {
  id: string
  classId: string
  className: string
  requesterId: string
  requesterName: string
  requesterRole: "student" | "teacher"
  teacherId: string
  status: "pending" | "approved" | "rejected"
  requestedAt: Date
  respondedAt?: Date
}

interface SubmissionViewerData {
  assignment: ClassAssignment
  submissions: AssignmentSubmission[]
}

interface Notification {
  id: string
  type: "new_submission" | "due_date_reminder" | "new_notice"
  assignmentId?: string
  assignmentTitle?: string
  noticeId?: string
  noticeTitle?: string
  classId: string
  className: string
  teacherId: string
  studentId?: string
  studentName?: string
  createdAt: Date
  read: boolean
}

export default function TeacherDashboard() {
  const { user, userProfile, logout } = useAuth()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isUserCreationModalOpen, setIsUserCreationModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<ClassAssignment | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null)
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    content: "",
    dueDate: "",
    classId: "",
  })
  const [assignmentFiles, setAssignmentFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedSubmissionData, setSelectedSubmissionData] = useState<SubmissionViewerData | null>(null)

  // 알림 중복 생성 방지를 위한 ref - 더 정교한 추적
  const processedNotifications = useRef(new Map<string, boolean>())
  const lastNotificationCheck = useRef<number>(0)

  // 학생 관리 관련 상태
  const [studentSearchTerm, setStudentSearchTerm] = useState("")
  const [studentGradeFilter, setStudentGradeFilter] = useState("all")
  const [studentClassFilter, setStudentClassFilter] = useState("all")
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null)
  const [isEditingStudent, setIsEditingStudent] = useState(false)
  const [editStudentData, setEditStudentData] = useState({
    name: "",
    userId: "",
    grade: "",
    class: "",
  })
  const [myStudents, setMyStudents] = useState<UserProfile[]>([])
  const [showMyStudentsOnly, setShowMyStudentsOnly] = useState(false)

  // 내가 만든 반 목록
  const myClassesRef = user ? query(collection(db, "classes"), where("teacherId", "==", user.uid)) : null
  const { data: myClasses, refresh: refreshClasses } = usePollingData<ClassInfo>(myClassesRef, (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
  }))

  // 내가 참가한 반 목록 (다른 교사의 반)
  const myMembershipsRef = user ? query(collection(db, "classMembers"), where("memberId", "==", user.uid)) : null
  const { data: myMemberships } = usePollingData<ClassMember>(myMembershipsRef, (data) => ({
    ...data,
    joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date(data.joinedAt),
  }))

  // 참가한 반들의 정보
  const membershipClassIds = myMemberships?.map((membership) => membership.classId) || []
  const allClassesRef = collection(db, "classes")
  const { data: allClasses } = usePollingData<ClassInfo>(allClassesRef, (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
  }))
  const joinedClasses = allClasses?.filter((classInfo) => membershipClassIds.includes(classInfo.id)) || []

  // 모든 반 (내가 만든 반 + 참가한 반) - 중복 제거
  const allMyClasses = [
    ...(myClasses || []),
    ...joinedClasses.filter((joinedClass) => !myClasses?.some((myClass) => myClass.id === joinedClass.id)),
  ]

  // 모든 반의 과제들
  const allClassIds = allMyClasses.map((cls) => cls.id)
  const allAssignmentsRef = collection(db, "assignments")
  const { data: allAssignments, refresh: refreshAssignments } = usePollingData<ClassAssignment>(
    allAssignmentsRef,
    (data) => ({
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    }),
  )
  const myAssignments = allAssignments?.filter((assignment) => allClassIds.includes(assignment.classId)) || []

  // 내가 만든 과제들
  const myCreatedAssignments = allAssignments?.filter((assignment) => assignment.createdBy === user?.uid) || []

  // 모든 제출물
  const allSubmissionsRef = collection(db, "assignmentSubmissions")
  const { data: allSubmissions } = usePollingData<AssignmentSubmission>(allSubmissionsRef, (data) => ({
    ...data,
    submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
  }))

  // 내 반들의 멤버들
  const myClassIds = myClasses?.map((cls) => cls.id) || []
  const allMembersRef = collection(db, "classMembers")
  const { data: allMembers, refresh: refreshMembers } = usePollingData<ClassMember>(allMembersRef, (data) => ({
    ...data,
    joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date(data.joinedAt),
  }))
  const myClassMembers = allMembers?.filter((member) => myClassIds.includes(member.classId)) || []

  // isMyStudent 함수
  const isMyStudent = (studentId: string) => {
    return myClassMembers.some(
      (member) =>
        member.memberId === studentId && member.memberRole === "student" && myClassIds.includes(member.classId),
    )
  }

  // 전체 학생 목록을 가져오기 위한 쿼리 추가
  const allStudentsRef = collection(db, "users")
  const allStudentsQuery = query(allStudentsRef, where("role", "==", "student"))
  const { data: allStudentsData } = usePollingData<UserProfile>(allStudentsQuery, (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
  }))

  // 알림 데이터 가져오기 - 실시간 업데이트를 위해 더 자주 새로고침
  const notificationsRef = user
    ? query(
        collection(db, "notifications"),
        where("teacherId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(50),
      )
    : null
  const { data: notifications, refresh: refreshNotifications } = usePollingData<Notification>(
    notificationsRef,
    (data) => ({
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    }),
    { useCache: false }, // 알림은 캐시 사용 안함
  )

  const unreadNotificationsCount = notifications?.filter((n) => !n.read).length || 0

  // 학생 정보를 개별적으로 가져오는 함수
  const fetchStudentInfo = async (studentId: string): Promise<UserProfile | null> => {
    try {
      const userDoc = await import("firebase/firestore").then(({ doc, getDoc }) => getDoc(doc(db, "users", studentId)))
      if (userDoc.exists()) {
        const data = userDoc.data()
        return {
          ...data,
          uid: userDoc.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
        } as UserProfile
      }
      return null
    } catch (error: any) {
      // 권한 오류는 조용히 처리하고 null 반환
      if (error.code === "permission-denied" || error.message?.includes("Missing or insufficient permissions")) {
        console.log(`Permission denied for student ${studentId}, skipping...`)
        return null
      }
      console.error(`Error fetching student ${studentId}:`, error)
      return null
    }
  }

  // 전체 학생들 정보 설정
  useEffect(() => {
    if (allStudentsData) {
      setMyStudents(allStudentsData)
    } else {
      setMyStudents([])
    }
  }, [allStudentsData])

  // 필터링된 학생 목록
  const filteredStudents = myStudents.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.userId?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.uniqueId?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.email?.toLowerCase().includes(studentSearchTerm.toLowerCase())

    const matchesGrade = studentGradeFilter === "all" || student.grade === studentGradeFilter
    const matchesClass = studentClassFilter === "all" || student.class === studentClassFilter
    const matchesMyStudentsOnly = !showMyStudentsOnly || isMyStudent(student.uid)

    return matchesSearch && matchesGrade && matchesClass && matchesMyStudentsOnly
  })

  // 참가 요청들 (내가 만든 반에 대한)
  const joinRequestsRef = user ? query(collection(db, "classJoinRequests"), where("teacherId", "==", user.uid)) : null
  const { data: joinRequests, refresh: refreshJoinRequests } = usePollingData<JoinRequest>(joinRequestsRef, (data) => ({
    ...data,
    requestedAt: data.requestedAt?.toDate ? data.requestedAt.toDate() : new Date(data.requestedAt),
    respondedAt: data.respondedAt?.toDate ? data.respondedAt.toDate() : data.respondedAt,
  }))

  // 대기 중인 요청 수
  const pendingRequestsCount = joinRequests?.filter((req) => req.status === "pending").length || 0

  // 통계 계산
  const totalClasses = myClasses?.length || 0
  const totalJoinedClasses = joinedClasses.length
  const totalAssignments = myCreatedAssignments.length
  const totalSubmissions =
    allSubmissions?.filter((sub) => myCreatedAssignments.some((assignment) => assignment.id === sub.assignmentId))
      .length || 0

  const [assignmentContent, setAssignmentContent] = useState("")

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newAssignment.title || !assignmentContent || !newAssignment.dueDate || !newAssignment.classId) {
      setError("모든 필드를 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const selectedClass = allMyClasses.find((cls) => cls.id === newAssignment.classId)
      if (!selectedClass) {
        setError("선택한 반을 찾을 수 없습니다.")
        return
      }

      const assignmentData = {
        title: newAssignment.title,
        content: assignmentContent,
        dueDate: newAssignment.dueDate,
        subject: selectedClass.subject || "일반",
        classId: newAssignment.classId,
        files: assignmentFiles,
        createdBy: user.uid,
        createdAt: new Date(),
      }

      await safeAddDoc("assignments", assignmentData)

      setSuccess("과제가 성공적으로 생성되었습니다.")
      setNewAssignment({ title: "", content: "", dueDate: "", classId: "" })
      setAssignmentContent("")
      setAssignmentFiles([])
      setIsCreatingAssignment(false)
      refreshAssignments()
    } catch (error: any) {
      console.error("Error creating assignment:", error)
      setError("과제 생성 중 오류가 발생했습니다: " + error.message)
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("정말로 이 과제를 삭제하시겠습니까?")) return

    try {
      await safeDeleteDoc(`assignments/${assignmentId}`)
      setSuccess("과제가 삭제되었습니다.")
      refreshAssignments()
    } catch (error: any) {
      console.error("Error deleting assignment:", error)
      setError("과제 삭제 중 오류가 발생했습니다: " + error.message)
    }
  }

  const handleApproveRequest = async (
    requestId: string,
    classId: string,
    requesterId: string,
    requesterName: string,
    requesterRole: "student" | "teacher",
  ) => {
    try {
      await safeAddDoc("classMembers", {
        classId,
        memberId: requesterId,
        memberName: requesterName,
        memberRole: requesterRole,
        joinedAt: new Date(),
      })

      await safeUpdateDoc(`classJoinRequests/${requestId}`, {
        status: "approved",
        respondedAt: new Date(),
      })

      setSuccess(`${requesterName}님의 참가 요청을 승인했습니다.`)
      refreshJoinRequests()
      refreshMembers()
    } catch (error: any) {
      console.error("Error approving request:", error)
      setError("요청 승인 중 오류가 발생했습니다: " + error.message)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      const request = joinRequests?.find((req) => req.id === requestId)
      if (!request) {
        setError("요청을 찾을 수 없습니다.")
        return
      }

      await safeUpdateDoc(`classJoinRequests/${requestId}`, {
        status: "rejected",
        respondedAt: new Date(),
      })

      setSuccess(`${request.requesterName}님의 참가 요청을 거절했습니다.`)
      refreshJoinRequests()
    } catch (error: any) {
      console.error("Error rejecting request:", error)
      setError("요청 거절 중 오류가 발생했습니다: " + error.message)
    }
  }

  // 모든 참가 요청 삭제
  const handleDeleteAllRequests = async () => {
    if (!joinRequests || joinRequests.length === 0) {
      setError("삭제할 참가 요청이 없습니다.")
      return
    }

    if (
      !confirm(`정말로 모든 참가 요청 기록 ${joinRequests.length}개를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)
    ) {
      return
    }

    setError("")
    setSuccess("")

    try {
      // 모든 참가 요청 삭제
      const deletePromises = joinRequests.map((request) => safeDeleteDoc(`classJoinRequests/${request.id}`))
      await Promise.all(deletePromises)

      setSuccess(`${joinRequests.length}개의 참가 요청 기록이 모두 삭제되었습니다.`)
      refreshJoinRequests()
    } catch (error: any) {
      console.error("Error deleting all requests:", error)
      setError("참가 요청 삭제 중 오류가 발생했습니다: " + error.message)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string, classId: string) => {
    if (!confirm(`정말로 ${memberName}님을 반에서 추방하시겠습니까?`)) return

    try {
      const memberToRemove = myClassMembers.find((member) => member.memberId === memberId && member.classId === classId)

      if (!memberToRemove) {
        setError("멤버를 찾을 수 없습니다.")
        return
      }

      await safeDeleteDoc(`classMembers/${memberToRemove.id}`)

      setSuccess(`${memberName}님을 반에서 추방했습니다.`)
      refreshMembers()
    } catch (error: any) {
      console.error("Error removing member:", error)
      setError("멤버 추방 중 오류가 발생했습니다: " + error.message)
    }
  }

  const handleUpdateStudent = async () => {
    if (!selectedStudent) return

    setError("")
    setSuccess("")

    try {
      const updates: Partial<UserProfile> = {
        name: editStudentData.name,
        userId: editStudentData.userId,
        studentId: editStudentData.userId, // 기존 호환성
        grade: editStudentData.grade,
        class: editStudentData.class,
        updatedAt: new Date(),
      }

      await updateUserProfile(selectedStudent.uid, updates)
      setSuccess(`${editStudentData.name}님의 정보가 성공적으로 업데이트되었습니다.`)
      setIsEditingStudent(false)

      // 학생 목록 새로고침
      const updatedStudent = await fetchStudentInfo(selectedStudent.uid)
      if (updatedStudent) {
        setMyStudents((prev) => prev.map((student) => (student.uid === selectedStudent.uid ? updatedStudent : student)))
        setSelectedStudent(updatedStudent)
      }
    } catch (error: any) {
      console.error("Update student error:", error)
      setError(error.message || "학생 정보 업데이트 중 오류가 발생했습니다.")
    }
  }

  const getSubmissionsForAssignment = (assignmentId: string) => {
    return allSubmissions?.filter((sub) => sub.assignmentId === assignmentId) || []
  }

  const getClassForAssignment = (classId: string) => {
    return allMyClasses.find((cls) => cls.id === classId)
  }

  const getMembersForClass = (classId: string) => {
    return myClassMembers.filter((member) => member.classId === classId)
  }

  const getStudentClasses = (studentId: string) => {
    const studentMemberships = myClassMembers.filter((member) => member.memberId === studentId)
    return studentMemberships
      .map((membership) => {
        const classInfo = myClasses?.find((cls) => cls.id === membership.classId)
        return classInfo
      })
      .filter(Boolean)
  }

  // 마감 시간 계산 함수
  const getTimeRemaining = (dueDate: string) => {
    const now = new Date()
    const due = new Date(dueDate)
    const diff = due.getTime() - now.getTime()

    if (diff <= 0) {
      return { text: "마감됨", color: "text-red-600", bgColor: "bg-red-50" }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 3) {
      return { text: `${days}일 남음`, color: "text-green-600", bgColor: "bg-green-50" }
    } else if (days > 1) {
      return { text: `${days}일 ${hours}시간 남음`, color: "text-yellow-600", bgColor: "bg-yellow-50" }
    } else if (days === 1) {
      return { text: `1일 ${hours}시간 남음`, color: "text-orange-600", bgColor: "bg-orange-50" }
    } else if (hours > 0) {
      return { text: `${hours}시간 남음`, color: "text-red-600", bgColor: "bg-red-50" }
    } else {
      return { text: "곧 마감", color: "text-red-600", bgColor: "bg-red-50" }
    }
  }

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && e.target !== e.currentTarget) {
      e.preventDefault()
    }
  }

  const handleDeleteStudent = async (student: UserProfile) => {
    if (!confirm(`정말로 ${student.name}님의 계정을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return

    setError("")
    setSuccess("")

    try {
      await deleteUserProfile(student.uid)
      setSuccess(`${student.name}님의 계정이 삭제되었습니다.`)

      // 학생 목록에서 제거
      setMyStudents((prev) => prev.filter((s) => s.uid !== student.uid))

      // 선택된 학생이 삭제된 학생이면 선택 해제
      if (selectedStudent?.uid === student.uid) {
        setSelectedStudent(null)
        setIsEditingStudent(false)
      }
    } catch (error: any) {
      console.error("Delete student error:", error)
      setError(error.message || "학생 계정 삭제 중 오류가 발생했습니다.")
    }
  }

  // 알림 읽음 처리
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await safeUpdateDoc(`notifications/${notificationId}`, { read: true })
      refreshNotifications()
    } catch (error: any) {
      console.error("Error marking notification as read:", error)
    }
  }

  // 모든 알림 읽음 처리
  const markAllNotificationsAsRead = async () => {
    if (!notifications) return

    try {
      const updates = notifications
        .filter((n) => !n.read)
        .map((n) => safeUpdateDoc(`notifications/${n.id}`, { read: true }))
      await Promise.all(updates)
      refreshNotifications()
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  // 알림 삭제
  const deleteNotification = async (notificationId: string) => {
    try {
      await safeDeleteDoc(`notifications/${notificationId}`)
      refreshNotifications()
    } catch (error: any) {
      console.error("Error deleting notification:", error)
    }
  }

  // 모든 알림 삭제
  const deleteAllNotifications = async () => {
    if (!confirm("정말로 모든 알림을 삭제하시겠습니까?") || !notifications) return

    try {
      const deletePromises = notifications.map((n) => safeDeleteDoc(`notifications/${n.id}`))
      await Promise.all(deletePromises)
      refreshNotifications()
    } catch (error: any) {
      console.error("Error deleting all notifications:", error)
    }
  }

  // 개선된 알림 생성 함수
  const createNotificationSafely = async (notificationData: any) => {
    try {
      await safeAddDoc("notifications", {
        ...notificationData,
        createdAt: new Date(),
        read: false,
      })
      // 알림 생성 후 즉시 새로고침
      setTimeout(() => refreshNotifications(), 100)
    } catch (error: any) {
      console.error("Failed to create notification:", error)
    }
  }

  // 알림 시스템 - 새 제출물 체크 (교사용) - 개선된 버전
  useEffect(() => {
    if (!user || !myCreatedAssignments || !allSubmissions) return

    const checkNewSubmissions = async () => {
      const now = Date.now()
      // 5초마다만 체크하도록 제한
      if (now - lastNotificationCheck.current < 5000) return
      lastNotificationCheck.current = now

      for (const assignment of myCreatedAssignments) {
        const submissions = allSubmissions.filter((sub) => sub.assignmentId === assignment.id)
        const classInfo = getClassForAssignment(assignment.classId)

        for (const submission of submissions) {
          const notificationKey = `new_submission_${assignment.id}_${submission.studentId}`

          // 이미 처리된 제출물은 건너뛰기
          if (processedNotifications.current.has(notificationKey)) continue

          // 기존 알림이 있는지 확인
          const existingNotification = notifications?.find(
            (n) =>
              n.type === "new_submission" && n.assignmentId === assignment.id && n.studentId === submission.studentId,
          )

          if (!existingNotification && classInfo) {
            const notificationData = {
              type: "new_submission",
              assignmentId: assignment.id,
              assignmentTitle: assignment.title,
              classId: assignment.classId,
              className: classInfo.name,
              teacherId: user.uid,
              studentId: submission.studentId,
              studentName: submission.studentName,
            }

            await createNotificationSafely(notificationData)
          }

          // 처리된 것으로 표시
          processedNotifications.current.set(notificationKey, true)
        }
      }
    }

    checkNewSubmissions()
  }, [user, myCreatedAssignments, allSubmissions, notifications])

  // 알림 시스템 - 마감 임박 체크 (교사용) - 개선된 버전
  useEffect(() => {
    if (!user || !myCreatedAssignments) return

    const checkDueDateReminders = async () => {
      for (const assignment of myCreatedAssignments) {
        const dueDate = new Date(assignment.dueDate)
        const now = new Date()
        const timeDiff = dueDate.getTime() - now.getTime()
        const hoursUntilDue = timeDiff / (1000 * 60 * 60)

        if (hoursUntilDue <= 24 && hoursUntilDue > 0) {
          const notificationKey = `due_date_reminder_${assignment.id}`

          // 이미 처리된 과제는 건너뛰기
          if (processedNotifications.current.has(notificationKey)) continue

          // 기존 알림이 있는지 확인
          const existingNotification = notifications?.find(
            (n) => n.type === "due_date_reminder" && n.assignmentId === assignment.id,
          )

          if (!existingNotification) {
            const classInfo = getClassForAssignment(assignment.classId)
            if (classInfo) {
              const notificationData = {
                type: "due_date_reminder",
                assignmentId: assignment.id,
                assignmentTitle: assignment.title,
                classId: assignment.classId,
                className: classInfo.name,
                teacherId: user.uid,
              }

              await createNotificationSafely(notificationData)
            }
          }

          // 처리된 것으로 표시
          processedNotifications.current.set(notificationKey, true)
        }
      }
    }

    checkDueDateReminders()
  }, [user, myCreatedAssignments, notifications])

  // 알림 새로고침을 위한 주기적 업데이트
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      refreshNotifications()
    }, 10000) // 10초마다 알림 새로고침

    return () => clearInterval(interval)
  }, [user, refreshNotifications])

  // 1:1 채팅 시작 함수
  const startChatWithStudent = async (student: UserProfile) => {
    if (!user) return

    try {
      // 기존 채팅방이 있는지 확인
      const existingChatQuery = query(collection(db, "chatRooms"), where("participants", "array-contains", user.uid))

      const existingChatSnapshot = await import("firebase/firestore").then(({ getDocs }) => getDocs(existingChatQuery))

      let existingChatId = null
      existingChatSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.participants.includes(student.uid)) {
          existingChatId = doc.id
        }
      })

      if (existingChatId) {
        // 기존 채팅방으로 이동
        window.open(`/chat?room=${existingChatId}`, "_blank")
        return
      }

      // 새 채팅방 생성
      const chatRoomData = {
        participants: [user.uid, student.uid],
        participantNames: {
          [user.uid]: user.displayName || user.email,
          [student.uid]: student.name,
        },
        lastMessage: "",
        lastMessageTime: new Date(),
        unreadCount: 0,
        createdBy: user.uid,
        createdAt: new Date(),
      }

      const docRef = await safeAddDoc("chatRooms", chatRoomData)

      // 새 채팅방으로 이동
      window.open(`/chat?room=${docRef.id}`, "_blank")

      setSuccess(`${student.name}님과의 채팅방이 생성되었습니다.`)
    } catch (error: any) {
      console.error("채팅방 생성 실패:", error)
      setError("채팅방 생성 중 오류가 발생했습니다.")
    }
  }

  // 사용자 생성 성공 핸들러
  const handleUserCreated = (userInfo: any) => {
    console.log("새 사용자가 생성되었습니다:", userInfo)

    // 학생이 생성된 경우 학생 목록에 추가
    if (userInfo.role === "student") {
      setMyStudents((prev) => [...prev, userInfo])
    }

    // 성공 메시지 표시
    setSuccess(`${userInfo.role === "student" ? "학생" : "교사"} 계정 "${userInfo.name}"이 성공적으로 생성되었습니다.`)

    // 에러 메시지 초기화
    setError("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center animate-in slide-in-from-left duration-700">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4 shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  교사 대시보드
                </h1>
                <p className="text-gray-600">안녕하세요, {userProfile?.name} 선생님!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 animate-in slide-in-from-right duration-700">
              <div className="flex items-center space-x-3">
                <Avatar className="ring-4 ring-blue-200">
                  {userProfile?.profileImageUrl && (
                    <img
                      src={userProfile.profileImageUrl || "/placeholder.svg"}
                      alt={userProfile.name || "프로필"}
                      className="object-cover w-full h-full rounded-full"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white">
                    {userProfile?.name?.charAt(0) ?? ""}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{userProfile?.name}</p>
                  <div className="flex items-center space-x-1">
                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded-full">
                      교사
                    </Badge>
                    {userProfile?.uniqueId && (
                      <Badge variant="outline" className="text-xs rounded-full">
                        {userProfile.uniqueId}
                      </Badge>
                    )}
                    {userProfile?.teacherSubject && (
                      <Badge variant="outline" className="text-xs rounded-full">
                        {userProfile.teacherSubject}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <Bell className="h-4 w-4" />
                    {unreadNotificationsCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs animate-pulse bg-red-500">
                        {unreadNotificationsCount}
                      </Badge>
                    )}
                    <span className="sr-only">알림</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>알림</span>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllNotificationsAsRead}
                        className="h-6 px-2 text-xs"
                      >
                        모두 읽음
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deleteAllNotifications}
                        className="h-6 px-2 text-xs text-red-600"
                      >
                        모두 삭제
                      </Button>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <ScrollArea className="max-h-64">
                    {notifications && notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <DropdownMenuItem
                          key={notification.id}
                          onClick={() => {
                            markNotificationAsRead(notification.id)
                            if (notification.assignmentId) {
                              const submissionsForAssignment = getSubmissionsForAssignment(notification.assignmentId)
                              const assignment = myCreatedAssignments.find((a) => a.id === notification.assignmentId)
                              if (assignment) {
                                setSelectedSubmissionData({
                                  assignment: assignment,
                                  submissions: submissionsForAssignment,
                                })
                              }
                            }
                          }}
                          className={`flex items-center justify-between p-3 ${!notification.read ? "bg-blue-50" : ""}`}
                        >
                          <div className="flex flex-col text-sm">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium">{notification.assignmentTitle || notification.noticeTitle}</p>
                              {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                            </div>
                            <p className="text-xs text-gray-500">
                              {notification.type === "new_submission"
                                ? `${notification.studentName}님이 제출물을 제출했습니다`
                                : notification.type === "due_date_reminder"
                                  ? "마감 임박"
                                  : "새 공지사항"}
                            </p>
                            <p className="text-xs text-gray-500">{notification.className}</p>
                            <p className="text-xs text-gray-500">{new Date(notification.createdAt).toLocaleString()}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="h-6 w-6"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem className="justify-center">알림이 없습니다.</DropdownMenuItem>
                    )}
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsProfileModalOpen(true)}
                className="rounded-full hover:bg-blue-50 transition-all duration-300 transform hover:scale-105"
              >
                <Settings className="h-4 w-4 mr-2" />
                설정
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={logout}
                className="rounded-full hover:bg-red-50 hover:text-red-600 transition-all duration-300 transform hover:scale-105"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
              <Button
                type="button"
                onClick={() => setIsUserCreationModalOpen(true)}
                className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition-all duration-300 transform hover:scale-105"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                사용자 생성
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-in fade-in duration-700">
          <Card className="group overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-blue-100 text-sm font-medium">내 반</p>
                  <p className="text-3xl font-bold">{totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-green-100 text-sm font-medium">내 학생</p>
                  <p className="text-3xl font-bold">{myStudents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-purple-100 text-sm font-medium">내 과제</p>
                  <p className="text-3xl font-bold">{totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-orange-100 text-sm font-medium">제출물</p>
                  <p className="text-3xl font-bold">{totalSubmissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert
            variant="destructive"
            className="mb-6 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl animate-in slide-in-from-top duration-300"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl animate-in slide-in-from-top duration-300">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="assignments" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md rounded-full p-1 shadow-lg border-0">
            <TabsTrigger
              value="assignments"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              과제 관리
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
            >
              반 관리
            </TabsTrigger>
            <TabsTrigger
              value="students"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              학생 관리
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="relative rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              참가 요청
              {pendingRequestsCount > 0 && (
                <Badge className="ml-2 h-5 w-5 p-0 text-xs bg-gradient-to-r from-red-500 to-pink-500 animate-pulse">
                  {pendingRequestsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              캘린더
            </TabsTrigger>
            <TabsTrigger
              value="join"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
            >
              반 참가
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            {/* 과제 생성 */}
            <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                        <Plus className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        새 과제 만들기
                      </span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">학생들에게 새로운 과제를 배정하세요</CardDescription>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setIsCreatingAssignment(!isCreatingAssignment)}
                    className={`px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 ${
                      isCreatingAssignment
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600"
                        : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                    } shadow-lg hover:shadow-xl`}
                  >
                    {isCreatingAssignment ? "취소" : "과제 만들기"}
                  </Button>
                </div>
              </CardHeader>

              {isCreatingAssignment && (
                <CardContent className="relative animate-in slide-in-from-top duration-500">
                  <form onSubmit={handleCreateAssignment} onKeyDown={handleFormKeyDown} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                          과제 제목
                        </Label>
                        <Input
                          id="title"
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="과제 제목을 입력하세요"
                          className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="classId" className="text-sm font-medium text-gray-700">
                          반 선택
                        </Label>
                        <Select
                          value={newAssignment.classId}
                          onValueChange={(value) => setNewAssignment((prev) => ({ ...prev, classId: value }))}
                          required
                        >
                          <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300">
                            <SelectValue placeholder="반을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {allMyClasses.map((classInfo) => (
                              <SelectItem key={classInfo.id} value={classInfo.id}>
                                {classInfo.name} ({classInfo.subject || "일반"})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700">
                        마감일
                      </Label>
                      <Input
                        id="dueDate"
                        type="datetime-local"
                        value={newAssignment.dueDate}
                        onChange={(e) => setNewAssignment((prev) => ({ ...prev, dueDate: e.target.value }))}
                        className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content" className="text-sm font-medium text-gray-700">
                        과제 내용
                      </Label>
                      <div onKeyDown={(e) => e.stopPropagation()}>
                        <RichTextEditor
                          value={assignmentContent}
                          onChange={(value) => setAssignmentContent(value)}
                          placeholder="과제 내용을 입력하세요..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">첨부 파일</Label>
                      <FileUpload
                        onFilesUploaded={(files) => setAssignmentFiles(files)}
                        maxFiles={5}
                        uploadPath={user?.uid ? `files/assignments/${user.uid}` : ""}
                        acceptedTypes={["image/*", "application/pdf", ".doc,.docx,.txt"]}
                        uploadedFiles={assignmentFiles}
                        onFileRemoved={(fileId) => {
                          setAssignmentFiles((prev) => prev.filter((f) => f.id !== fileId))
                        }}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      과제 생성하기
                    </Button>
                  </form>
                </CardContent>
              )}
            </Card>

            {/* 내 과제 목록 */}
            <Card className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                    내 과제 목록
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  생성한 과제들을 관리하고 제출물을 확인하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {myCreatedAssignments
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((assignment, index) => {
                      const submissions = getSubmissionsForAssignment(assignment.id)
                      const classInfo = getClassForAssignment(assignment.classId)
                      const timeRemaining = getTimeRemaining(assignment.dueDate)

                      return (
                        <div
                          key={assignment.id}
                          className="p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                <h4 className="text-lg font-semibold text-gray-800">{assignment.title}</h4>
                                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full px-3 py-1">
                                  {assignment.subject || "일반"}
                                </Badge>
                                <Badge variant="outline" className="rounded-full px-3 py-1">
                                  {classInfo?.name}
                                </Badge>
                                <div
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${timeRemaining.bgColor} ${timeRemaining.color} flex items-center`}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {timeRemaining.text}
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">
                                마감: {new Date(assignment.dueDate).toLocaleString()}
                              </p>
                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <span className="flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                                  제출물: {submissions.length}개
                                </span>
                                <span>생성일: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAssignment(assignment)}
                                className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                보기
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                asChild
                                className="rounded-full border-green-200 text-green-600 hover:bg-green-50 transition-all duration-300 transform hover:scale-105 bg-transparent"
                              >
                                <Link href={`/class/${assignment.classId}`}>
                                  <ExternalLink className="h-3 w-3 mr-1" />반 페이지
                                </Link>
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteAssignment(assignment.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300 transform hover:scale-110"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          {/* 첨부파일 표시 */}
                          {assignment.files && assignment.files.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-sm font-medium mb-3 text-gray-700">첨부파일:</p>
                              <FileList files={assignment.files} canDownload={true} showUploadDate={false} />
                            </div>
                          )}

                          {/* 제출물 목록 */}
                          {submissions.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <p className="text-sm font-medium mb-3 text-gray-700">최근 제출물:</p>
                              <ScrollArea className="max-h-48">
                                <div className="space-y-2">
                                  {submissions.map((submission) => (
                                    <div
                                      key={submission.id}
                                      className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2"
                                    >
                                      <span className="font-medium text-gray-700">{submission.studentName}</span>
                                      <div className="flex items-center space-x-3">
                                        <span className="text-gray-500">
                                          {new Date(submission.submittedAt).toLocaleString()}
                                        </span>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const submissionsForAssignment = getSubmissionsForAssignment(assignment.id)
                                            setSelectedSubmissionData({
                                              assignment: assignment,
                                              submissions: submissionsForAssignment,
                                            })
                                          }}
                                          className="h-6 px-2 rounded-full text-blue-600 hover:bg-blue-100 transition-all duration-300"
                                        >
                                          보기
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                              {submissions.length > 3 && (
                                <p className="text-xs text-gray-500 text-center py-1 mt-2">
                                  총 {submissions.length}개의 제출물
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                  {myCreatedAssignments.length === 0 && (
                    <div className="text-center py-16 animate-in fade-in duration-1000">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                        <FileText className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">생성한 과제가 없습니다</h3>
                      <p className="text-gray-500 mb-6">새 과제를 만들어 학생들에게 배정해보세요</p>
                      <Button
                        type="button"
                        onClick={() => setIsCreatingAssignment(true)}
                        className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <Plus className="h-4 w-4 mr-2" />첫 번째 과제 만들기
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes">
            <ClassManagement />
          </TabsContent>

          <TabsContent value="students" className="space-y-6">
            {/* 학생 검색 및 관리 */}
            <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    학생 정보 관리
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  내 반 학생들의 정보를 검색하고 관리하세요 ({myStudents.length}명)
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* 학생 목록 */}
                  <div className="lg:col-span-2">
                    {/* 검색 및 필터 */}
                    <div className="mb-6 space-y-4">
                      <div className="flex space-x-4">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="이름, 학번, ID로 검색..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="pl-10 h-12 rounded-xl border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => setIsUserCreationModalOpen(true)}
                          className="h-12 px-6 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          사용자 추가
                        </Button>
                      </div>

                      <div className="flex space-x-4">
                        <Select value={studentGradeFilter} onValueChange={setStudentGradeFilter}>
                          <SelectTrigger className="w-32 h-10 rounded-xl border-purple-200">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 학년</SelectItem>
                            <SelectItem value="1">1학년</SelectItem>
                            <SelectItem value="2">2학년</SelectItem>
                            <SelectItem value="3">3학년</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={studentClassFilter} onValueChange={setStudentClassFilter}>
                          <SelectTrigger className="w-32 h-10 rounded-xl border-purple-200">
                            <Filter className="h-4 w-4 mr-2" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 반</SelectItem>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}반
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center space-x-2">
                          <Label htmlFor="showMyStudentsOnly">내 반 학생만</Label>
                          <Input
                            type="checkbox"
                            id="showMyStudentsOnly"
                            checked={showMyStudentsOnly}
                            onChange={(e) => setShowMyStudentsOnly(e.target.checked)}
                            className="h-5 w-5 rounded-xl border-purple-200 focus:border-purple-400 focus:ring-purple-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 학생 목록 */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredStudents.map((student, index) => {
                        const studentClasses = getStudentClasses(student.uid)
                        return (
                          <div
                            key={student.uid}
                            className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer hover:shadow-md animate-in slide-in-from-left group ${
                              selectedStudent?.uid === student.uid
                                ? "border-purple-500 bg-purple-50 shadow-md"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => setSelectedStudent(student)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar className="ring-2 ring-purple-200">
                                  <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                                    {student.name?.charAt(0) ?? "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <p className="font-medium text-gray-800">{student.name}</p>
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-full">
                                      학생
                                    </Badge>
                                    {student.uniqueId && (
                                      <Badge variant="outline" className="text-xs rounded-full">
                                        {student.uniqueId}
                                      </Badge>
                                    )}
                                    {isMyStudent(student.uid) && (
                                      <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded-full">
                                        내 반 학생
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">{student.email}</p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                    {student.userId && <span>학번: {student.userId}</span>}
                                    {student.grade && student.class && (
                                      <span>
                                        {student.grade}학년 {student.class}반
                                      </span>
                                    )}
                                    {studentClasses.length > 0 && <span>참가 반: {studentClasses.length}개</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startChatWithStudent(student)
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-blue-100"
                                  title="1:1 채팅"
                                >
                                  <MessageCircle className="h-4 w-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedStudent(student)
                                    setIsEditingStudent(true)
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-purple-100"
                                  title="정보 수정"
                                >
                                  <Edit className="h-4 w-4 text-purple-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteStudent(student)
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-red-100"
                                  title="계정 삭제"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      {filteredStudents.length === 0 && (
                        <div className="text-center py-12">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                          <p className="text-gray-500">
                            {studentSearchTerm || studentGradeFilter !== "all" || studentClassFilter !== "all"
                              ? "검색 조건에 맞는 학생이 없습니다."
                              : "아직 관리하는 학생이 없습니다."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 학생 상세 정보 */}
                  <div>
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-purple-50">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <User className="h-5 w-5 mr-2 text-purple-600" />
                          학생 상세 정보
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedStudent ? (
                          <div className="space-y-6">
                            {/* 기본 정보 */}
                            <div className="text-center">
                              <Avatar className="w-20 h-20 mx-auto mb-4 ring-4 ring-purple-200">
                                <AvatarFallback className="text-2xl bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                                  {selectedStudent.name?.charAt(0) ?? "?"}
                                </AvatarFallback>
                              </Avatar>
                              <h3 className="text-xl font-bold text-gray-800">{selectedStudent.name}</h3>
                              <div className="flex items-center justify-center space-x-2 mt-2">
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full">
                                  학생
                                </Badge>
                                {selectedStudent.uniqueId && (
                                  <Badge variant="outline" className="rounded-full">
                                    {selectedStudent.uniqueId}
                                  </Badge>
                                )}
                                {isMyStudent(selectedStudent.uid) && (
                                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs rounded-full">
                                    내 반 학생
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* 편집 폼 */}
                            {isEditingStudent ? (
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="editStudentName">이름</Label>
                                  <Input
                                    id="editStudentName"
                                    value={editStudentData.name}
                                    onChange={(e) => setEditStudentData((prev) => ({ ...prev, name: e.target.value }))}
                                    className="rounded-xl"
                                    placeholder="학생 이름을 입력하세요"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="editStudentUserId">학번</Label>
                                  <Input
                                    id="editStudentUserId"
                                    value={editStudentData.userId}
                                    onChange={(e) =>
                                      setEditStudentData((prev) => ({ ...prev, userId: e.target.value }))
                                    }
                                    className="rounded-xl font-mono"
                                    placeholder="학번을 입력하세요 (예: 20240101)"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="editStudentGrade">학년</Label>
                                    <Select
                                      value={editStudentData.grade}
                                      onValueChange={(value) =>
                                        setEditStudentData((prev) => ({ ...prev, grade: value }))
                                      }
                                    >
                                      <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="학년 선택" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">1학년</SelectItem>
                                        <SelectItem value="2">2학년</SelectItem>
                                        <SelectItem value="3">3학년</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="editStudentClass">반</Label>
                                    <Select
                                      value={editStudentData.class}
                                      onValueChange={(value) =>
                                        setEditStudentData((prev) => ({ ...prev, class: value }))
                                      }
                                    >
                                      <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="반 선택" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                          <SelectItem key={num} value={num.toString()}>
                                            {num}반
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                <div className="flex space-x-2 pt-4">
                                  <Button
                                    type="button"
                                    onClick={handleUpdateStudent}
                                    className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 font-medium"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    저장하기
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditingStudent(false)}
                                    className="rounded-xl h-12 px-6"
                                  >
                                    취소
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* 정보 표시 */}
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-gray-600 font-medium">이메일</span>
                                    <span className="font-medium text-gray-800">{selectedStudent.email}</span>
                                  </div>

                                  {selectedStudent.userId && (
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                      <span className="text-gray-600 font-medium">학번</span>
                                      <span className="font-mono font-medium text-gray-800 bg-white px-3 py-1 rounded-lg border">
                                        {selectedStudent.userId}
                                      </span>
                                    </div>
                                  )}

                                  {selectedStudent.grade && selectedStudent.class && (
                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                                      <span className="text-purple-700 font-medium">학급 정보</span>
                                      <div className="flex items-center space-x-2">
                                        <Badge className="bg-purple-500 text-white rounded-full px-3 py-1">
                                          {selectedStudent.grade}학년
                                        </Badge>
                                        <Badge className="bg-pink-500 text-white rounded-full px-3 py-1">
                                          {selectedStudent.class}반
                                        </Badge>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                    <span className="text-gray-600 font-medium">가입일</span>
                                    <span className="font-medium text-gray-800">
                                      {new Date(selectedStudent.createdAt).toLocaleDateString("ko-KR", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </span>
                                  </div>

                                  {/* 참가 반 정보 */}
                                  {(() => {
                                    const studentClasses = getStudentClasses(selectedStudent.uid)
                                    return studentClasses.length > 0 ? (
                                      <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                                        <span className="text-blue-700 font-medium block mb-2">참가 반</span>
                                        <div className="space-y-1">
                                          {studentClasses.map((classInfo) => (
                                            <div
                                              key={classInfo?.id}
                                              className="flex items-center justify-between text-sm"
                                            >
                                              <span className="text-blue-800">{classInfo?.name}</span>
                                              <Badge variant="outline" className="text-xs">
                                                {classInfo?.subject}
                                              </Badge>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null
                                  })()}
                                </div>

                                {/* 액션 버튼 */}
                                <div className="space-y-3 pt-4">
                                  <Button
                                    type="button"
                                    onClick={() => startChatWithStudent(selectedStudent)}
                                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 h-12 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                                  >
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    1:1 채팅 시작
                                  </Button>

                                  <Button
                                    type="button"
                                    onClick={() => {
                                      setEditStudentData({
                                        name: selectedStudent.name || "",
                                        userId: selectedStudent.userId || "",
                                        grade: selectedStudent.grade || "",
                                        class: selectedStudent.class || "",
                                      })
                                      setIsEditingStudent(true)
                                    }}
                                    className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 h-12 font-medium shadow-lg hover:shadow-xl transition-all duration-300"
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    학생 정보 수정
                                  </Button>

                                  <Button
                                    type="button"
                                    onClick={() => handleDeleteStudent(selectedStudent)}
                                    variant="destructive"
                                    className="w-full rounded-xl h-12 font-medium bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all duration-300"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    학생 계정 삭제
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                            <p className="text-gray-500">학생을 선택하여 상세 정보를 확인하세요</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests" className="space-y-6">
            <Card className="overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mr-3">
                        <Bell className="h-5 w-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        참가 요청 관리
                      </span>
                      {pendingRequestsCount > 0 && (
                        <Badge className="ml-3 bg-gradient-to-r from-red-500 to-pink-500 text-white animate-pulse">
                          {pendingRequestsCount}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      학생들과 다른 교사들의 반 참가 요청을 관리하세요
                    </CardDescription>
                  </div>
                  {joinRequests && joinRequests.length > 0 && (
                    <Button
                      type="button"
                      onClick={handleDeleteAllRequests}
                      variant="destructive"
                      className="rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 px-6 py-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      모든 기록 삭제
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {joinRequests
                    ?.sort((a, b) => {
                      if (a.status === "pending" && b.status !== "pending") return -1
                      if (a.status !== "pending" && b.status === "pending") return 1
                      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
                    })
                    .map((request, index) => (
                      <div
                        key={request.id}
                        className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-right"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="ring-2 ring-orange-200">
                              <AvatarFallback className="bg-gradient-to-r from-orange-400 to-red-400 text-white">
                                {request.requesterName?.charAt(0) ?? ""}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-gray-800">{request.requesterName}</p>
                                <Badge
                                  className={`text-xs rounded-full ${
                                    request.requesterRole === "teacher"
                                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                  }`}
                                >
                                  {request.requesterRole === "teacher" ? "교사" : "학생"}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{request.className} 참가 요청</p>
                              <p className="text-xs text-gray-500">
                                요청일: {new Date(request.requestedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {request.status === "pending" ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    handleApproveRequest(
                                      request.id,
                                      request.classId,
                                      request.requesterId,
                                      request.requesterName,
                                      request.requesterRole,
                                    )
                                  }
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-full px-4 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  승인
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectRequest(request.id)}
                                  className="rounded-full px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300 transform hover:scale-105"
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  거절
                                </Button>
                              </>
                            ) : (
                              <Badge
                                className={`rounded-full px-4 py-2 ${
                                  request.status === "approved"
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                    : "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                                }`}
                              >
                                {request.status === "approved" ? "승인됨" : "거절됨"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                  {!joinRequests || joinRequests.length === 0 ? (
                    <div className="text-center py-16 animate-in fade-in duration-1000">
                      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                        <Bell className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-700 mb-2">참가 요청이 없습니다</h3>
                      <p className="text-gray-500">학생들이나 다른 교사들의 참가 요청이 여기에 표시됩니다</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <Calendar showPersonalEvents={true} />
          </TabsContent>

          <TabsContent value="join">
            <ClassJoinRequest />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {/* 과제보기 창 */}
      {selectedAssignment && (
        <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
            <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                과제 상세: {selectedAssignment.title}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">과제 내용</h4>
                  <div dangerouslySetInnerHTML={{ __html: selectedAssignment.content }} />
                </div>

                {selectedAssignment.files && selectedAssignment.files.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">첨부 파일</h4>
                    <FileList files={selectedAssignment.files} canDownload={true} />
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">과제 정보</h4>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">마감일:</span>{" "}
                      {new Date(selectedAssignment.dueDate).toLocaleString()}
                    </p>
                    <p>
                      <span className="font-medium">생성일:</span>{" "}
                      {new Date(selectedAssignment.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 flex justify-en border-t px-6 py-4">
              <Button type="button" onClick={() => setSelectedAssignment(null)}>
                닫기
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 제출물 보기 창 */}
      {selectedSubmissionData && (
        <SubmissionViewer
          assignment={selectedSubmissionData.assignment}
          submissions={selectedSubmissionData.submissions}
          onClose={() => setSelectedSubmissionData(null)}
        />
      )}

      {/* 프로필 설정 모달 */}
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* 사용자 생성 모달 */}
      <UserCreationModal
        isOpen={isUserCreationModalOpen}
        onClose={() => setIsUserCreationModalOpen(false)}
        onUserCreated={handleUserCreated}
      />
    </div>
  )
}
