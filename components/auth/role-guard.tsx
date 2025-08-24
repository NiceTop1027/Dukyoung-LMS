"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import type { UserRole } from "@/lib/auth-utils"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackPath?: string
}

export function RoleGuard({ children, allowedRoles, fallbackPath = "/login" }: RoleGuardProps) {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(fallbackPath)
        return
      }

      if (userProfile && !allowedRoles.includes(userProfile.role)) {
        router.push(fallbackPath)
        return
      }
    }
  }, [user, userProfile, loading, allowedRoles, fallbackPath, router])

  // 로딩 중
  if (loading || !user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">권한을 확인하는 중...</p>
        </div>
      </div>
    )
  }

  // 권한 없음
  if (!allowedRoles.includes(userProfile.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-4">
            {allowedRoles.includes("admin") && "관리자만 접근할 수 있는 페이지입니다."}
            {allowedRoles.includes("teacher") &&
              !allowedRoles.includes("admin") &&
              "교사만 접근할 수 있는 페이지입니다."}
            {allowedRoles.includes("student") &&
              !allowedRoles.includes("teacher") &&
              !allowedRoles.includes("admin") &&
              "학생만 접근할 수 있는 페이지입니다."}
          </p>
          <Button onClick={() => router.push("/login")}>로그인 페이지로 이동</Button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
