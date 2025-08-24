"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users, UserPlus, Search, CheckCircle } from "lucide-react"
import { safeAddDoc, safeGetDocs } from "@/lib/firebase-utils"
import { collection, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"

interface ClassInfo {
  id: string
  name: string
  grade: string
  classNumber: string
  teacherId: string
  teacherName: string
  description?: string
  memberCount: number
}

interface ClassJoinProps {
  joinedClasses: string[]
  onClassJoined: () => void
}

export function ClassJoin({ joinedClasses, onClassJoined }: ClassJoinProps) {
  const { user, userProfile } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [availableClasses, setAvailableClasses] = useState<ClassInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const searchClasses = async () => {
    if (!userProfile) return

    setLoading(true)
    setError("")

    try {
      const classesRef = collection(db, "classes")
      let classQuery

      if (searchTerm.trim()) {
        // 검색어가 있으면 반 이름으로 검색
        classQuery = query(classesRef, where("name", ">=", searchTerm), where("name", "<=", searchTerm + "\uf8ff"))
      } else {
        // 학생의 학년에 맞는 반만 표시
        classQuery = query(classesRef, where("grade", "==", userProfile.grade || "1"))
      }

      const classes = await safeGetDocs<ClassInfo>(classQuery)

      // 이미 참가한 반은 제외
      const filteredClasses = classes.filter((cls) => !joinedClasses.includes(cls.id))

      setAvailableClasses(filteredClasses)
    } catch (error: any) {
      console.error("Error searching classes:", error)
      setError("반 검색 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const joinClass = async (classId: string, className: string) => {
    if (!user || !userProfile) return

    try {
      await safeAddDoc("classMembers", {
        classId,
        studentId: user.uid,
        studentName: userProfile.name,
        joinedAt: new Date(),
      })

      setSuccess(`${className}에 성공적으로 참가했습니다! 이제 반 페이지에서 과제와 퀴즈를 확인할 수 있습니다.`)
      onClassJoined()

      // 참가한 반을 목록에서 제거
      setAvailableClasses((classes) => classes.filter((cls) => cls.id !== classId))
    } catch (error: any) {
      console.error("Error joining class:", error)
      setError("반 참가 중 오류가 발생했습니다.")
    }
  }

  React.useEffect(() => {
    searchClasses()
  }, [userProfile])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />반 찾기 및 참가
          </CardTitle>
          <CardDescription>참가할 수 있는 반을 찾아 학습을 시작하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">반 이름으로 검색</Label>
              <Input
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="예: 1학년 1반, 2학년 3반"
                onKeyPress={(e) => e.key === "Enter" && searchClasses()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={searchClasses} disabled={loading}>
                {loading ? "검색 중..." : "검색"}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {availableClasses.map((classInfo) => (
              <div
                key={classInfo.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-lg">{classInfo.name}</h4>
                    <div className="flex items-center space-x-3 mt-1">
                      <Badge variant="outline">
                        {classInfo.grade}학년 {classInfo.classNumber}반
                      </Badge>
                      <span className="text-sm text-gray-600">담당교사: {classInfo.teacherName}</span>
                    </div>
                    {classInfo.description && <p className="text-sm text-gray-500 mt-1">{classInfo.description}</p>}
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      {classInfo.memberCount}명 참가
                    </div>
                  </div>
                  <Button size="sm" onClick={() => joinClass(classInfo.id, classInfo.name)} className="px-6">
                    <UserPlus className="h-4 w-4 mr-2" />
                    참가하기
                  </Button>
                </div>
              </div>
            ))}

            {availableClasses.length === 0 && !loading && (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">참가할 수 있는 반이 없습니다</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm ? "검색 조건에 맞는 반이 없습니다." : "현재 학년에 개설된 반이 없습니다."}
                </p>
                <p className="text-sm text-gray-500">다른 검색어로 시도해보거나 담당 교사에게 문의하세요.</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-500">반을 검색하는 중...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 참가 안내 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">반 참가 안내</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p>
                <strong>반 참가 후</strong> 해당 반의 과제와 퀴즈에 접근할 수 있습니다.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p>
                <strong>반 페이지</strong>에서 과제 제출, 퀴즈 응시, 반원 확인이 가능합니다.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
              <p>
                <strong>여러 반</strong>에 동시에 참가할 수 있습니다.
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
              <p className="text-orange-700">
                <strong>주의:</strong> 반에서 나가려면 담당 교사에게 문의하세요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
