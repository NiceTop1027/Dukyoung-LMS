"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  BookOpen,
  Plus,
  Trash2,
  Users,
  Copy,
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Trash,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { safeAddDoc, safeDeleteDoc, safeUpdateDoc, safeGetDocs } from "@/lib/firebase-utils"
import { usePollingData } from "@/hooks/use-polling-data"
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

export function ClassManagement() {
  const { user, userProfile } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [newClass, setNewClass] = useState({
    name: "",
    grade: "",
    classNumber: "",
  })

  // 내가 만든 반들
  const myClassesRef = user ? query(collection(db, "classes"), where("teacherId", "==", user.uid)) : null
  const { data: myClasses, refresh: refreshClasses } = usePollingData<ClassInfo>(myClassesRef)

  // 내가 받은 참가 요청들
  const joinRequestsRef = user ? query(collection(db, "classJoinRequests"), where("teacherId", "==", user.uid)) : null
  const { data: joinRequests, refresh: refreshRequests } = usePollingData<JoinRequest>(joinRequestsRef)

  // 반 코드 생성 함수 (간단하게)
  const generateClassCode = (): string => {
    const randomNum = Math.floor(Math.random() * 900000) + 100000 // 6자리 숫자
    return randomNum.toString()
  }

  // 반 코드 중복 확인
  const isClassCodeUnique = async (classCode: string): Promise<boolean> => {
    try {
      const classesRef = collection(db, "classes")
      const existingClasses = await safeGetDocs<ClassInfo>(classesRef)
      return !existingClasses.some((cls) => cls.classCode === classCode)
    } catch (error) {
      console.error("Error checking class code uniqueness:", error)
      return false
    }
  }

  // 고유한 반 코드 생성
  const generateUniqueClassCode = async (): Promise<string> => {
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const classCode = generateClassCode()
      const isUnique = await isClassCodeUnique(classCode)

      if (isUnique) {
        return classCode
      }

      attempts++
    }

    // 최대 시도 횟수 초과 시 타임스탬프 추가
    const timestamp = Date.now().toString()
    return timestamp.slice(-6)
  }

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newClass.name || !newClass.grade || !newClass.classNumber) {
      setError("모든 필드를 입력해주세요.")
      return
    }

    if (!user || !userProfile) {
      setError("로그인이 필요합니다.")
      return
    }

    setError("")
    setSuccess("")

    try {
      // 고유한 반 코드 생성
      const classCode = await generateUniqueClassCode()

      const classData = {
        name: newClass.name,
        grade: newClass.grade,
        classNumber: newClass.classNumber,
        teacherId: user.uid,
        teacherName: userProfile.name,
        classCode: classCode,
        memberCount: 1,
        createdAt: new Date(),
      }

      console.log("Creating class with data:", classData)
      const classId = await safeAddDoc("classes", classData)
      console.log("Class created with ID:", classId)

      // 교사를 반 멤버로 추가
      const memberData = {
        classId: classId,
        memberId: user.uid,
        memberName: userProfile.name,
        memberRole: "teacher" as const,
        joinedAt: new Date(),
      }

      console.log("Adding teacher as member:", memberData)
      await safeAddDoc("classMembers", memberData)

      setSuccess(`반이 성공적으로 생성되었습니다! 반 코드: ${classCode}`)
      setNewClass({
        name: "",
        grade: "",
        classNumber: "",
      })
      setIsCreating(false)
      refreshClasses()
    } catch (error: any) {
      console.error("Error creating class:", error)
      setError("반 생성 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"))
    }
  }

  const handleDeleteClass = async (classId: string, className: string) => {
    if (!confirm(`정말로 "${className}" 반을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    try {
      // 반 멤버들 삭제
      const membersRef = collection(db, "classMembers")
      const memberQuery = query(membersRef, where("classId", "==", classId))
      const members = await safeGetDocs(memberQuery)

      for (const member of members) {
        await safeDeleteDoc(`classMembers/${member.id}`)
      }

      // 반 삭제
      await safeDeleteDoc(`classes/${classId}`)

      setSuccess(`"${className}" 반이 삭제되었습니다.`)
      refreshClasses()
    } catch (error: any) {
      console.error("Error deleting class:", error)
      setError("반 삭제 중 오류가 발생했습니다.")
    }
  }

  const handleGenerateClassCode = async (classId: string) => {
    try {
      const classCode = await generateUniqueClassCode()
      await safeUpdateDoc(`classes/${classId}`, { classCode })
      setSuccess(`반 코드가 생성되었습니다: ${classCode}`)
      refreshClasses()
    } catch (error: any) {
      console.error("Error generating class code:", error)
      setError("반 코드 생성 중 오류가 발생했습니다.")
    }
  }

  const copyClassCode = (classCode: string) => {
    navigator.clipboard.writeText(classCode)
    setSuccess("반 코드가 클립보드에 복사되었습니다.")
    setTimeout(() => setSuccess(""), 2000)
  }

  const handleApproveRequest = async (requestId: string, classId: string) => {
    try {
      const request = joinRequests?.find((req) => req.id === requestId)
      if (!request) {
        setError("요청을 찾을 수 없습니다.")
        return
      }

      // 참가 요청 승인으로 상태 변경
      await safeUpdateDoc(`classJoinRequests/${requestId}`, {
        status: "approved",
        respondedAt: new Date(),
      })

      // 반 멤버로 추가
      const memberData = {
        classId: classId,
        memberId: request.requesterId,
        memberName: request.requesterName,
        memberRole: request.requesterRole,
        joinedAt: new Date(),
      }

      await safeAddDoc("classMembers", memberData)

      setSuccess(`${request.requesterName}님의 참가 요청을 승인했습니다.`)
      refreshRequests()
    } catch (error: any) {
      console.error("Error approving request:", error)
      setError("요청 승인 중 오류가 발생했습니다.")
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
      refreshRequests()
    } catch (error: any) {
      console.error("Error rejecting request:", error)
      setError("요청 거절 중 오류가 발생했습니다.")
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
      refreshRequests()
    } catch (error: any) {
      console.error("Error deleting all requests:", error)
      setError("참가 요청 삭제 중 오류가 발생했습니다: " + error.message)
    }
  }

  if (!userProfile || userProfile.role !== "teacher") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">접근 권한 필요</h3>
            <p className="text-gray-600">교사만 반을 관리할 수 있습니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pendingRequests = joinRequests?.filter((req) => req.status === "pending") || []

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {error && (
        <Alert
          variant="destructive"
          className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 animate-in slide-in-from-top duration-300"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 animate-in slide-in-from-top duration-300">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* 새 반 만들기 */}
      <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                새 반 만들기
              </CardTitle>
              <CardDescription className="text-gray-600">새로운 반을 생성하고 학생들을 초대하세요</CardDescription>
            </div>
            <Button
              onClick={() => setIsCreating(!isCreating)}
              className={`px-6 py-2 rounded-full transition-all duration-300 transform hover:scale-105 ${
                isCreating
                  ? "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600"
                  : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              } shadow-lg hover:shadow-xl`}
            >
              {isCreating ? "취소" : "반 만들기"}
            </Button>
          </div>
        </CardHeader>

        {isCreating && (
          <CardContent className="relative animate-in slide-in-from-top duration-500">
            <form onSubmit={handleCreateClass} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  반 이름 *
                </Label>
                <Input
                  id="name"
                  value={newClass.name}
                  onChange={(e) => setNewClass((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="예: 수학 심화반, 1학년 1반 등"
                  className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="grade" className="text-sm font-medium text-gray-700">
                    학년 *
                  </Label>
                  <Select
                    value={newClass.grade}
                    onValueChange={(value) => setNewClass((prev) => ({ ...prev, grade: value }))}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300">
                      <SelectValue placeholder="학년을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="1">1학년</SelectItem>
                      <SelectItem value="2">2학년</SelectItem>
                      <SelectItem value="3">3학년</SelectItem>
                      <SelectItem value="4">4학년</SelectItem>
                      <SelectItem value="5">5학년</SelectItem>
                      <SelectItem value="6">6학년</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="classNumber" className="text-sm font-medium text-gray-700">
                    반 *
                  </Label>
                  <Select
                    value={newClass.classNumber}
                    onValueChange={(value) => setNewClass((prev) => ({ ...prev, classNumber: value }))}
                  >
                    <SelectTrigger className="rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300">
                      <SelectValue placeholder="반을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}반
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
              >
                <Sparkles className="h-4 w-4 mr-2" />반 생성하기
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {/* 참가 요청 관리 */}
      {pendingRequests.length > 0 && (
        <Card className="overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-left duration-700">
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    참가 요청 ({pendingRequests.length}건)
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-600">
                  학생들의 반 참가 요청을 승인하거나 거절하세요
                </CardDescription>
              </div>
              {joinRequests && joinRequests.length > 0 && (
                <Button
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
              {pendingRequests
                .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
                .map((request, index) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-right"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="ring-2 ring-orange-200">
                        <AvatarFallback className="bg-gradient-to-r from-orange-400 to-red-400 text-white">
                          {request.requesterName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-800">{request.requesterName}</p>
                        <p className="text-sm text-gray-500">
                          {request.className} • {new Date(request.requestedAt).toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1 rounded-full">
                          {request.requesterRole === "teacher" ? "교사" : "학생"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleApproveRequest(request.id, request.classId)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-full px-4 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                        className="rounded-full px-4 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-all duration-300 transform hover:scale-105"
                      >
                        거절
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 내 반 목록 */}
      <Card className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-blue-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardHeader className="relative">
          <CardTitle className="flex items-center text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center mr-3">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              내 반 목록 ({myClasses?.length || 0}개)
            </span>
          </CardTitle>
          <CardDescription className="text-gray-600">생성한 반들을 관리하고 학생들을 초대하세요</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myClasses?.map((classInfo, index) => (
              <Card
                key={classInfo.id}
                className="group overflow-hidden bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:scale-[1.02] animate-in fade-in slide-in-from-bottom"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                <CardHeader className="relative pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
                      {classInfo.name}
                    </CardTitle>
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full px-3 py-1">
                      {classInfo.grade}학년 {classInfo.classNumber}반
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="relative space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">멤버:</span>
                    <span className="font-medium text-gray-800">{classInfo.memberCount}명</span>
                  </div>

                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-600">반 코드:</span>
                    <div className="flex items-center space-x-2">
                      {classInfo.classCode ? (
                        <>
                          <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                            {classInfo.classCode}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyClassCode(classInfo.classCode!)}
                            className="h-8 w-8 p-0 rounded-full hover:bg-blue-100 transition-all duration-300 transform hover:scale-110"
                          >
                            <Copy className="h-3 w-3 text-blue-600" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateClassCode(classInfo.id)}
                          className="h-8 text-xs px-3 rounded-full border-blue-200 text-blue-600 hover:bg-blue-50 transition-all duration-300"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          코드 생성
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">생성일:</span>
                    <span className="font-medium text-gray-800">
                      {new Date(classInfo.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button
                      size="sm"
                      asChild
                      className="flex-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-xl"
                    >
                      <Link href={`/class/${classInfo.id}`}>
                        <Settings className="h-3 w-3 mr-1" />
                        관리
                      </Link>
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all duration-300 transform hover:scale-110"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl">
                        <DialogHeader>
                          <DialogTitle>반 삭제 확인</DialogTitle>
                          <DialogDescription>
                            정말로 "{classInfo.name}" 반을 삭제하시겠습니까?
                            <br />이 작업은 되돌릴 수 없으며, 모든 과제와 데이터가 삭제됩니다.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" className="rounded-full bg-transparent">
                            취소
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteClass(classInfo.id, classInfo.name)}
                            className="rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                          >
                            삭제
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!myClasses || myClasses.length === 0) && (
              <div className="col-span-full text-center py-16 animate-in fade-in duration-1000">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                  <BookOpen className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">아직 생성한 반이 없습니다</h3>
                <p className="text-gray-500 mb-6">첫 번째 반을 만들어 학생들과 함께 시작해보세요</p>
                <Button
                  onClick={() => setIsCreating(true)}
                  className="rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-6 py-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />첫 번째 반 만들기
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
