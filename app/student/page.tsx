"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { collection, query, where, orderBy, limit } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BookOpen,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  ExternalLink,
  GraduationCap,
  LogOut,
  Settings,
  CalendarIcon,
  Bell,
  Trash2,
  Users,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { safeAddDoc, safeUpdateDoc, safeDeleteDoc } from "@/lib/firebase-utils"
import { usePollingData } from "@/hooks/use-polling-data"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"
import { ClassJoinRequest } from "@/components/class-join-request"
import { Calendar } from "@/components/calendar"
import { QuizViewer } from "@/components/quiz-viewer"
import type { UploadedFile } from "@/lib/storage-utils"
import Link from "next/link"
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
  hasQuiz?: boolean
  quiz?: any
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

interface QuizSubmission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  answers: Record<string, any>
  score: number
  totalPoints: number
  submittedAt: Date
  timeSpent: number
}

interface Notification {
  id: string
  type: "assignment_created" | "assignment_graded" | "due_date_reminder" | "new_notice"
  assignmentId?: string
  assignmentTitle?: string
  noticeId?: string
  noticeTitle?: string
  classId: string
  className: string
  studentId: string
  teacherId?: string
  teacherName?: string
  grade?: number
  feedback?: string
  createdAt: Date
  read: boolean
}

export default function StudentDashboard() {
  const { user, userProfile, logout } = useAuth()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<ClassAssignment | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null)
  const [isSubmittingAssignment, setIsSubmittingAssignment] = useState(false)
  const [submissionContent, setSubmissionContent] = useState("")
  const [submissionFiles, setSubmissionFiles] = useState<UploadedFile[]>([])
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 내가 참가한 반 목록
  const myMembershipsRef = user ? query(collection(db, "classMembers"), where("memberId", "==", user.uid)) : null
  const { data: myMemberships } = usePollingData<ClassMember>(myMembershipsRef, (data) => ({
    ...data,
    joinedAt: data.joinedAt?.toDate ? data.joinedAt.toDate() : new Date(data.joinedAt),
  }))

  // 모든 반 멤버 데이터 가져오기 (반원 수 계산용)
  const allMembersRef = collection(db, "classMembers")
  const { data: allMembers } = usePollingData<ClassMember>(allMembersRef, (data) => ({
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
  const myClasses = allClasses?.filter((classInfo) => membershipClassIds.includes(classInfo.id)) || []

  // 내 반들의 과제들
  const allAssignmentsRef = collection(db, "assignments")
  const { data: allAssignments, refresh: refreshAssignments } = usePollingData<ClassAssignment>(
    allAssignmentsRef,
    (data) => ({
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    }),
  )
  const myAssignments = allAssignments?.filter((assignment) => membershipClassIds.includes(assignment.classId)) || []

  // 내 제출물들
  const mySubmissionsRef = user
    ? query(collection(db, "assignmentSubmissions"), where("studentId", "==", user.uid))
    : null
  const { data: mySubmissions, refresh: refreshSubmissions } = usePollingData<AssignmentSubmission>(
    mySubmissionsRef,
    (data) => ({
      ...data,
      submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
    }),
  )

  // 내 퀴즈 제출물들
  const myQuizSubmissionsRef = user
    ? query(collection(db, "quizSubmissions"), where("studentId", "==", user.uid))
    : null
  const { data: myQuizSubmissions, refresh: refreshQuizSubmissions } = usePollingData<QuizSubmission>(
    myQuizSubmissionsRef,
    (data) => ({
      ...data,
      submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
    }),
  )

  // 알림 데이터 가져오기
  const notificationsRef = user
    ? query(
        collection(db, "notifications"),
        where("studentId", "==", user.uid),
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
    { useCache: false },
  )

  const unreadNotificationsCount = notifications?.filter((n) => !n.read).length || 0

  // 통계 계산
  const totalClasses = myClasses.length
  const totalAssignments = myAssignments.length
  const submittedAssignments = mySubmissions?.length || 0
  const pendingAssignments = Math.max(0, totalAssignments - submittedAssignments)

  // 과제 제출
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedAssignment || !submissionContent.trim()) {
      setError("제출 내용을 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const submissionData = {
        assignmentId: selectedAssignment.id,
        studentId: user.uid,
        studentName: userProfile!.name,
        content: submissionContent,
        files: submissionFiles,
        submittedAt: new Date(),
        status: "submitted" as const,
      }

      await safeAddDoc("assignmentSubmissions", submissionData)

      setSuccess("과제가 성공적으로 제출되었습니다.")
      setSubmissionContent("")
      setSubmissionFiles([])
      setIsSubmittingAssignment(false)
      setSelectedAssignment(null)
      refreshSubmissions()
    } catch (error: any) {
      console.error("Error submitting assignment:", error)
      setError("과제 제출 중 오류가 발생했습니다: " + error.message)
    }
  }

  // 제출물 확인
  const getSubmissionForAssignment = (assignmentId: string) => {
    return mySubmissions?.find((sub) => sub.assignmentId === assignmentId)
  }

  // 퀴즈 제출물 확인
  const getQuizSubmissionForAssignment = (assignmentId: string) => {
    return myQuizSubmissions?.find((sub) => sub.assignmentId === assignmentId)
  }

  // 반 정보 가져오기
  const getClassForAssignment = (classId: string) => {
    return myClasses.find((cls) => cls.id === classId)
  }

  // 반원 수 계산 함수
  const getMemberCount = (classId: string) => {
    return allMembers?.filter((member) => member.classId === classId).length || 0
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

  // 알림 새로고침을 위한 주기적 업데이트
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      refreshNotifications()
    }, 10000) // 10초마다 알림 새로고침

    return () => clearInterval(interval)
  }, [user, refreshNotifications])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-blue-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center animate-in slide-in-from-left duration-700">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center mr-4 shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  학생 대시보드
                </h1>
                <p className="text-gray-600">안녕하세요, {userProfile?.name}님!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 animate-in slide-in-from-right duration-700">
              <div className="flex items-center space-x-3">
                <Avatar className="ring-4 ring-green-200">
                  {userProfile?.profileImageUrl && (
                    <img
                      src={userProfile.profileImageUrl || "/placeholder.svg"}
                      alt={userProfile.name || "프로필"}
                      className="object-cover w-full h-full rounded-full"
                    />
                  )}
                  <AvatarFallback className="bg-gradient-to-r from-green-400 to-blue-400 text-white">
                    {userProfile?.name?.charAt(0) ?? ""}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{userProfile?.name}</p>
                  <div className="flex items-center space-x-1">
                    <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white text-xs rounded-full">
                      학생
                    </Badge>
                    {userProfile?.uniqueId && (
                      <Badge variant="outline" className="text-xs rounded-full">
                        {userProfile.uniqueId}
                      </Badge>
                    )}
                    {userProfile?.grade && userProfile?.class && (
                      <Badge variant="outline" className="text-xs rounded-full">
                        {userProfile.grade}학년 {userProfile.class}반
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
                          onClick={() => markNotificationAsRead(notification.id)}
                          className={`flex items-center justify-between p-3 ${!notification.read ? "bg-blue-50" : ""}`}
                        >
                          <div className="flex flex-col text-sm">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium">{notification.assignmentTitle || notification.noticeTitle}</p>
                              {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                            </div>
                            <p className="text-xs text-gray-500">
                              {notification.type === "assignment_created"
                                ? "새 과제가 배정되었습니다"
                                : notification.type === "assignment_graded"
                                  ? `채점 완료 (${notification.grade}점)`
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
                className="rounded-full hover:bg-green-50 transition-all duration-300 transform hover:scale-105"
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
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-in fade-in duration-700">
          <Card className="group overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-green-100 text-sm font-medium">참가 반</p>
                  <p className="text-3xl font-bold">{totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-blue-100 text-sm font-medium">전체 과제</p>
                  <p className="text-3xl font-bold">{totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-purple-100 text-sm font-medium">제출 완료</p>
                  <p className="text-3xl font-bold">{submittedAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-orange-100 text-sm font-medium">미제출</p>
                  <p className="text-3xl font-bold">{pendingAssignments}</p>
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
              과제
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
            >
              내 반
            </TabsTrigger>
            <TabsTrigger
              value="submissions"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              제출물
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
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              반 참가
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments" className="space-y-6">
            <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    내 과제 목록
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">배정받은 과제들을 확인하고 제출하세요</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {myAssignments
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .map((assignment, index) => {
                      const submission = getSubmissionForAssignment(assignment.id)
                      const quizSubmission = getQuizSubmissionForAssignment(assignment.id)
                      const classInfo = getClassForAssignment(assignment.classId)
                      const timeRemaining = getTimeRemaining(assignment.dueDate)
                      const isSubmitted = submission || quizSubmission

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
                                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-3 py-1">
                                  {assignment.subject || "일반"}
                                </Badge>
                                <Badge variant="outline" className="rounded-full px-3 py-1">
                                  {classInfo?.name}
                                </Badge>
                                {assignment.hasQuiz && (
                                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1">
                                    퀴즈 포함
                                  </Badge>
                                )}
                                <div
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${timeRemaining.bgColor} ${timeRemaining.color} flex items-center`}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {timeRemaining.text}
                                </div>
                                {isSubmitted && (
                                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-3 py-1">
                                    제출 완료
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-3">
                                마감: {new Date(assignment.dueDate).toLocaleString()}
                              </p>
                              <div className="flex items-center space-x-6 text-sm text-gray-500">
                                <span>생성일: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                                {submission && (
                                  <span className="flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-1 text-green-500" />
                                    제출일: {new Date(submission.submittedAt).toLocaleDateString()}
                                  </span>
                                )}
                                {quizSubmission && (
                                  <span className="flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-1 text-purple-500" />
                                    퀴즈 점수: {quizSubmission.score}/{quizSubmission.totalPoints}점
                                  </span>
                                )}
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
                                  <ExternalLink className="h-3 w-3 mr-1" />반 페이지에서 제출
                                </Link>
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

                          {/* 제출물 정보 */}
                          {submission && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-700">내 제출물:</p>
                                {submission.status === "graded" && submission.grade !== undefined && (
                                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full">
                                    {submission.grade}점
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-3">
                                제출일: {new Date(submission.submittedAt).toLocaleString()}
                              </p>
                              <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-sm text-gray-700 mb-2">{submission.content}</p>
                                {submission.files && submission.files.length > 0 && (
                                  <FileList files={submission.files} canDownload={true} showUploadDate={false} />
                                )}
                              </div>
                              {submission.feedback && (
                                <div className="mt-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <p className="text-sm font-medium text-blue-700 mb-1">교사 피드백:</p>
                                  <p className="text-sm text-blue-600">{submission.feedback}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes" className="space-y-6">
            <Card className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                    <BookOpen className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    내가 참가한 반
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  참가한 반 목록을 확인하고 반 페이지로 이동하세요
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {myClasses.length > 0 ? (
                    myClasses.map((classInfo, index) => {
                      const classAssignments = myAssignments.filter((assignment) => assignment.classId === classInfo.id)
                      const classSubmissions =
                        mySubmissions?.filter((submission) =>
                          classAssignments.some((assignment) => assignment.id === submission.assignmentId),
                        ) || []
                      const pendingCount = classAssignments.length - classSubmissions.length

                      return (
                        <div
                          key={classInfo.id}
                          className="p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom group cursor-pointer"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <Link href={`/class/${classInfo.id}`} className="block">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                  <BookOpen className="h-8 w-8 text-white" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h4 className="text-xl font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                                      {classInfo.name}
                                    </h4>
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-3 py-1">
                                      {classInfo.grade}학년 {classInfo.classNumber}반
                                    </Badge>
                                    {classInfo.subject && (
                                      <Badge variant="outline" className="rounded-full px-3 py-1">
                                        {classInfo.subject}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                                    <span className="flex items-center">
                                      <Users className="h-4 w-4 mr-1" />
                                      담당교사: {classInfo.teacherName}
                                    </span>
                                    <span>
                                      참가일:{" "}
                                      {myMemberships
                                        ?.find((m) => m.classId === classInfo.id)
                                        ?.joinedAt.toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm">
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                      <span className="text-gray-600">전체 과제: {classAssignments.length}개</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                      <span className="text-gray-600">제출 완료: {classSubmissions.length}개</span>
                                    </div>
                                    {pendingCount > 0 && (
                                      <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                                        <span className="text-orange-600 font-medium">미제출: {pendingCount}개</span>
                                      </div>
                                    )}
                                  </div>
                                  {classInfo.description && (
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{classInfo.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-right">
                                  <p className="text-sm text-gray-500">반원 수</p>
                                  <p className="text-2xl font-bold text-gray-800">{getMemberCount(classInfo.id)}</p>
                                </div>
                                <ChevronRight className="h-6 w-6 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all duration-300" />
                              </div>
                            </div>
                          </Link>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">참가한 반이 없습니다</h3>
                      <p className="text-gray-600 mb-6">반 참가 탭에서 새로운 반에 참가해보세요!</p>
                      <Button
                        onClick={() => {
                          const tabsList = document.querySelector('[role="tablist"]')
                          const joinTab = tabsList?.querySelector('[value="join"]') as HTMLElement
                          joinTab?.click()
                        }}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full px-6 py-2"
                      >
                        반 참가하기
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                    <CheckCircle className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    내 제출물
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">제출한 과제들과 채점 결과를 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {mySubmissions && mySubmissions.length > 0 ? (
                    mySubmissions
                      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
                      .map((submission, index) => {
                        const assignment = myAssignments.find((a) => a.id === submission.assignmentId)
                        const classInfo = assignment ? getClassForAssignment(assignment.classId) : null

                        return (
                          <div
                            key={submission.id}
                            className="p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom"
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <h4 className="text-lg font-semibold text-gray-800">
                                    {assignment?.title || "삭제된 과제"}
                                  </h4>
                                  {classInfo && (
                                    <Badge variant="outline" className="rounded-full px-3 py-1">
                                      {classInfo.name}
                                    </Badge>
                                  )}
                                  {assignment?.subject && (
                                    <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-3 py-1">
                                      {assignment.subject}
                                    </Badge>
                                  )}
                                  <Badge
                                    className={`rounded-full px-3 py-1 ${
                                      submission.status === "graded"
                                        ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                        : "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                                    }`}
                                  >
                                    {submission.status === "graded" ? "채점 완료" : "채점 대기"}
                                  </Badge>
                                  {submission.status === "graded" && submission.grade !== undefined && (
                                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1">
                                      {submission.grade}점
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-3">
                                  제출일: {new Date(submission.submittedAt).toLocaleString()}
                                </p>
                                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                  <p className="text-sm text-gray-700 mb-2">{submission.content}</p>
                                  {submission.files && submission.files.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-sm font-medium text-gray-700 mb-2">첨부파일:</p>
                                      <FileList files={submission.files} canDownload={true} showUploadDate={false} />
                                    </div>
                                  )}
                                </div>
                                {submission.feedback && (
                                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                    <p className="text-sm font-medium text-blue-700 mb-2">교사 피드백:</p>
                                    <p className="text-sm text-blue-600">{submission.feedback}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <CheckCircle className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">제출한 과제가 없습니다</h3>
                      <p className="text-gray-600">과제 탭에서 과제를 제출해보세요!</p>
                    </div>
                  )}
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
      {/* 과제 보기/제출 모달 */}
      {selectedAssignment && (
        <Dialog
          open={!!selectedAssignment}
          onOpenChange={() => {
            setSelectedAssignment(null)
            setIsSubmittingAssignment(false)
            setSubmissionContent("")
            setSubmissionFiles([])
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col">
            <DialogHeader className="flex-shrink-0 border-b px-6 py-4">
              <DialogTitle className="text-xl font-bold text-gray-900">
                {isSubmittingAssignment ? "과제 제출" : "과제 상세"}: {selectedAssignment.title}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="flex-1 px-6 py-4">
              {isSubmittingAssignment ? (
                // 과제 제출 폼
                <form onSubmit={handleSubmitAssignment} className="space-y-6">
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

                  {selectedAssignment.hasQuiz ? (
                    // 퀴즈가 있는 경우
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-medium mb-2 text-purple-700">이 과제에는 퀴즈가 포함되어 있습니다</h4>
                      <p className="text-sm text-purple-600 mb-4">퀴즈를 먼저 완료한 후 과제를 제출해주세요.</p>
                      <QuizViewer
                        assignment={selectedAssignment}
                        onQuizComplete={() => {
                          refreshQuizSubmissions()
                          setSuccess("퀴즈가 성공적으로 제출되었습니다!")
                        }}
                      />
                    </div>
                  ) : (
                    // 일반 과제 제출
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="submissionContent" className="text-sm font-medium text-gray-700">
                          제출 내용
                        </Label>
                        <Textarea
                          id="submissionContent"
                          value={submissionContent}
                          onChange={(e) => setSubmissionContent(e.target.value)}
                          placeholder="과제 내용을 입력하세요..."
                          rows={8}
                          className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">첨부 파일</Label>
                        <FileUpload
                          onFilesUploaded={(files) => setSubmissionFiles(files)}
                          maxFiles={5}
                          uploadPath={user?.uid ? `files/submissions/${user.uid}` : ""}
                          acceptedTypes={["image/*", "application/pdf", ".doc,.docx,.txt"]}
                          uploadedFiles={submissionFiles}
                          onFileRemoved={(fileId) => {
                            setSubmissionFiles((prev) => prev.filter((f) => f.id !== fileId))
                          }}
                        />
                      </div>
                    </>
                  )}
                </form>
              ) : (
                // 과제 상세 보기
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
                      {selectedAssignment.hasQuiz && (
                        <p>
                          <span className="font-medium">퀴즈:</span> 포함됨
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="flex-shrink-0 flex justify-end space-x-2 border-t px-6 py-4">
              {isSubmittingAssignment ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsSubmittingAssignment(false)
                      setSubmissionContent("")
                      setSubmissionFiles([])
                    }}
                  >
                    취소
                  </Button>
                  {!selectedAssignment.hasQuiz && (
                    <Button type="submit" onClick={handleSubmitAssignment}>
                      제출하기
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedAssignment(null)
                    }}
                  >
                    닫기
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 프로필 설정 모달 */}
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  )
}
