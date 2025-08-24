"use client"

import { useState, useEffect } from "react"
import { collection } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Shield,
  Users,
  BookOpen,
  FileText,
  Settings,
  LogOut,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { usePollingData } from "@/hooks/use-polling-data"
import { UserManagementModal } from "@/components/user-management-modal"
import { AdminPasswordManager } from "@/components/admin-password-manager"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"

interface UserProfile {
  id: string
  name: string
  email: string
  role: "admin" | "teacher" | "student"
  uniqueId: string
  grade?: string
  class?: string
  teacherSubject?: string
  createdAt: Date
  lastLoginAt?: Date
}

interface ClassInfo {
  id: string
  name: string
  grade: string
  classNumber: string
  subject: string
  teacherId: string
  teacherName: string
  memberCount: number
  createdAt: Date
}

interface ClassAssignment {
  id: string
  title: string
  subject: string
  classId: string
  createdBy: string
  createdAt: Date
  dueDate: string
}

interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  submittedAt: Date
  status: "submitted" | "graded"
}

export default function AdminDashboard() {
  const { user, userProfile, logout } = useAuth()
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false)
  const [isPasswordManagerOpen, setIsPasswordManagerOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 모든 사용자 프로필
  const allUsersRef = collection(db, "userProfiles")
  const { data: allUsers, refresh: refreshUsers } = usePollingData<UserProfile>(allUsersRef, (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    lastLoginAt: data.lastLoginAt?.toDate ? data.lastLoginAt.toDate() : data.lastLoginAt,
  }))

  // 모든 반
  const allClassesRef = collection(db, "classes")
  const { data: allClasses } = usePollingData<ClassInfo>(allClassesRef, (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
  }))

  // 모든 과제
  const allAssignmentsRef = collection(db, "assignments")
  const { data: allAssignments } = usePollingData<ClassAssignment>(allAssignmentsRef, (data) => ({
    ...data,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
  }))

  // 모든 제출물
  const allSubmissionsRef = collection(db, "assignmentSubmissions")
  const { data: allSubmissions } = usePollingData<AssignmentSubmission>(allSubmissionsRef, (data) => ({
    ...data,
    submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
  }))

  // 통계 계산
  const totalUsers = allUsers?.length || 0
  const totalAdmins = allUsers?.filter((user) => user.role === "admin").length || 0
  const totalTeachers = allUsers?.filter((user) => user.role === "teacher").length || 0
  const totalStudents = allUsers?.filter((user) => user.role === "student").length || 0
  const totalClasses = allClasses?.length || 0
  const totalAssignments = allAssignments?.length || 0
  const totalSubmissions = allSubmissions?.length || 0

  // 최근 활동
  const recentUsers =
    allUsers?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5) || []

  const recentClasses =
    allClasses?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5) || []

  const recentAssignments =
    allAssignments?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5) || []

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log("Admin Dashboard Debug:")
    console.log("User:", user?.uid)
    console.log("User Profile:", userProfile)
    console.log("All Users:", allUsers)
    console.log("All Classes:", allClasses)
    console.log("All Assignments:", allAssignments)
  }, [user, userProfile, allUsers, allClasses, allAssignments])

  if (!userProfile || userProfile.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <Card className="w-full max-w-md bg-gradient-to-br from-red-50 to-orange-50 border-red-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-400 to-orange-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">접근 권한 필요</h3>
            <p className="text-gray-600">관리자만 이 페이지에 접근할 수 있습니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center animate-in slide-in-from-left duration-700">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center mr-4 shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  관리자 대시보드
                </h1>
                <p className="text-gray-600">안녕하세요, {userProfile?.name} 관리자님!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 animate-in slide-in-from-right duration-700">
              <div className="flex items-center space-x-3">
                <Avatar className="ring-4 ring-purple-200">
                  <AvatarFallback className="bg-gradient-to-r from-purple-400 to-indigo-400 text-white">
                    {userProfile?.name?.charAt(0) ?? ""}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{userProfile?.name}</p>
                  <div className="flex items-center space-x-1">
                    <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs rounded-full">
                      관리자
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
                variant="ghost"
                size="sm"
                onClick={() => setIsProfileModalOpen(true)}
                className="rounded-full hover:bg-purple-50 transition-all duration-300 transform hover:scale-105"
              >
                <Settings className="h-4 w-4 mr-2" />
                설정
              </Button>
              <Button
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
        {error && (
          <Alert
            variant="destructive"
            className="mb-6 border-red-200 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl animate-in slide-in-from-top duration-300"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl animate-in slide-in-from-top duration-300">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in fade-in duration-700">
          <Card className="group overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-blue-100 text-sm font-medium">전체 사용자</p>
                  <p className="text-3xl font-bold">{totalUsers}</p>
                  <div className="flex items-center space-x-2 text-xs text-blue-200 mt-1">
                    <span>관리자: {totalAdmins}</span>
                    <span>•</span>
                    <span>교사: {totalTeachers}</span>
                    <span>•</span>
                    <span>학생: {totalStudents}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-green-500 to-emerald-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-green-100 text-sm font-medium">전체 반</p>
                  <p className="text-3xl font-bold">{totalClasses}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-purple-500 to-pink-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FileText className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-purple-100 text-sm font-medium">전체 과제</p>
                  <p className="text-3xl font-bold">{totalAssignments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105">
            <CardContent className="p-6 text-white">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-orange-100 text-sm font-medium">전체 제출물</p>
                  <p className="text-3xl font-bold">{totalSubmissions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 관리 도구 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-in fade-in duration-700">
          <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
            <CardHeader className="relative">
              <CardTitle className="flex items-center text-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  사용자 관리
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600">사용자 계정을 생성하고 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Button
                onClick={() => setIsUserManagementOpen(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                사용자 관리 열기
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
            <CardHeader className="relative">
              <CardTitle className="flex items-center text-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  비밀번호 관리
                </span>
              </CardTitle>
              <CardDescription className="text-gray-600">사용자 비밀번호를 초기화하고 관리하세요</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <Button
                onClick={() => setIsPasswordManagerOpen(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                비밀번호 관리 열기
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md rounded-full p-1 shadow-lg border-0">
            <TabsTrigger
              value="users"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white transition-all duration-300"
            >
              사용자 현황
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-500 data-[state=active]:text-white transition-all duration-300"
            >
              반 현황
            </TabsTrigger>
            <TabsTrigger
              value="assignments"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              과제 현황
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white transition-all duration-300"
            >
              최근 활동
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    전체 사용자 ({totalUsers}명)
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">시스템에 등록된 모든 사용자를 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {allUsers
                    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((user, index) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar className="ring-2 ring-blue-200">
                            <AvatarFallback
                              className={`text-white ${
                                user.role === "admin"
                                  ? "bg-gradient-to-r from-purple-400 to-indigo-400"
                                  : user.role === "teacher"
                                    ? "bg-gradient-to-r from-blue-400 to-indigo-400"
                                    : "bg-gradient-to-r from-green-400 to-emerald-400"
                              }`}
                            >
                              {user.name?.charAt(0) ?? ""}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-800">{user.name}</p>
                              <Badge
                                className={`text-xs rounded-full ${
                                  user.role === "admin"
                                    ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                                    : user.role === "teacher"
                                      ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                      : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                                }`}
                              >
                                {user.role === "admin" ? "관리자" : user.role === "teacher" ? "교사" : "학생"}
                              </Badge>
                              <Badge variant="outline" className="text-xs rounded-full">
                                {user.uniqueId}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">{user.email}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                              <span>가입일: {new Date(user.createdAt).toLocaleDateString()}</span>
                              {user.lastLoginAt && (
                                <span>최근 로그인: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                              )}
                              {user.role === "student" && user.grade && user.class && (
                                <span>
                                  {user.grade}학년 {user.class}반
                                </span>
                              )}
                              {user.role === "teacher" && user.teacherSubject && <span>{user.teacherSubject}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                    전체 반 ({totalClasses}개)
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">시스템에 생성된 모든 반을 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {allClasses
                    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((classInfo, index) => (
                      <div
                        key={classInfo.id}
                        className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-semibold text-gray-800">{classInfo.name}</h4>
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-3 py-1">
                                {classInfo.grade}학년 {classInfo.classNumber}반
                              </Badge>
                              <Badge variant="outline" className="rounded-full px-3 py-1">
                                {classInfo.subject}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-6 text-sm text-gray-600">
                              <span>담당교사: {classInfo.teacherName}</span>
                              <span>멤버: {classInfo.memberCount}명</span>
                              <span>생성일: {new Date(classInfo.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments" className="space-y-6">
            <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
              <CardHeader className="relative">
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    전체 과제 ({totalAssignments}개)
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">시스템에 생성된 모든 과제를 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {allAssignments
                    ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((assignment, index) => {
                      const classInfo = allClasses?.find((cls) => cls.id === assignment.classId)
                      const submissionCount =
                        allSubmissions?.filter((sub) => sub.assignmentId === assignment.id).length || 0

                      return (
                        <div
                          key={assignment.id}
                          className="p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className="text-lg font-semibold text-gray-800">{assignment.title}</h4>
                                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full px-3 py-1">
                                  {assignment.subject}
                                </Badge>
                                <Badge variant="outline" className="rounded-full px-3 py-1">
                                  {classInfo?.name}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-6 text-sm text-gray-600">
                                <span>마감: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                                <span>제출물: {submissionCount}개</span>
                                <span>생성일: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* 최근 가입 사용자 */}
              <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader className="relative">
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-2">
                      <Users className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      최근 가입자
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    {recentUsers.map((user, index) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-3 p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-all duration-300 animate-in slide-in-from-left"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            className={`text-xs text-white ${
                              user.role === "admin"
                                ? "bg-gradient-to-r from-purple-400 to-indigo-400"
                                : user.role === "teacher"
                                  ? "bg-gradient-to-r from-blue-400 to-indigo-400"
                                  : "bg-gradient-to-r from-green-400 to-emerald-400"
                            }`}
                          >
                            {user.name?.charAt(0) ?? ""}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Badge
                          className={`text-xs rounded-full ${
                            user.role === "admin"
                              ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
                              : user.role === "teacher"
                                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                : "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                          }`}
                        >
                          {user.role === "admin" ? "관리자" : user.role === "teacher" ? "교사" : "학생"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 최근 생성 반 */}
              <Card className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader className="relative">
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-2">
                      <BookOpen className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      최근 생성 반
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    {recentClasses.map((classInfo, index) => (
                      <div
                        key={classInfo.id}
                        className="p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-all duration-300 animate-in slide-in-from-bottom"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{classInfo.name}</p>
                            <p className="text-xs text-gray-500">{classInfo.teacherName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(classInfo.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs rounded-full">
                            {classInfo.grade}-{classInfo.classNumber}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 최근 생성 과제 */}
              <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
                <CardHeader className="relative">
                  <CardTitle className="flex items-center text-lg">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-2">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      최근 생성 과제
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <div className="space-y-3">
                    {recentAssignments.map((assignment, index) => {
                      const classInfo = allClasses?.find((cls) => cls.id === assignment.classId)

                      return (
                        <div
                          key={assignment.id}
                          className="p-3 bg-white/50 rounded-xl hover:bg-white/70 transition-all duration-300 animate-in slide-in-from-right"
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{assignment.title}</p>
                              <p className="text-xs text-gray-500">{classInfo?.name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(assignment.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs rounded-full">
                              {assignment.subject}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        onUserCreated={() => {
          refreshUsers()
          setSuccess("사용자가 성공적으로 생성되었습니다.")
        }}
      />

      <AdminPasswordManager
        isOpen={isPasswordManagerOpen}
        onClose={() => setIsPasswordManagerOpen(false)}
        onPasswordReset={() => {
          setSuccess("비밀번호가 성공적으로 초기화되었습니다.")
        }}
      />

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onProfileUpdated={() => {
          window.location.reload()
        }}
      />
    </div>
  )
}
