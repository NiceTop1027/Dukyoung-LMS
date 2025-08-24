"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Key, AlertTriangle, CheckCircle, Eye, EyeOff, Copy } from "lucide-react"
import type { UserProfile } from "@/lib/auth-utils"
import { generateRandomPassword, validatePasswordStrength } from "@/lib/password-utils"
import { auth } from "@/lib/firebase"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface AdminPasswordManagerProps {
  user: UserProfile | null
  isOpen: boolean
  onClose: () => void
  onPasswordChanged: (newPassword: string) => void
}

export function AdminPasswordManager({ user, isOpen, onClose, onPasswordChanged }: AdminPasswordManagerProps) {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState("")

  const handleGeneratePassword = () => {
    const generated = generateRandomPassword(8)
    setNewPassword(generated)
    setConfirmPassword(generated)
    setGeneratedPassword(generated)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // 간단한 피드백
    } catch (err) {
      console.error("클립보드 복사 실패:", err)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      // 비밀번호 확인
      if (newPassword !== confirmPassword) {
        setError("새 비밀번호가 일치하지 않습니다.")
        setIsLoading(false)
        return
      }

      // 비밀번호 강도 검사
      const validation = validatePasswordStrength(newPassword)
      if (!validation.isValid) {
        setError(validation.errors.join(" "))
        setIsLoading(false)
        return
      }

      // 현재 관리자 사용자 정보 저장
      const currentUser = auth.currentUser
      if (!currentUser) {
        setError("관리자 인증이 필요합니다.")
        setIsLoading(false)
        return
      }

      // 학생 계정으로 임시 로그인 (기존 비밀번호 필요)
      // 실제로는 Firebase Admin SDK 없이는 다른 사용자 비밀번호를 직접 변경할 수 없음
      // 대신 Firestore에 비밀번호 변경 요청을 저장

      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        passwordChangeRequest: {
          newPassword: newPassword,
          requestedBy: currentUser.uid,
          requestedAt: new Date(),
          status: "pending",
        },
        forcePasswordChange: true,
      })

      setSuccess(
        `${user.name}님의 비밀번호 변경 요청이 등록되었습니다. 학생이 다음 로그인 시 새 비밀번호로 변경됩니다.`,
      )
      onPasswordChanged(newPassword)

      // 3초 후 모달 닫기
      setTimeout(() => {
        onClose()
        setNewPassword("")
        setConfirmPassword("")
        setSuccess("")
        setGeneratedPassword("")
      }, 3000)
    } catch (error: any) {
      console.error("Password change error:", error)
      setError("비밀번호 변경 요청 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    setSuccess("")
    setGeneratedPassword("")
    onClose()
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            비밀번호 변경
          </DialogTitle>
          <DialogDescription>관리자 권한으로 사용자의 비밀번호를 변경합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 사용자 정보 */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-blue-500 text-white font-semibold">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-gray-900">{user.name}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant={user.role === "teacher" ? "secondary" : "default"} className="text-xs">
                    {user.role === "teacher" ? "교사" : "학생"}
                  </Badge>
                  {user.userId && (
                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">ID: {user.userId}</span>
                  )}
                </div>
                {user.role === "student" && user.grade && user.class && (
                  <p className="text-xs text-gray-500 mt-1">
                    {user.grade}학년 {user.class}반
                  </p>
                )}
                {user.role === "teacher" && user.teacherSubject && (
                  <p className="text-xs text-gray-500 mt-1">{user.teacherSubject}</p>
                )}
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="newPassword" className="text-sm font-medium">
                  새 비밀번호
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePassword}
                  className="h-8 text-xs bg-transparent"
                >
                  자동 생성
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1 hover:bg-gray-100"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">최소 6자, 대소문자, 숫자 포함 권장</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">
                새 비밀번호 확인
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {generatedPassword && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">생성된 비밀번호</p>
                    <p className="text-sm text-yellow-700 font-mono">{generatedPassword}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedPassword)}
                    className="text-yellow-700 hover:text-yellow-800"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>중요:</strong> 변경된 비밀번호를 학생에게 안전하게 전달해주세요. 학생이 다음 로그인 시 새
                비밀번호를 사용해야 합니다.
              </AlertDescription>
            </Alert>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
                className="flex-1 bg-transparent"
              >
                취소
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>처리 중...</span>
                  </div>
                ) : (
                  "비밀번호 변경"
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
