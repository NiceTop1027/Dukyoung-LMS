"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, ArrowLeft, Mail, Phone, MessageCircle, CheckCircle, Sparkles } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // 시뮬레이션: 실제로는 관리자에게 알림을 보내는 로직
    setTimeout(() => {
      setIsSubmitted(true)
      setIsLoading(false)
    }, 2000)
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          <Card className="backdrop-blur-xl bg-white/80 border-0 shadow-2xl animate-in fade-in slide-in-from-bottom duration-700">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-2xl animate-bounce">
                <CheckCircle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                요청이 전송되었습니다
              </CardTitle>
              <CardDescription className="text-gray-600 font-medium">관리자가 확인 후 연락드리겠습니다</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <div className="space-y-2">
                    <p className="font-semibold">비밀번호 재설정 요청이 접수되었습니다.</p>
                    <p className="text-sm">관리자가 확인 후 1-2일 내에 연락드리겠습니다.</p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  요청하신 이메일: <span className="font-semibold text-gray-800">{email}</span>
                </p>
                <p className="text-sm text-gray-500">급한 경우 아래 연락처로 직접 문의해주세요.</p>
              </div>

              {/* 연락처 정보 */}
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <Phone className="h-5 w-5 text-blue-600 mr-3" />
                  <div>
                    <p className="font-semibold text-blue-800">전화</p>
                    <p className="text-blue-700">02-1234-5678</p>
                  </div>
                </div>

                <div className="flex items-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                  <Mail className="h-5 w-5 text-purple-600 mr-3" />
                  <div>
                    <p className="font-semibold text-purple-800">이메일</p>
                    <p className="text-purple-700">admin@deokyoung.hs.kr</p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Link href="/login" className="w-full">
                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  로그인 페이지로 돌아가기
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top duration-700">
          <Link
            href="/login"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 mb-6 transition-all duration-300 transform hover:scale-105 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
            로그인으로 돌아가기
          </Link>
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mr-4 shadow-2xl animate-pulse">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                덕영고등학교
              </h1>
              <p className="text-gray-600 font-medium">비밀번호 재설정</p>
            </div>
          </div>
        </div>

        <Card className="backdrop-blur-xl bg-white/80 border-0 shadow-2xl hover:shadow-3xl transition-all duration-500 animate-in fade-in slide-in-from-bottom duration-700">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent flex items-center justify-center">
              <Mail className="h-6 w-6 mr-2 text-orange-600" />
              비밀번호 재설정
            </CardTitle>
            <CardDescription className="text-gray-600 font-medium">
              관리자에게 비밀번호 재설정을 요청하세요
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
                <MessageCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="space-y-2">
                    <p className="font-semibold">비밀번호 재설정 안내</p>
                    <p className="text-sm">
                      보안상의 이유로 비밀번호 재설정은 관리자가 직접 처리합니다. 요청 후 1-2일 내에 연락드리겠습니다.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  이메일 주소
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="등록된 이메일 주소를 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:ring-orange-400 transition-all duration-300 bg-white/70 backdrop-blur-sm"
                  required
                  disabled={isLoading}
                />
              </div>

              {/* 연락처 정보 */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">관리자 연락처</p>

                <div className="grid grid-cols-1 gap-3">
                  <div className="flex items-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                    <Phone className="h-4 w-4 text-blue-600 mr-3" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">전화</p>
                      <p className="text-blue-700">02-1234-5678</p>
                    </div>
                  </div>

                  <div className="flex items-center p-3 bg-purple-50 rounded-xl border border-purple-200">
                    <Mail className="h-4 w-4 text-purple-600 mr-3" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-800">이메일</p>
                      <p className="text-purple-700">admin@deokyoung.hs.kr</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-6">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    요청 전송 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    재설정 요청하기
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-orange-600 hover:text-orange-700 hover:underline transition-all duration-300 font-medium"
                >
                  로그인 페이지로 돌아가기
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
