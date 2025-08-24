"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, Copy, Eye, EyeOff, User, Mail, Key, GraduationCap, Sparkles } from "lucide-react"

interface AccountCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  accountInfo: any
}

export function AccountCreatedModal({ isOpen, onClose, accountInfo }: AccountCreatedModalProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [copied, setCopied] = React.useState<string | null>(null)

  if (!accountInfo) return null

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const togglePasswordVisibility = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowPassword(!showPassword)
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-gradient-to-r from-purple-500 to-indigo-500 text-white"
      case "teacher":
        return "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
      case "student":
        return "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "관리자"
      case "teacher":
        return "교사"
      case "student":
        return "학생"
      default:
        return role
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-2xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3 animate-pulse">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              계정 생성 완료
            </span>
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            새로운 계정이 성공적으로 생성되었습니다. 아래 정보를 사용자에게 전달해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 animate-in slide-in-from-top duration-300">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <div className="space-y-2">
                <p className="font-semibold">계정이 성공적으로 생성되었습니다!</p>
                <p className="text-sm">사용자에게 아래 로그인 정보를 안전하게 전달해주세요.</p>
              </div>
            </AlertDescription>
          </Alert>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <GraduationCap className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-800">{accountInfo.name}</CardTitle>
              <div className="flex items-center justify-center space-x-2 mt-2">
                <Badge className={`${getRoleBadgeColor(accountInfo.role)} rounded-full`}>
                  {getRoleLabel(accountInfo.role)}
                </Badge>
                {accountInfo.uniqueId && (
                  <Badge variant="outline" className="rounded-full">
                    {accountInfo.uniqueId}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* 기본 정보 */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">이름</p>
                      <p className="font-semibold text-gray-800">{accountInfo.name}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(accountInfo.name, "name")}
                    className="h-8 w-8 p-0 rounded-full hover:bg-blue-100"
                  >
                    <Copy className="h-4 w-4 text-blue-600" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">이메일</p>
                      <p className="font-semibold text-gray-800 font-mono">{accountInfo.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(accountInfo.email, "email")}
                    className="h-8 w-8 p-0 rounded-full hover:bg-green-100"
                  >
                    <Copy className="h-4 w-4 text-green-600" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <Key className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">임시 비밀번호</p>
                      <div className="flex items-center space-x-2">
                        <p className="font-semibold text-gray-800 font-mono">
                          {showPassword ? accountInfo.password : "••••••••"}
                        </p>
                        <button
                          type="button"
                          className="text-purple-600 hover:text-purple-700 transition-colors duration-200 focus:outline-none"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(accountInfo.password, "password")}
                    className="h-8 w-8 p-0 rounded-full hover:bg-purple-100"
                  >
                    <Copy className="h-4 w-4 text-purple-600" />
                  </Button>
                </div>
              </div>

              {/* 추가 정보 */}
              {accountInfo.role === "student" && accountInfo.grade && accountInfo.class && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-sm font-medium text-green-800 mb-2">학급 정보</p>
                  <p className="font-semibold text-green-900">
                    {accountInfo.grade}학년 {accountInfo.class}반
                  </p>
                </div>
              )}

              {accountInfo.role === "teacher" && accountInfo.teacherSubject && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm font-medium text-blue-800 mb-2">담당 과목</p>
                  <p className="font-semibold text-blue-900">{accountInfo.teacherSubject}</p>
                </div>
              )}

              {/* 복사 상태 표시 */}
              {copied && (
                <Alert className="border-green-200 bg-green-50 animate-in slide-in-from-top duration-300">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    {copied === "name" && "이름이 클립보드에 복사되었습니다."}
                    {copied === "email" && "이메일이 클립보드에 복사되었습니다."}
                    {copied === "password" && "비밀번호가 클립보드에 복사되었습니다."}
                  </AlertDescription>
                </Alert>
              )}

              {/* 안내 메시지 */}
              <Alert className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <div className="space-y-2">
                    <p className="font-semibold">중요 안내사항</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>임시 비밀번호는 첫 로그인 후 반드시 변경하도록 안내해주세요.</li>
                      <li>로그인 정보는 안전한 방법으로 사용자에게 전달해주세요.</li>
                      <li>계정 정보는 개인정보이므로 보안에 주의해주세요.</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-xl px-6"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
