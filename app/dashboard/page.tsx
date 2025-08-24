"use client"
import { useState, useEffect } from "react"
import { collection, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  BookOpen,
  FileText,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  LogOut,
  Settings,
  CalendarIcon,
  School,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { usePollingData } from "@/hooks/use-polling-data"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"
import { Calendar } from "@/components/calendar"
import { TimetableWidget } from "@/components/timetable-widget"
import { getRoleRedirectPath } from "@/lib/auth-utils"
import Link from "next/link"
import { useRouter } from "next/navigation"

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
  createdBy: string
  createdAt: Date
}

interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  content: string
  submittedAt: Date
  status: "submitted" | "graded"
  grade?: number
  feedback?: string
}

export default function Dashboard() {
  const { user, userProfile, logout } = useAuth()
  const router = useRouter()
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 역할별 리다이렉트
  useEffect(() => {
    if (user && userProfile) {
      const redirectPath = getRoleRedirectPath(userProfile.role)
      if (redirectPath !== "/dashboard") {
        router.push(redirectPath)
      }
    }
  }, [user, userProfile, router])

  // 내가 참가한 반 목록
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
  const myClasses = allClasses?.filter((classInfo) => membershipClassIds.includes(classInfo.id)) || []

  // 내 반들의 과제들
  const allAssignmentsRef = collection(db, "assignments")
  const { data: allAssignments } = usePollingData<ClassAssignment>(allAssignmentsRef, (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
  }))
  const myAssignments = allAssignments?.filter((assignment) => membershipClassIds.includes(assignment.classId)) || []

  // 내 제출물들
  const mySubmissionsRef = user
    ? query(collection(db, "assignmentSubmissions"), where("studentId", "==", user.uid))
    : null
  const { data: mySubmissions } = usePollingData<AssignmentSubmission>(mySubmissionsRef, (data) => ({
    ...data,
    submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
  }))

  // 통계 계산
  const totalClasses = myClasses.length
  const totalAssignments = myAssignments.length
  const submittedAssignments = mySubmissions?.length || 0
  const pendingAssignments = totalAssignments - submittedAssignments

  // 마감 임박 과제 (3일 이내)
  const upcomingAssignments = myAssignments.filter((assignment) => {
    const dueDate = new Date(assignment.dueDate)
    const now = new Date()
    const timeDiff = dueDate.getTime() - now.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
    return daysDiff <= 3 && daysDiff > 0 && !mySubmissions?.some((sub) => sub.assignmentId === assignment.id)
  })

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">대시보드에 접근하려면 먼저 로그인해주세요.</p>
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
                  대시보드
                </h1>
                <p className="text-gray-600">안녕하세요, {userProfile?.name}님!</p>
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
                      {userProfile?.role === "admin" ? "관리자" : userProfile?.role === "teacher" ? "교사" : "학생"}
                    </Badge>
                    {userProfile?.uniqueId && (
                      <Badge variant="outline" className="text-xs rounded-full">
                        {userProfile.uniqueId}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
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
                  <p className="text-blue-100 text-sm font-medium">참가 반</p>
                  <p className="text-3xl font-bold">{totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-green-100 text-sm font-medium">전체 과제</p>
                  <p className="text-3xl font-bold">{totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
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

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md rounded-full p-1 shadow-lg border-0">
            <TabsTrigger
              value="overview"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              개요
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
            >
              내 반
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              과제
            </TabsTrigger>
            <TabsTrigger
              value="timetable"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              <School className="h-4 w-4 mr-2" />
              시간표
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              캘린더
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 마감 임박 과제 */}
              <Card className="overflow-hidden bg-gradient-to-br from-red-50 via-white to-orange-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center mr-3">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    마감 임박 과제
                  </CardTitle>
                  <CardDescription>3일 이내 마감되는 과제들</CardDescription>
                </CardHeader>
                <CardContent>
                  {upcomingAssignments.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingAssignments.slice(0, 5).map((assignment) => {
                        const dueDate = new Date(assignment.dueDate)
                        const now = new Date()
                        const timeDiff = dueDate.getTime() - now.getTime()
                        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24))
                        const classInfo = myClasses.find((cls) => cls.id === assignment.classId)

                        return (
                          <div
                            key={assignment.id}
                            className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 mb-1">{assignment.title}</h4>
                                <p className="text-sm text-gray-600 mb-2">{classInfo?.name}</p>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    className={`text-xs ${
                                      daysDiff <= 1
                                        ? "bg-red-500 text-white"
                                        : daysDiff <= 2
                                          ? "bg-orange-500 text-white"
                                          : "bg-yellow-500 text-white"
                                    }`}
                                  >
                                    {daysDiff <= 0 ? "오늘 마감" : `${daysDiff}일 남음`}
                                  </Badge>
                                  <span className="text-xs text-gray-500">{dueDate.toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>마감 임박한 과제가 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 최근 활동 */}
              <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader>
                  <CardTitle className="flex items-center text-xl">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    참가 중인 반
                  </CardTitle>
                  <CardDescription>현재 참가하고 있는 반 목록</CardDescription>
                </CardHeader>
                <CardContent>
                  {myClasses.length > 0 ? (
                    <div className="space-y-3">
                      {myClasses.slice(0, 5).map((classInfo) => (
                        <div
                          key={classInfo.id}
                          className="p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-gray-100 hover:shadow-md transition-all duration-300"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-800 mb-1">{classInfo.name}</h4>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs">
                                  {classInfo.subject}
                                </Badge>
                                <span className="text-xs text-gray-600">
                                  {classInfo.grade}학년 {classInfo.classNumber}반
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">담당: {classInfo.teacherName}</p>
                            </div>
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/class/${classInfo.id}`}>입장</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>참가 중인 반이 없습니다</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="classes">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myClasses.map((classInfo) => (
                <Card
                  key={classInfo.id}
                  className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105"
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{classInfo.name}</CardTitle>
                    <CardDescription>
                      {classInfo.grade}학년 {classInfo.classNumber}반 · {classInfo.subject}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">담당교사</span>
                        <span className="font-medium">{classInfo.teacherName}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">멤버 수</span>
                        <span className="font-medium">{classInfo.memberCount}명</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">개설일</span>
                        <span className="font-medium">{new Date(classInfo.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button className="w-full mt-4" asChild>
                      <Link href={`/class/${classInfo.id}`}>반 입장하기</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {myClasses.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <Users className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">참가 중인 반이 없습니다</h3>
                  <p className="text-gray-500">반 코드를 입력하여 새로운 반에 참가해보세요</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="assignments">
            <div className="space-y-4">
              {myAssignments
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .map((assignment) => {
                  const submission = mySubmissions?.find((sub) => sub.assignmentId === assignment.id)
                  const classInfo = myClasses.find((cls) => cls.id === assignment.classId)
                  const isOverdue = new Date(assignment.dueDate) < new Date()

                  return (
                    <Card
                      key={assignment.id}
                      className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500"
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-800">{assignment.title}</h4>
                              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                {assignment.subject}
                              </Badge>
                              <Badge variant="outline">{classInfo?.name}</Badge>
                              {submission && <Badge className="bg-green-500 text-white">제출완료</Badge>}
                              {isOverdue && !submission && <Badge className="bg-red-500 text-white">마감됨</Badge>}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              마감: {new Date(assignment.dueDate).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              생성일: {new Date(assignment.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/class/${assignment.classId}`}>보기</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

              {myAssignments.length === 0 && (
                <div className="text-center py-16">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50 text-gray-400" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">배정된 과제가 없습니다</h3>
                  <p className="text-gray-500">반에 참가하여 과제를 받아보세요</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timetable">
            <TimetableWidget compact={false} />
          </TabsContent>

          <TabsContent value="calendar">
            <Calendar showPersonalEvents={true} />
          </TabsContent>
        </Tabs>
      </div>

      {/* 프로필 설정 모달 */}
      <ProfileSettingsModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  )
}
