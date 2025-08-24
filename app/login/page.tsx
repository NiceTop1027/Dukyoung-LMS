"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signInWithEmailAndPassword } from "firebase/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, ArrowLeft, Eye, EyeOff, LogIn, Sparkles } from "lucide-react"
import { auth } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { getUserProfile, createUserProfile, getRoleRedirectPath, findUserByIdNumber } from "@/lib/auth-utils"

export default function LoginPage() {
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { user } = useAuth()

  React.useEffect(() => {
    if (user) {
      router.push("/dashboard")
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      let emailToUse = loginId
      console.log("Login attempt with:", loginId)

      // 이메일 형식이 아닌 경우 (학번/교사번으로 추정)
      if (!loginId.includes("@")) {
        console.log("Not an email format, searching by ID number...")
        const userProfile = await findUserByIdNumber(loginId)
        console.log("Search result:", userProfile)

        if (userProfile) {
          emailToUse = userProfile.email
          console.log("Found email:", emailToUse)
        } else {
          console.log("No user found for ID:", loginId)
          setError(`등록되지 않은 학번/교사번입니다: ${loginId}`)
          setIsLoading(false)
          return
        }
      }

      console.log("Attempting login with email:", emailToUse)
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password)

      let userProfile = await getUserProfile(userCredential.user.uid)

      if (!userProfile) {
        try {
          userProfile = await createUserProfile(userCredential.user)
        } catch (profileError: any) {
          console.error("Profile creation failed:", profileError)

          if (profileError.message.includes("권한")) {
            setError("사용자 프로필 설정에 문제가 있습니다. 관리자에게 문의하세요.")
            router.push("/dashboard")
            return
          }

          throw profileError
        }
      }

      if (userProfile) {
        const redirectPath = getRoleRedirectPath(userProfile.role)
        router.push(redirectPath)
      } else {
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(getErrorMessage(error.code))
    } finally {
      setIsLoading(false)
    }
  }

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case "auth/user-not-found":
        return "등록되지 않은 계정입니다."
      case "auth/wrong-password":
        return "비밀번호가 올바르지 않습니다."
      case "auth/invalid-email":
        return "유효하지 않은 이메일 형식입니다."
      case "auth/too-many-requests":
        return "너무 많은 로그인 시��가 있었습니다. 잠시 후 다시 시도해주세요."
      case "auth/invalid-credential":
        return "학번/교사번 또는 비밀번호가 올바르지 않습니다."
      default:
        return "로그인 중 오류가 발생했습니다."
    }
  }

  const togglePasswordVisibility = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowPassword(!showPassword)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations - 포인터 이벤트 비활성화 및 낮은 z-index */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="w-full max-w-md relative z-20">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition-all duration-300 transform hover:scale-105 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            홈으로 돌아가기
          </Link>
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-4 shadow-2xl animate-pulse">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                덕영고등학교
              </h1>
              <p className="text-gray-600 font-medium">Learning Management System</p>
            </div>
          </div>
        </div>

        <Card className="backdrop-blur-xl bg-white/80 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in fade-in slide-in-from-bottom duration-700">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center justify-center">
              <LogIn className="h-6 w-6 mr-2 text-blue-600" />
              로그인
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">계정에 로그인하세요</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-in slide-in-from-top duration-300">
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="loginId" className="text-sm font-semibold text-gray-700">
                  발급 받은 학생/교사 이메일
                </Label>
                <Input
                  id="loginId"
                  type="text"
                  placeholder="로그인 ID 입력"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300 bg-white/70 backdrop-blur-sm"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
                  비밀번호
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pr-12 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300 bg-white/70 backdrop-blur-sm"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200 focus:outline-none z-10"
                    onClick={togglePasswordVisibility}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !loginId.trim() || !password.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    로그인 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    로그인
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 font-medium"
                >
                  비밀번호를 잊으셨나요?
                </Link>
              </div>

              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  계정이 없으신가요? <span className="text-blue-600 font-medium">관리자에게 문의하세요</span>
                </p>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
