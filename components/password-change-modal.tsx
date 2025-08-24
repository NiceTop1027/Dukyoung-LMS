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
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth"
import { useAuth } from "@/contexts/auth-context"
import { validatePasswordStrength } from "@/lib/password-utils"
import { Key, AlertTriangle, CheckCircle } from "lucide-react"

interface PasswordChangeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PasswordChangeModal({ isOpen, onClose }: PasswordChangeModalProps) {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

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

      // 현재 비밀번호로 재인증
      const credential = EmailAuthProvider.credential(user.email!, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // 비밀번호 업데이트
      await updatePassword(user, newPassword)

      setSuccess("비밀번호가 성공적으로 변경되었습니다.")

      // 폼 초기화
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      // 2초 후 모달 닫기
      setTimeout(() => {
        onClose()
        setSuccess("")
      }, 2000)
    } catch (error: any) {
      console.error("Password change error:", error)

      if (error.code === "auth/wrong-password") {
        setError("현재 비밀번호가 올바르지 않습니다.")
      } else if (error.code === "auth/weak-password") {
        setError("새 비밀번호가 너무 약합니다.")
      } else if (error.code === "auth/requires-recent-login") {
        setError("보안을 위해 다시 로그인한 후 비밀번호를 변경해주세요.")
      } else {
        setError("비밀번호 변경 중 오류가 발생했습니다.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setError("")
    setSuccess("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Key className="h-5 w-5 mr-2" />
            비밀번호 변경
          </DialogTitle>
          <DialogDescription>보안을 위해 정기적으로 비밀번호를 변경하는 것을 권장합니다.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handlePasswordChange}>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500">최소 6자, 대소문자, 숫자 포함</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
