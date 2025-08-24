"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { collection, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  BookOpen,
  FileText,
  Users,
  Settings,
  Plus,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Copy,
  Sparkles,
  GraduationCap,
  UserPlus,
  Megaphone,
  Pin,
  User,
  Crown,
  UsersIcon,
  Calendar,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { safeGetDoc, safeAddDoc, safeDeleteDoc } from "@/lib/firebase-utils"
import { usePollingData } from "@/hooks/use-polling-data"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"
import { RichTextEditor } from "@/components/rich-text-editor"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import { AssignmentViewer } from "@/components/assignment-viewer"
import { SubmissionViewer } from "@/components/submission-viewer"
import { IndividualSubmissionViewer } from "@/components/individual-submission-viewer"
import { Calendar as CalendarComponent } from "@/components/calendar"
import { TimetableWidget } from "@/components/timetable-widget"
import type { UploadedFile } from "@/lib/storage-utils"
import Link from "next/link"

interface ClassInfo {
  id: string
  name: string
  grade: string
  classNumber: string
  teacherId: string
  teacherName: string
  classCode?: string
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

interface GroupSubmission {
  id: string
  assignmentId: string
  groupId: string
  groupName: string
  content: string
  files?: UploadedFile[]
  submittedAt: Date
  submittedBy: string
  submittedByName: string
  status: "submitted" | "graded"
  grade?: number
  feedback?: string
}

interface Group {
  id: string
  name: string
  description?: string
  classId: string
  members: string[]
  createdBy: string
  groupLeader?: string
  createdAt: Date
}

interface ClassNotice {
  id: string
  title: string
  content: string
  classId: string
  createdBy: string
  createdByName: string
  subject?: string
  createdAt: Date
  files?: UploadedFile[]
  isPinned?: boolean
}

export default function ClassPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const classId = params.classId as string

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [isMember, setIsMember] = useState(false)
  const [isTeacher, setIsTeacher] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<ClassAssignment | null>(null)
  const [selectedSubmissionData, setSelectedSubmissionData] = useState<{
    assignment: ClassAssignment
    submissions: AssignmentSubmission[]
    groupSubmissions: GroupSubmission[]
  } | null>(null)
  const [selectedIndividualSubmission, setSelectedIndividualSubmission] = useState<{
    submission: AssignmentSubmission
    assignment: ClassAssignment
  } | null>(null)
  const [submissionContent, setSubmissionContent] = useState("")
  const [submissionFiles, setSubmissionFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 새 공지사항 생성 상태
  const [isCreatingNotice, setIsCreatingNotice] = useState(false)
  const [newNotice, setNewNotice] = useState({
    title: "",
    content: "",
    subject: "",
    isPinned: false,
  })
  const [noticeFiles, setNoticeFiles] = useState<UploadedFile[]>([])

  // 새 과제 생성 상태
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    content: "",
    dueDate: "",
  })
  const [assignmentFiles, setAssignmentFiles] = useState<UploadedFile[]>([])

  // 새 모둠 생성 상태
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    initialLeader: "",
  })
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // 데이터 폴링 - 사용자가 로그인했을 때만 쿼리 생성
  const noticesRef = user && classId ? query(collection(db, "classNotices"), where("classId", "==", classId)) : null
  const { data: notices, refresh: refreshNotices, error: noticesError } = usePollingData<ClassNotice>(noticesRef)

  const assignmentsRef = user && classId ? query(collection(db, "assignments"), where("classId", "==", classId)) : null
  const {
    data: assignments,
    refresh: refreshAssignments,
    error: assignmentsError,
  } = usePollingData<ClassAssignment>(assignmentsRef)

  const membersRef = user && classId ? query(collection(db, "classMembers"), where("classId", "==", classId)) : null
  const { data: members, refresh: refreshMembers, error: membersError } = usePollingData<ClassMember>(membersRef)

  const submissionsRef = user
    ? query(collection(db, "assignmentSubmissions"), where("studentId", "==", user.uid))
    : null
  const {
    data: mySubmissions,
    refresh: refreshSubmissions,
    error: submissionsError,
  } = usePollingData<AssignmentSubmission>(submissionsRef)

  const allSubmissionsRef = user ? query(collection(db, "assignmentSubmissions")) : null
  const { data: allSubmissions, error: allSubmissionsError } = usePollingData<AssignmentSubmission>(allSubmissionsRef)

  // 모둠 제출물 쿼리 추가
  const groupSubmissionsRef = user && classId ? query(collection(db, "groupSubmissions")) : null
  const { data: allGroupSubmissions, error: groupSubmissionsError } =
    usePollingData<GroupSubmission>(groupSubmissionsRef)

  const groupsRef = user && classId ? query(collection(db, "groups"), where("classId", "==", classId)) : null
  const { data: groups, refresh: refreshGroups, error: groupsError } = usePollingData<Group>(groupsRef)

  // 반 정보 로드 및 실제 멤버 수 계산
  useEffect(() => {
    const loadClassInfo = async () => {
      if (!user || !classId) return

      try {
        const data = await safeGetDoc<ClassInfo>(`classes/${classId}`)
        if (data) {
          // 실제 멤버 수로 업데이트
          const actualMemberCount = members ? members.length : 0
          setClassInfo({
            ...data,
            memberCount: actualMemberCount,
          })
          setIsTeacher(data.teacherId === user.uid)
        } else {
          setError("반을 찾을 수 없습니다.")
        }
      } catch (error) {
        console.error("Error loading class info:", error)
        setError("반 정보를 불러오는 중 오류가 발생했습니다.")
      }
    }

    loadClassInfo()
  }, [classId, user, members])

  // 멤버십 확인
  useEffect(() => {
    if (user && members && Array.isArray(members)) {
      const membership = members.find((member) => member.memberId === user.uid)
      setIsMember(!!membership || isTeacher)
    }
  }, [user, members, isTeacher])

  // 오류 상태 통합 관리
  useEffect(() => {
    const errors = [
      noticesError,
      assignmentsError,
      membersError,
      submissionsError,
      allSubmissionsError,
      groupSubmissionsError,
      groupsError,
    ]
      .filter(Boolean)
      .filter((err) => !err.includes("권한"))

    if (errors.length > 0) {
      console.warn("Some data loading errors (non-critical):", errors)
      if (errors.some((err) => !err.includes("권한") && !err.includes("permission"))) {
        setError("일부 데이터를 불러오는 중 문제가 발생했습니다. 새로고침해 주세요.")
      }
    }
  }, [
    noticesError,
    assignmentsError,
    membersError,
    submissionsError,
    allSubmissionsError,
    groupSubmissionsError,
    groupsError,
  ])

  // 접근 권한 확인
  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">반에 접근하려면 먼저 로그인해주세요.</p>
            <Button
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 h-12 rounded-xl"
              asChild
            >
              <Link href="/login">로그인하기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">반 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!isMember && !isTeacher) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">접근 권한이 없습니다</h2>
            <p className="text-gray-600 mb-6">이 반에 참가하지 않았습니다.</p>
            <Button
              onClick={() => router.back()}
              className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-0 h-12 rounded-xl"
            >
              돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNotice.title || !newNotice.content) {
      setError("제목과 내용을 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const noticeData = {
        title: newNotice.title,
        content: newNotice.content,
        classId: classId,
        createdBy: user.uid,
        createdByName: userProfile.name,
        subject: newNotice.subject || undefined,
        isPinned: newNotice.isPinned,
        files: noticeFiles,
        createdAt: new Date(),
      }

      await safeAddDoc("classNotices", noticeData)

      setSuccess("공지사항이 성공적으로 등록되었습니다.")
      setNewNotice({ title: "", content: "", subject: "", isPinned: false })
      setNoticeFiles([])
      setIsCreatingNotice(false)
      refreshNotices()
    } catch (error) {
      console.error("Error creating notice:", error)
      setError("공지사항 등록 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteNotice = async (noticeId: string) => {
    if (!confirm("정말로 이 공지사항을 삭제하시겠습니까?")) return

    try {
      await safeDeleteDoc(`classNotices/${noticeId}`)
      setSuccess("공지사항이 삭제되었습니다.")
      refreshNotices()
    } catch (error) {
      console.error("Error deleting notice:", error)
      setError("공지사항 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAssignment.title || !newAssignment.content || !newAssignment.dueDate) {
      setError("모든 필드를 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const assignmentData = {
        title: newAssignment.title,
        content: newAssignment.content,
        dueDate: newAssignment.dueDate,
        classId: classId,
        files: assignmentFiles,
        createdBy: user.uid,
        createdAt: new Date(),
      }

      await safeAddDoc("assignments", assignmentData)

      setSuccess("과제가 성공적으로 생성되었습니다.")
      setNewAssignment({ title: "", content: "", dueDate: "" })
      setAssignmentFiles([])
      setIsCreatingAssignment(false)
      refreshAssignments()
    } catch (error) {
      console.error("Error creating assignment:", error)
      setError("과제 생성 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm("정말로 이 과제를 삭제하시겠습니까?")) return

    try {
      await safeDeleteDoc(`assignments/${assignmentId}`)
      setSuccess("과제가 삭제되었습니다.")
      refreshAssignments()
    } catch (error) {
      console.error("Error deleting assignment:", error)
      setError("과제 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (!submissionContent.trim()) {
      setError("제출 내용을 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")
    setIsSubmitting(true)

    try {
      const existingSubmission = mySubmissions?.find((sub) => sub.assignmentId === assignmentId)
      if (existingSubmission) {
        setError("이미 제출한 과제입니다.")
        setIsSubmitting(false)
        return
      }

      const submissionData = {
        assignmentId,
        studentId: user.uid,
        studentName: userProfile.name,
        content: submissionContent,
        files: submissionFiles,
        submittedAt: new Date(),
        status: "submitted" as const,
      }

      await safeAddDoc("assignmentSubmissions", submissionData)

      setSuccess("과제가 성공적으로 제출되었습니다. 제출 후에는 수정할 수 없습니다.")
      setSubmissionContent("")
      setSubmissionFiles([])
      refreshSubmissions()
    } catch (error) {
      console.error("Error submitting assignment:", error)
      setError("과제 제출 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroup.name) {
      setError("모둠 이름을 입력해주세요.")
      return
    }

    if (selectedMembers.length === 0) {
      setError("모둠에 추가할 학생을 최소 1명 이상 선택해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const groupLeader = newGroup.initialLeader || selectedMembers[0]

      const groupData = {
        name: newGroup.name,
        description: newGroup.description,
        classId: classId,
        members: selectedMembers,
        createdBy: user.uid,
        groupLeader: groupLeader,
        createdAt: new Date(),
      }

      await safeAddDoc("groups", groupData)

      setSuccess("모둠이 성공적으로 생성되었습니다.")
      setNewGroup({ name: "", description: "", initialLeader: "" })
      setSelectedMembers([])
      setIsCreatingGroup(false)
      refreshGroups()
    } catch (error) {
      console.error("Error creating group:", error)
      setError("모둠 생성 중 오류가 발생했습니다.")
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("정말로 이 모둠을 삭제하시겠습니까?")) return

    try {
      await safeDeleteDoc(`groups/${groupId}`)
      setSuccess("모둠이 삭제되었습니다.")
      refreshGroups()
    } catch (error) {
      console.error("Error deleting group:", error)
      setError("모둠 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`정말로 ${memberName}님을 반에서 제거하시겠습니까?`)) return

    try {
      const memberToRemove = members?.find((member) => member.memberId === memberId)
      if (!memberToRemove) {
        setError("멤버를 찾을 수 없습니다.")
        return
      }

      await safeDeleteDoc(`classMembers/${memberToRemove.id}`)
      setSuccess(`${memberName}님이 반에서 제거되었습니다.`)
      refreshMembers()
    } catch (error) {
      console.error("Error removing member:", error)
      setError("멤버 제거 중 오류가 발생했습니다.")
    }
  }

  const copyClassCode = () => {
    const codeToCopy = classInfo.classCode || classId
    navigator.clipboard.writeText(codeToCopy)
    setSuccess("반 코드가 클립보드에 복사되었습니다.")
    setTimeout(() => setSuccess(""), 2000)
  }

  const isAssignmentSubmitted = (assignmentId: string) => {
    return mySubmissions?.some((sub) => sub.assignmentId === assignmentId)
  }

  const getSubmissionForAssignment = (assignmentId: string) => {
    return mySubmissions?.find((sub) => sub.assignmentId === assignmentId)
  }

  const isAssignmentOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const getSubmissionsForAssignment = (assignmentId: string) => {
    if (!allSubmissions) return []
    return allSubmissions.filter((sub) => sub.assignmentId === assignmentId)
  }

  const getGroupSubmissionsForAssignment = (assignmentId: string) => {
    if (!allGroupSubmissions) return []
    return allGroupSubmissions.filter((sub) => sub.assignmentId === assignmentId)
  }

  const handleViewSubmissions = (assignment: ClassAssignment) => {
    const submissions = getSubmissionsForAssignment(assignment.id)
    const groupSubmissions = getGroupSubmissionsForAssignment(assignment.id)
    console.log(
      "Opening submission viewer for assignment:",
      assignment.title,
      "with submissions:",
      submissions,
      "group submissions:",
      groupSubmissions,
    )
    setSelectedSubmissionData({ assignment, submissions, groupSubmissions })
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

  // 학생 멤버들만 필터링 (모둠장 선택용)
  const studentMembers = members?.filter((member) => member.memberRole === "student") || []

  // 학생 멤버 선택 토글 함수
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId)
      } else {
        return [...prev, memberId]
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-4">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {classInfo.name}
                </h1>
                <div className="flex items-center space-x-4 text-gray-600">
                  <span className="flex items-center">
                    <GraduationCap className="h-4 w-4 mr-1" />
                    {classInfo.grade}학년 {classInfo.classNumber}반
                  </span>
                  <span>•</span>
                  <span>담당교사: {classInfo.teacherName}</span>
                  <span>•</span>
                  <span>반원: {members ? members.length : 0}명</span>
                  <span>•</span>
                  <span>개설일: {new Date(classInfo.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isTeacher && (
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-blue-200">
                    반 코드: {classInfo.classCode || classId}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={copyClassCode} className="hover:bg-blue-50">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                asChild
                className="bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white/80"
              >
                <Link href="/dashboard">대시보드로</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50/80 backdrop-blur-sm border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50/80 backdrop-blur-sm border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="notices" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md rounded-full p-1 shadow-lg border-0">
            <TabsTrigger
              value="notices"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Megaphone className="h-4 w-4 mr-2" />
              공지사항
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              <FileText className="h-4 w-4 mr-2" />
              과제
            </TabsTrigger>
            <TabsTrigger
              value="groups"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Users className="h-4 w-4 mr-2" />
              모둠
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Calendar className="h-4 w-4 mr-2" />
              캘린더
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Users className="h-4 w-4 mr-2" />
              멤버
            </TabsTrigger>
            {isTeacher && (
              <TabsTrigger
                value="management"
                className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Settings className="h-4 w-4 mr-2" />
                관리
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="notices" className="space-y-6">
            {/* 교사용 공지사항 생성 */}
            {isTeacher && (
              <Card className="overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center text-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mr-3">
                          <Plus className="h-5 w-5 text-white" />
                        </div>
                        새 공지사항 작성
                      </CardTitle>
                      <CardDescription className="ml-13 text-gray-600">
                        학생들에게 중요한 공지사항을 전달하세요
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsCreatingNotice(!isCreatingNotice)}
                      className={`h-12 px-6 rounded-xl transition-all duration-300 ${
                        isCreatingNotice
                          ? "bg-gray-500 hover:bg-gray-600"
                          : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      } text-white border-0`}
                    >
                      {isCreatingNotice ? "취소" : "공지 작성"}
                    </Button>
                  </div>
                </CardHeader>

                {isCreatingNotice && (
                  <CardContent className="relative">
                    <form onSubmit={handleCreateNotice} onKeyDown={handleFormKeyDown} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="noticeTitle" className="text-sm font-medium text-gray-700">
                            공지 제목
                          </Label>
                          <Input
                            id="noticeTitle"
                            value={newNotice.title}
                            onChange={(e) => setNewNotice((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="공지사항 제목을 입력하세요"
                            className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="noticeSubject" className="text-sm font-medium text-gray-700">
                            과목 (선택사항)
                          </Label>
                          <Input
                            id="noticeSubject"
                            value={newNotice.subject}
                            onChange={(e) => setNewNotice((prev) => ({ ...prev, subject: e.target.value }))}
                            placeholder="예: 국어, 수학, 영어 등"
                            className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="noticeContent" className="text-sm font-medium text-gray-700">
                          공지 내용
                        </Label>
                        <div onKeyDown={(e) => e.stopPropagation()}>
                          <RichTextEditor
                            value={newNotice.content}
                            onChange={(value) => setNewNotice((prev) => ({ ...prev, content: value }))}
                            placeholder="공지사항 내용을 입력하세요..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">첨부 파일</Label>
                        <FileUpload
                          onFilesUploaded={(files) => setNoticeFiles(files)}
                          maxFiles={5}
                          uploadPath={`notices/${classId}`}
                          acceptedTypes={["image/*", "application/pdf", ".doc,.docx,.txt"]}
                          uploadedFiles={noticeFiles}
                          onFileRemoved={(fileId) => {
                            setNoticeFiles((prev) => prev.filter((f) => f.id !== fileId))
                          }}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="isPinned"
                          checked={newNotice.isPinned}
                          onChange={(e) => setNewNotice((prev) => ({ ...prev, isPinned: e.target.checked }))}
                          className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        <Label htmlFor="isPinned" className="text-sm font-medium text-gray-700 cursor-pointer">
                          중요 공지로 상단 고정
                        </Label>
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 rounded-xl"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        공지사항 등록
                      </Button>
                    </form>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 공지사항 목록 */}
            <Card className="overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                    <Megaphone className="h-5 w-5 text-white" />
                  </div>
                  공지사항
                </CardTitle>
                <CardDescription className="ml-13 text-gray-600">
                  반의 모든 공지사항을 확인할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {notices && notices.length > 0 ? (
                    notices
                      .sort((a, b) => {
                        // 고정된 공지사항을 먼저, 그 다음 최신순
                        if (a.isPinned && !b.isPinned) return -1
                        if (!a.isPinned && b.isPinned) return 1
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                      })
                      .map((notice) => (
                        <div
                          key={notice.id}
                          className={`p-6 border rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 ${
                            notice.isPinned ? "border-orange-300 bg-orange-50/50" : "border-gray-200"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-3">
                                {notice.isPinned && <Pin className="h-4 w-4 text-orange-600 transform rotate-45" />}
                                <h4 className="font-semibold text-lg text-gray-900">{notice.title}</h4>
                                {notice.subject && (
                                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                                    {notice.subject}
                                  </Badge>
                                )}
                                {notice.isPinned && (
                                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                                    중요
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                <span className="flex items-center">
                                  <User className="h-4 w-4 mr-1" />
                                  {notice.createdByName}
                                </span>
                                <span>•</span>
                                <span>{new Date(notice.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {isTeacher && notice.createdBy === user.uid && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteNotice(notice.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="prose max-w-none mb-4">
                            <MarkdownRenderer content={notice.content} />
                          </div>

                          {notice.files && notice.files.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">첨부 파일</h4>
                              <FileList files={notice.files} onFileDelete={() => {}} canDelete={false} />
                            </div>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mx-auto mb-4 opacity-50">
                        <Megaphone className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-lg mb-2 font-medium">등록된 공지사항이 없습니다</p>
                      <p className="text-sm">
                        {isTeacher
                          ? "새 공지사항을 작성하여 학생들에게 알려보세요"
                          : "교사가 공지사항을 등록하면 여기에 표시됩니다"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            {/* 교사용 과제 생성 */}
            {isTeacher && (
              <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center text-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                          <Plus className="h-5 w-5 text-white" />
                        </div>
                        새 과제 만들기
                      </CardTitle>
                      <CardDescription className="ml-13 text-gray-600">
                        학생들에게 새로운 과제를 배정하세요
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsCreatingAssignment(!isCreatingAssignment)}
                      className={`h-12 px-6 rounded-xl transition-all duration-300 ${
                        isCreatingAssignment
                          ? "bg-gray-500 hover:bg-gray-600"
                          : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                      } text-white border-0`}
                    >
                      {isCreatingAssignment ? "취소" : "과제 만들기"}
                    </Button>
                  </div>
                </CardHeader>

                {isCreatingAssignment && (
                  <CardContent className="relative">
                    <form onSubmit={handleCreateAssignment} onKeyDown={handleFormKeyDown} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium text-gray-700">
                          과제 제목
                        </Label>
                        <Input
                          id="title"
                          value={newAssignment.title}
                          onChange={(e) => setNewAssignment((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="과제 제목을 입력하세요"
                          className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
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
                          className="h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white text-gray-900 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                          style={{
                            colorScheme: "light",
                          }}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="content" className="text-sm font-medium text-gray-700">
                          과제 내용
                        </Label>
                        <div onKeyDown={(e) => e.stopPropagation()}>
                          <RichTextEditor
                            value={newAssignment.content}
                            onChange={(value) => setNewAssignment((prev) => ({ ...prev, content: value }))}
                            placeholder="과제 내용을 입력하세요..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">첨부 파일</Label>
                        <FileUpload
                          onFilesUploaded={(files) => setAssignmentFiles(files)}
                          maxFiles={5}
                          uploadPath={`assignments/${classId}`}
                          acceptedTypes={["image/*", "application/pdf", ".doc,.docx,.txt"]}
                          uploadedFiles={assignmentFiles}
                          onFileRemoved={(fileId) => {
                            setAssignmentFiles((prev) => prev.filter((f) => f.id !== fileId))
                          }}
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 rounded-xl"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        과제 생성
                      </Button>
                    </form>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 과제 목록 */}
            <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  과제 목록
                </CardTitle>
                <CardDescription className="ml-13 text-gray-600">
                  {userProfile.role === "student" ? "과제를 확인하고 제출하세요" : "생성한 과제들을 관리하세요"}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {assignments && assignments.length > 0 ? (
                    assignments
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((assignment) => {
                        const isSubmitted = isAssignmentSubmitted(assignment.id)
                        const submission = getSubmissionForAssignment(assignment.id)
                        const isOverdue = isAssignmentOverdue(assignment.dueDate)
                        const timeRemaining = getTimeRemaining(assignment.dueDate)
                        const assignmentSubmissions = getSubmissionsForAssignment(assignment.id)
                        const assignmentGroupSubmissions = getGroupSubmissionsForAssignment(assignment.id)

                        return (
                          <div
                            key={assignment.id}
                            className="p-6 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <h4 className="font-semibold text-lg text-gray-900">{assignment.title}</h4>
                                  {isSubmitted && (
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      제출완료
                                    </Badge>
                                  )}
                                  {submission?.status === "graded" && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                      채점완료: {submission.grade}점
                                    </Badge>
                                  )}
                                  <div
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${timeRemaining.bgColor} ${timeRemaining.color} border`}
                                  >
                                    <Clock className="h-3 w-3 mr-1 inline" />
                                    {timeRemaining.text}
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">
                                  마감: {new Date(assignment.dueDate).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  생성일: {new Date(assignment.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isTeacher && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewSubmissions(assignment)
                                    }}
                                    className="bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white/80"
                                  >
                                    <div className="flex items-center space-x-1">
                                      <FileText className="h-3 w-3" />
                                      <span>{assignmentSubmissions.length}</span>
                                      <span className="text-gray-400">|</span>
                                      <UsersIcon className="h-3 w-3" />
                                      <span>{assignmentGroupSubmissions.length}</span>
                                    </div>
                                  </Button>
                                )}
                                {!isTeacher && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      console.log("Opening assignment viewer for:", assignment.title)
                                      setSelectedAssignment(assignment)
                                    }}
                                    className="bg-white/50 backdrop-blur-sm border-blue-200 text-blue-600 hover:bg-blue-50"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    보기/제출
                                  </Button>
                                )}
                                {isTeacher && assignment.createdBy === user.uid && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteAssignment(assignment.id)
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mx-auto mb-4 opacity-50">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-lg mb-2 font-medium">등록된 과제가 없습니다</p>
                      <p className="text-sm">
                        {isTeacher
                          ? "새 과제를 만들어 학생들에게 배정해보세요"
                          : "교사가 과제를 등록하면 여기에 표시됩니다"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6">
            {/* 교사용 모둠 생성 */}
            {isTeacher && (
              <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader className="relative">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center text-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                          <Plus className="h-5 w-5 text-white" />
                        </div>
                        새 모둠 만들기
                      </CardTitle>
                      <CardDescription className="ml-13 text-gray-600">
                        학습 모둠이나 프로젝트 팀을 만들어보세요
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setIsCreatingGroup(!isCreatingGroup)
                        if (!isCreatingGroup) {
                          setSelectedMembers([])
                          setNewGroup({ name: "", description: "", initialLeader: "" })
                        }
                      }}
                      className={`h-12 px-6 rounded-xl transition-all duration-300 ${
                        isCreatingGroup
                          ? "bg-gray-500 hover:bg-gray-600"
                          : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      } text-white border-0`}
                    >
                      {isCreatingGroup ? "취소" : "모둠 만들기"}
                    </Button>
                  </div>
                </CardHeader>

                {isCreatingGroup && (
                  <CardContent className="relative">
                    <form onSubmit={handleCreateGroup} onKeyDown={handleFormKeyDown} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="groupName" className="text-sm font-medium text-gray-700">
                          모둠 이름
                        </Label>
                        <Input
                          id="groupName"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup((prev) => ({ ...prev, name: e.target.value }))}
                          placeholder="모둠 이름을 입력하세요"
                          className="h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="groupDescription" className="text-sm font-medium text-gray-700">
                          모둠 설명 (선택사항)
                        </Label>
                        <Textarea
                          id="groupDescription"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="모둠에 대한 설명을 입력하세요"
                          className="rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">모둠원 선택</Label>
                        <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                          {studentMembers.length > 0 ? (
                            <div className="space-y-2">
                              {studentMembers.map((member) => (
                                <div
                                  key={member.id}
                                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                                    selectedMembers.includes(member.memberId)
                                      ? "bg-purple-100 border-purple-300 border"
                                      : "bg-white border-gray-200 border hover:bg-gray-50"
                                  }`}
                                  onClick={() => toggleMemberSelection(member.memberId)}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm">
                                        {member.memberName.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-gray-900">{member.memberName}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {selectedMembers.includes(member.memberId) && (
                                      <CheckCircle className="h-5 w-5 text-purple-600" />
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">등록된 학생이 없습니다</p>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          선택된 학생: {selectedMembers.length}명
                          {selectedMembers.length > 0 && (
                            <span className="ml-2 text-purple-600">
                              (
                              {studentMembers
                                .filter((m) => selectedMembers.includes(m.memberId))
                                .map((m) => m.memberName)
                                .join(", ")}
                              )
                            </span>
                          )}
                        </p>
                      </div>

                      {selectedMembers.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">모둠장 선택 (선택사항)</Label>
                          <select
                            value={newGroup.initialLeader}
                            onChange={(e) => setNewGroup((prev) => ({ ...prev, initialLeader: e.target.value }))}
                            className="w-full h-12 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500 bg-white"
                          >
                            <option value="">모둠장을 선택하세요 (미선택시 첫 번째 학생이 모둠장)</option>
                            {studentMembers
                              .filter((member) => selectedMembers.includes(member.memberId))
                              .map((member) => (
                                <option key={member.id} value={member.memberId}>
                                  {member.memberName}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      <Button
                        type="submit"
                        disabled={selectedMembers.length === 0}
                        className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        모둠 생성
                      </Button>
                    </form>
                  </CardContent>
                )}
              </Card>
            )}

            {/* 모둠 목록 */}
            <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  모둠 목록
                </CardTitle>
                <CardDescription className="ml-13 text-gray-600">반의 모든 모둠을 확인할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {groups && groups.length > 0 ? (
                    groups
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((group) => {
                        const groupMembers = members?.filter((member) => group.members.includes(member.memberId)) || []
                        const groupLeader = members?.find((member) => member.memberId === group.groupLeader)

                        return (
                          <div
                            key={group.id}
                            className="p-6 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300"
                          >
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center space-x-3 mb-3">
                                  <h4 className="font-semibold text-lg text-gray-900">{group.name}</h4>
                                  <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-purple-200">
                                    {groupMembers.length}명
                                  </Badge>
                                </div>
                                {group.description && <p className="text-gray-600 mb-3">{group.description}</p>}
                                <div className="flex items-center space-x-4 text-sm text-gray-500">
                                  <span>생성일: {new Date(group.createdAt).toLocaleDateString()}</span>
                                  {groupLeader && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center">
                                        <Crown className="h-3 w-3 mr-1 text-yellow-600" />
                                        모둠장: {groupLeader.memberName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {isTeacher && group.createdBy === user.uid && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteGroup(group.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h5 className="font-medium text-gray-700">모둠원</h5>
                              <div className="flex flex-wrap gap-2">
                                {groupMembers.map((member) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center space-x-2 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2"
                                  >
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs">
                                        {member.memberName.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium text-gray-900">{member.memberName}</span>
                                    {member.memberId === group.groupLeader && (
                                      <Crown className="h-3 w-3 text-yellow-600" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mx-auto mb-4 opacity-50">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-lg mb-2 font-medium">생성된 모둠이 없습니다</p>
                      <p className="text-sm">
                        {isTeacher
                          ? "새 모둠을 만들어 학생들을 그룹으로 나누어보세요"
                          : "교사가 모둠을 생성하면 여기에 표시됩니다"}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <CalendarComponent classId={classId} showPersonalEvents={false} />
              </div>
              <div className="space-y-6">
                <TimetableWidget classId={classId} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="members" className="space-y-6">
            <Card className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  반 멤버
                </CardTitle>
                <CardDescription className="ml-13 text-gray-600">
                  반에 참가한 모든 멤버를 확인할 수 있습니다 (총 {members ? members.length : 0}명)
                </CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {members && members.length > 0 ? (
                    <>
                      {/* 교사 섹션 */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                          <GraduationCap className="h-4 w-4 mr-2" />
                          교사
                        </h4>
                        <div className="space-y-2">
                          {members
                            .filter((member) => member.memberRole === "teacher")
                            .map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl"
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                                      {member.memberName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-gray-900">{member.memberName}</p>
                                    <p className="text-sm text-gray-600">
                                      참가일: {new Date(member.joinedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
                                  교사
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* 학생 섹션 */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                          <UserPlus className="h-4 w-4 mr-2" />
                          학생 ({members.filter((member) => member.memberRole === "student").length}명)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {members
                            .filter((member) => member.memberRole === "student")
                            .sort((a, b) => a.memberName.localeCompare(b.memberName))
                            .map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white/90 transition-all duration-200"
                              >
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm">
                                      {member.memberName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-gray-900">{member.memberName}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(member.joinedAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="bg-white/50 backdrop-blur-sm border-green-200">
                                    학생
                                  </Badge>
                                  {isTeacher && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemoveMember(member.memberId, member.memberName)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mx-auto mb-4 opacity-50">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-lg mb-2 font-medium">등록된 멤버가 없습니다</p>
                      <p className="text-sm">반 코드를 공유하여 학생들을 초대해보세요</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {isTeacher && (
            <TabsContent value="management" className="space-y-6">
              <Card className="overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader className="relative">
                  <CardTitle className="flex items-center text-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gray-500 to-slate-500 flex items-center justify-center mr-3">
                      <Settings className="h-5 w-5 text-white" />
                    </div>
                    반 관리
                  </CardTitle>
                  <CardDescription className="ml-13 text-gray-600">반 설정과 고급 기능을 관리하세요</CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-6">
                    <div className="p-6 bg-blue-50/50 backdrop-blur-sm border border-blue-200 rounded-xl">
                      <h4 className="font-semibold text-blue-900 mb-2">반 정보</h4>
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-medium">반 이름:</span> {classInfo.name}
                        </p>
                        <p>
                          <span className="font-medium">학년:</span> {classInfo.grade}학년
                        </p>
                        <p>
                          <span className="font-medium">반:</span> {classInfo.classNumber}반
                        </p>
                        <p>
                          <span className="font-medium">반 코드:</span> {classInfo.classCode || classId}
                        </p>
                        <p>
                          <span className="font-medium">멤버 수:</span> {members?.length || 0}명
                        </p>
                        <p>
                          <span className="font-medium">생성일:</span>{" "}
                          {new Date(classInfo.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 bg-yellow-50/50 backdrop-blur-sm border border-yellow-200 rounded-xl">
                      <h4 className="font-semibold text-yellow-900 mb-2">통계</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{notices?.length || 0}</p>
                          <p className="text-gray-600">공지사항</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{assignments?.length || 0}</p>
                          <p className="text-gray-600">과제</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{groups?.length || 0}</p>
                          <p className="text-gray-600">모둠</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {allSubmissions?.filter((sub) =>
                              assignments?.some((assignment) => assignment.id === sub.assignmentId),
                            ).length || 0}
                          </p>
                          <p className="text-gray-600">제출물</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* 과제 상세 보기 모달 */}
      {selectedAssignment && (
        <AssignmentViewer
          assignment={selectedAssignment}
          onClose={() => {
            console.log("Closing assignment viewer")
            setSelectedAssignment(null)
          }}
          onSubmit={handleSubmitAssignment}
          submissionContent={submissionContent}
          setSubmissionContent={setSubmissionContent}
          submissionFiles={submissionFiles}
          setSubmissionFiles={setSubmissionFiles}
          isSubmitting={isSubmitting}
          isSubmitted={isAssignmentSubmitted(selectedAssignment.id)}
          submission={getSubmissionForAssignment(selectedAssignment.id)}
          isOverdue={isAssignmentOverdue(selectedAssignment.dueDate)}
          userRole={userProfile.role}
          classId={classId}
          groups={groups || []}
          members={members || []}
          userId={user.uid}
          userName={userProfile.name}
        />
      )}

      {/* 제출물 보기 모달 */}
      {selectedSubmissionData && (
        <SubmissionViewer
          assignment={selectedSubmissionData.assignment}
          submissions={selectedSubmissionData.submissions}
          groupSubmissions={selectedSubmissionData.groupSubmissions}
          onClose={() => setSelectedSubmissionData(null)}
          onViewIndividual={(submission) => {
            setSelectedIndividualSubmission({ submission, assignment: selectedSubmissionData.assignment })
            setSelectedSubmissionData(null)
          }}
        />
      )}

      {/* 개별 제출물 상세 보기 모달 */}
      {selectedIndividualSubmission && (
        <IndividualSubmissionViewer
          submission={selectedIndividualSubmission.submission}
          assignment={selectedIndividualSubmission.assignment}
          onClose={() => setSelectedIndividualSubmission(null)}
          onBack={() => {
            const assignment = selectedIndividualSubmission.assignment
            const submissions = getSubmissionsForAssignment(assignment.id)
            const groupSubmissions = getGroupSubmissionsForAssignment(assignment.id)
            setSelectedSubmissionData({ assignment, submissions, groupSubmissions })
            setSelectedIndividualSubmission(null)
          }}
        />
      )}
    </div>
  )
}
