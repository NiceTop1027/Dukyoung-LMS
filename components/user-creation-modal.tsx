"use client"

import type React from "react"

import { useState } from "react"
import { createUserWithEmailAndPassword, signOut, getAuth } from "firebase/auth"
import { initializeApp } from "firebase/app"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  User,
  Mail,
  Lock,
  GraduationCap,
  BookOpen,
  Users,
  Sparkles,
  CheckCircle,
  AlertTriangle,
} from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { generateRandomPassword } from "@/lib/password-utils"
import { checkEmailExists, generateUniqueId } from "@/lib/auth-utils"

interface UserCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onUserCreated?: (userInfo: any) => void
  defaultRole?: "student" | "teacher"
  allowRoleChange?: boolean
}

export function UserCreationModal({
  isOpen,
  onClose,
  onUserCreated,
  defaultRole = "student",
  allowRoleChange = true,
}: UserCreationModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: defaultRole,
    grade: "",
    class: "",
    uniqueId: "",
    teacherSubject: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [createdUser, setCreatedUser] = useState<any>(null)

  const handleGeneratePassword = () => {
    const newPassword = generateRandomPassword()
    setFormData((prev) => ({ ...prev, password: newPassword }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.password) {
      setError("모든 필수 필드를 입력해주세요.")
      return
    }

    // 역할별 필수 필드 검증
    if (formData.role === "student" && (!formData.grade || !formData.class)) {
      setError("학생의 경우 학년과 반을 선택해주세요.")
      return
    }

    if (formData.role === "teacher" && !formData.teacherSubject) {
      setError("교사의 경우 담당 과목을 입력해주세요.")
      return
    }

    setIsCreating(true)
    setError("")
    setSuccess("")

    // 현재 사용자 정보 저장
    const currentUser = auth.currentUser
    console.log("=== 사용자 생성 시작 ===")
    console.log("Current user before creation:", currentUser?.email, currentUser?.uid)
    console.log("Creating user with data:", {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      grade: formData.grade,
      class: formData.class,
      teacherSubject: formData.teacherSubject,
    })

    let secondaryApp: any = null

    try {
      // 이메일 중복 확인
      console.log("1. Checking email existence...")
      const emailExists = await checkEmailExists(formData.email)
      if (emailExists) {
        throw new Error("이미 사용 중인 이메일 주소입니다.")
      }
      console.log("✓ Email is available")

      // 별도의 Firebase 앱 인스턴스 생성 (사용자 생성 전용)
      const firebaseConfig = {
        apiKey: "AIzaSyBOBbFifNSfysMS2KrLGM_7GRm5LVNgwx8",
        authDomain: "dy-lms-8e706.firebaseapp.com",
        projectId: "dy-lms-8e706",
        storageBucket: "dy-lms-8e706.firebasestorage.app",
        messagingSenderId: "83433593539",
        appId: "1:83433593539:web:f02743a875696eea79e076",
      }

      // 고유한 이름으로 별도 앱 생성
      const appName = `secondary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      secondaryApp = initializeApp(firebaseConfig, appName)
      const secondaryAuth = getAuth(secondaryApp)

      console.log("2. Secondary app created:", appName)

      // 별도 인스턴스에서 새 사용자 생성
      console.log("3. Creating Firebase Auth user...")
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password)
      const newUser = userCredential.user

      console.log("✓ Firebase Auth user created:", newUser.email, newUser.uid)

      // 고유 ID 생성
      console.log("4. Generating unique ID...")
      const uniqueId = formData.uniqueId || (await generateUniqueId(formData.role))
      console.log("✓ Generated unique ID:", uniqueId)

      // Firestore에 새 사용자 프로필 저장
      const userProfile = {
        uid: newUser.uid,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        uniqueId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(formData.role === "student" && {
          grade: formData.grade,
          class: formData.class,
          userId: uniqueId,
          studentId: uniqueId, // 기존 호환성
        }),
        ...(formData.role === "teacher" && {
          teacherSubject: formData.teacherSubject,
          userId: uniqueId,
          teacherId: uniqueId, // 기존 호환성
        }),
      }

      console.log("5. Saving user profile to Firestore...")
      console.log("User profile data:", userProfile)

      // 여러 방법으로 시도
      try {
        // 방법 1: 직접 setDoc 사용
        const userDocRef = doc(db, "users", newUser.uid)
        await setDoc(userDocRef, userProfile)
        console.log("✓ Method 1 (setDoc) succeeded")
      } catch (firestoreError: any) {
        console.error("✗ Method 1 (setDoc) failed:", firestoreError)

        // 방법 2: merge 옵션으로 시도
        try {
          const userDocRef = doc(db, "users", newUser.uid)
          await setDoc(userDocRef, userProfile, { merge: true })
          console.log("✓ Method 2 (setDoc with merge) succeeded")
        } catch (mergeError: any) {
          console.error("✗ Method 2 (setDoc with merge) failed:", mergeError)
          throw new Error(`Firestore 저장 실패: ${firestoreError.message || firestoreError.code}`)
        }
      }

      console.log("✓ User profile saved successfully to Firestore")

      // 별도 인스턴스에서 새 사용자 로그아웃
      await signOut(secondaryAuth)
      console.log("6. Secondary auth signed out")

      // 현재 사용자 상태 확인
      console.log("Current user after creation:", auth.currentUser?.email, auth.currentUser?.uid)

      // 성공 처리
      const userInfo = {
        ...userProfile,
        password: formData.password, // 임시로 비밀번호도 포함 (실제로는 저장하지 않음)
        createdAt: new Date(), // serverTimestamp를 Date로 변환
        updatedAt: new Date(),
      }

      setCreatedUser(userInfo)
      setSuccess(`${formData.role === "student" ? "학생" : "교사"} 계정이 성공적으로 생성되었습니다.`)

      // onUserCreated 콜백 호출 (선택적)
      if (onUserCreated) {
        onUserCreated(userInfo)
      }

      // 폼 초기화
      setFormData({
        name: "",
        email: "",
        password: "",
        role: defaultRole,
        grade: "",
        class: "",
        uniqueId: "",
        teacherSubject: "",
      })

      console.log("=== 사용자 생성 완료 ===")
    } catch (error: any) {
      console.error("=== 사용자 생성 실패 ===")
      console.error("Error creating user:", error)
      console.error("Error code:", error.code)
      console.error("Error message:", error.message)
      console.error("Full error object:", error)

      let errorMessage = "계정 생성 중 오류가 발생했습니다."

      // Firebase Auth 에러
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "이미 사용 중인 이메일 주소입니다."
      } else if (error.code === "auth/weak-password") {
        errorMessage = "비밀번호가 너무 약합니다. 최소 6자 이상 입력해주세요."
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "유효하지 않은 이메일 주소입니다."
      }
      // Firestore 에러
      else if (error.code === "permission-denied") {
        errorMessage = "Firestore 접근 권한이 없습니다. Firebase 규칙을 확인해주세요."
        console.error("Permission denied details:", {
          currentUserUid: auth.currentUser?.uid,
          currentUserEmail: auth.currentUser?.email,
          targetRole: formData.role,
          timestamp: new Date().toISOString(),
        })
      } else if (error.code === "unavailable") {
        errorMessage = "Firestore 서비스를 사용할 수 없습니다. 잠시 후 다시 시도해주세요."
      } else if (error.code === "deadline-exceeded") {
        errorMessage = "요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요."
      }
      // 일반 에러
      else if (error.message && error.message.includes("Missing or insufficient permissions")) {
        errorMessage = "권한이 부족합니다. 관리자에게 문의하세요."
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      // 별도 앱 인스턴스 정리
      if (secondaryApp) {
        try {
          await secondaryApp.delete()
          console.log("Secondary app deleted successfully")
        } catch (deleteError) {
          console.warn("Failed to delete secondary app:", deleteError)
        }
      }

      setIsCreating(false)

      // 최종 현재 사용자 상태 확인
      console.log("Final current user:", auth.currentUser?.email, auth.currentUser?.uid)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const handleClose = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: defaultRole,
      grade: "",
      class: "",
      uniqueId: "",
      teacherSubject: "",
    })
    setError("")
    setSuccess("")
    setCreatedUser(null)
    onClose()
  }

  const getRoleIcon = (role: string) => {
    return role === "student" ? (
      <GraduationCap className="h-5 w-5 text-white" />
    ) : (
      <Users className="h-5 w-5 text-white" />
    )
  }

  const getRoleColor = (role: string) => {
    return role === "student" ? "from-green-500 to-emerald-500" : "from-blue-500 to-indigo-500"
  }

  const getRoleBgColor = (role: string) => {
    return role === "student"
      ? "from-green-50 to-emerald-50 border-green-200"
      : "from-blue-50 to-indigo-50 border-blue-200"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="flex items-center text-2xl font-bold">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-4 shadow-lg">
              <User className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              새 사용자 계정 생성
            </span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-6 animate-in slide-in-from-top duration-300">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div>{error}</div>
                <div className="text-xs opacity-75">
                  현재 사용자: {auth.currentUser?.email} ({auth.currentUser?.uid})
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {success && createdUser && (
          <Card
            className={`mb-6 bg-gradient-to-r ${getRoleBgColor(createdUser.role)} animate-in slide-in-from-top duration-500`}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-r ${getRoleColor(createdUser.role)} flex items-center justify-center mr-3 shadow-md`}
                >
                  {getRoleIcon(createdUser.role)}
                </div>
                <span
                  className={`bg-gradient-to-r ${getRoleColor(createdUser.role)} bg-clip-text text-transparent font-bold`}
                >
                  {createdUser.role === "student" ? "학생" : "교사"} 계정 생성 완료!
                </span>
                <Badge className={`ml-3 bg-gradient-to-r ${getRoleColor(createdUser.role)} text-white animate-pulse`}>
                  성공
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700 font-medium">이름</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-800">{createdUser.name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdUser.name)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-all duration-200"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700 font-medium">이메일</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-800 text-sm">{createdUser.email}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdUser.email)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-all duration-200"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700 font-medium">임시 비밀번호</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded text-sm">
                        {createdUser.password}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdUser.password)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-all duration-200"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4 text-gray-600" />
                      <span className="text-gray-700 font-medium">고유 ID</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded text-sm">
                        {createdUser.uniqueId}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(createdUser.uniqueId)}
                        className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full transition-all duration-200"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 역할별 추가 정보 */}
              {createdUser.role === "student" && createdUser.grade && createdUser.class && (
                <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">학생 정보</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Badge className="bg-green-500 text-white px-3 py-1">{createdUser.grade}학년</Badge>
                    <Badge className="bg-emerald-500 text-white px-3 py-1">{createdUser.class}반</Badge>
                  </div>
                </div>
              )}

              {createdUser.role === "teacher" && createdUser.teacherSubject && (
                <div className="p-4 bg-blue-100 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">교사 정보</span>
                  </div>
                  <Badge className="bg-blue-500 text-white px-3 py-1">{createdUser.teacherSubject}</Badge>
                </div>
              )}

              <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">성공!</span>
                </div>
                <p className="text-sm text-green-700">
                  💡 이 정보를 사용자에게 전달하세요. 첫 로그인 후 반드시 비밀번호를 변경하도록 안내해주세요.
                  <br />✅ 현재 교사 계정이 유지되었습니다. 로그아웃되지 않았습니다!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 기본 정보 섹션 */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                기본 정보
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center text-sm font-semibold text-gray-700">
                    <User className="h-4 w-4 mr-1" />
                    이름 *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="사용자 이름을 입력하세요"
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center text-sm font-semibold text-gray-700">
                    <Mail className="h-4 w-4 mr-1" />
                    이메일 *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="이메일 주소를 입력하세요"
                    className="h-12 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center text-sm font-semibold text-gray-700">
                  <Lock className="h-4 w-4 mr-1" />
                  임시 비밀번호 *
                </Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder="비밀번호를 입력하세요"
                      className="h-12 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300 pr-12"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGeneratePassword}
                    className="h-12 px-4 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-300 bg-transparent"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {allowRoleChange && (
                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center text-sm font-semibold text-gray-700">
                    <Users className="h-4 w-4 mr-1" />
                    역할 *
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "student" | "teacher") => setFormData((prev) => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">
                        <div className="flex items-center space-x-2">
                          <GraduationCap className="h-4 w-4 text-green-600" />
                          <span>학생</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="teacher">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <span>교사</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 역할별 상세 정보 */}
          {formData.role === "student" && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <GraduationCap className="h-5 w-5 mr-2 text-green-600" />
                  학생 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade" className="text-sm font-semibold text-gray-700">
                      학년 *
                    </Label>
                    <Select
                      value={formData.grade}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, grade: value }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-green-200 focus:border-green-400 focus:ring-green-400 transition-all duration-300">
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
                    <Label htmlFor="class" className="text-sm font-semibold text-gray-700">
                      반 *
                    </Label>
                    <Select
                      value={formData.class}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, class: value }))}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-green-200 focus:border-green-400 focus:ring-green-400 transition-all duration-300">
                        <SelectValue placeholder="반 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1}반
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-green-100 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-semibold text-green-800">학생 정보 안내</span>
                  </div>
                  <p className="text-xs text-green-700">
                    학년과 반 정보를 정확히 선택해주세요. 이 정보는 반 배정과 성적 관리에 사용됩니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {formData.role === "teacher" && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                  교사 정보
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="teacherSubject" className="flex items-center text-sm font-semibold text-gray-700">
                    <BookOpen className="h-4 w-4 mr-1" />
                    담당 과목 *
                  </Label>
                  <Input
                    id="teacherSubject"
                    value={formData.teacherSubject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, teacherSubject: e.target.value }))}
                    placeholder="담당 과목을 입력하세요 (예: 수학, 국어, 영어)"
                    className="h-12 rounded-xl border-blue-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300"
                  />
                </div>

                <div className="p-4 bg-blue-100 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800">교사 정보 안내</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    담당 과목 정보를 정확히 입력해주세요. 이 정보는 반 관리와 과제 배정에 사용됩니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 선택 정보 */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                추가 설정 (선택사항)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="uniqueId" className="text-sm font-semibold text-gray-700">
                  고유 ID (비워두면 자동 생성)
                </Label>
                <Input
                  id="uniqueId"
                  value={formData.uniqueId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, uniqueId: e.target.value }))}
                  placeholder="고유 ID를 입력하거나 비워두세요"
                  className="h-12 rounded-xl border-purple-200 focus:border-purple-400 focus:ring-purple-400 transition-all duration-300"
                />
              </div>
            </CardContent>
          </Card>

          <Separator className="my-6" />

          <div className="flex justify-end space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-12 px-8 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-300 bg-transparent"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
            >
              {isCreating ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>생성 중...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>계정 생성</span>
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
