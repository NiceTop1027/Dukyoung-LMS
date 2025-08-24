"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, UserPlus, Clock, CheckCircle, XCircle, AlertTriangle, Users, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { safeAddDoc, safeGetDocs } from "@/lib/firebase-utils"
import { usePollingData } from "@/hooks/use-polling-data"

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

interface ClassMember {
  id: string
  classId: string
  memberId: string
  memberName: string
  memberRole: "student" | "teacher"
  joinedAt: Date
}

export function ClassJoinRequest() {
  const { user, userProfile } = useAuth()
  const [searchCode, setSearchCode] = useState("")
  const [foundClass, setFoundClass] = useState<ClassInfo | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 내가 보낸 참가 요청들
  const myRequestsRef = user ? query(collection(db, "classJoinRequests"), where("requesterId", "==", user.uid)) : null
  const { data: myRequests, refresh: refreshRequests } = usePollingData<JoinRequest>(myRequestsRef)

  // 내가 참가한 반들
  const myMembershipsRef = user ? query(collection(db, "classMembers"), where("memberId", "==", user.uid)) : null
  const { data: myMemberships } = usePollingData<ClassMember>(myMembershipsRef)

  const handleSearchClass = async () => {
    if (!searchCode.trim()) {
      setError("반 코드를 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")
    setIsSearching(true)
    setFoundClass(null)

    try {
      console.log("Searching for class with code:", searchCode.trim().toUpperCase())

      // 모든 반을 가져와서 클라이언트에서 필터링
      const classesRef = collection(db, "classes")
      const allClasses = await safeGetDocs<ClassInfo>(classesRef)

      console.log("All classes found:", allClasses.length)
      console.log("Available class codes:", allClasses.map((c) => c.classCode).filter(Boolean))

      const targetClass = allClasses.find((cls) => cls.classCode === searchCode.trim().toUpperCase())

      if (targetClass) {
        console.log("Found class:", targetClass)
        setFoundClass(targetClass)
      } else {
        console.log("No class found with code:", searchCode.trim().toUpperCase())
        setError("해당 반 코드를 찾을 수 없습니다. 반 코드를 다시 확인해주세요.")

        // 개발 모드에서 사용 가능한 반 코드 표시
        if (process.env.NODE_ENV === "development" && allClasses.length > 0) {
          const availableCodes = allClasses.map((c) => c.classCode).filter(Boolean)
          if (availableCodes.length > 0) {
            setError(`해당 반 코드를 찾을 수 없습니다. 사용 가능한 반 코드: ${availableCodes.join(", ")}`)
          }
        }
      }
    } catch (error: any) {
      console.error("Error searching for class:", error)
      setError("반 검색 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"))
    } finally {
      setIsSearching(false)
    }
  }

  const handleRequestJoin = async () => {
    if (!foundClass || !user || !userProfile) {
      setError("로그인이 필요합니다.")
      return
    }

    // 이미 멤버인지 확인
    const isAlreadyMember = myMemberships?.some((membership) => membership.classId === foundClass.id)
    if (isAlreadyMember) {
      setError("이미 이 반에 참가하고 있습니다.")
      return
    }

    // 이미 요청을 보냈는지 확인 (대기중인 요청만)
    const existingPendingRequest = myRequests?.find(
      (request) => request.classId === foundClass.id && request.status === "pending",
    )
    if (existingPendingRequest) {
      setError("이미 이 반에 참가 요청을 보냈습니다.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const requestData = {
        classId: foundClass.id,
        className: foundClass.name,
        requesterId: user.uid,
        requesterName: userProfile.name,
        requesterRole: userProfile.role,
        teacherId: foundClass.teacherId,
        status: "pending" as const,
        requestedAt: new Date(),
      }

      console.log("Sending join request:", requestData)
      await safeAddDoc("classJoinRequests", requestData)

      setSuccess("참가 요청을 보냈습니다. 교사의 승인을 기다려주세요.")
      setFoundClass(null)
      setSearchCode("")
      refreshRequests()
    } catch (error: any) {
      console.error("Error requesting to join class:", error)
      setError("참가 요청 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"))
    }
  }

  const handleRetryRequest = async (classId: string, className: string) => {
    if (!user || !userProfile) {
      setError("로그인이 필요합니다.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const requestData = {
        classId: classId,
        className: className,
        requesterId: user.uid,
        requesterName: userProfile.name,
        requesterRole: userProfile.role,
        teacherId: myRequests?.find((req) => req.classId === classId)?.teacherId || "",
        status: "pending" as const,
        requestedAt: new Date(),
      }

      console.log("Retrying join request:", requestData)
      await safeAddDoc("classJoinRequests", requestData)

      setSuccess("참가 요청을 다시 보냈습니다. 교사의 승인을 기다려주세요.")
      refreshRequests()
    } catch (error: any) {
      console.error("Error retrying join request:", error)
      setError("참가 요청 재전송 중 오류가 발생했습니다: " + (error.message || "알 수 없는 오류"))
    }
  }

  const getRequestStatus = (classId: string) => {
    return myRequests?.find((request) => request.classId === classId)
  }

  const isAlreadyMember = (classId: string) => {
    return myMemberships?.some((membership) => membership.classId === classId)
  }

  const canRetryRequest = (classId: string) => {
    const latestRequest = myRequests
      ?.filter((request) => request.classId === classId)
      ?.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())[0]

    return latestRequest?.status === "rejected"
  }

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md bg-gradient-to-br from-blue-50 to-purple-50 border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">로그인 필요</h3>
            <p className="text-gray-600">반 참가 기능을 사용하려면 로그인이 필요합니다.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 반 검색 */}
      <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardHeader className="relative">
          <CardTitle className="flex items-center text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
              <Search className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              반 참가하기
            </span>
          </CardTitle>
          <CardDescription className="text-gray-600">반 코드를 입력하여 반에 참가 요청을 보내세요</CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-6">
          {error && (
            <Alert
              variant="destructive"
              className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl animate-in slide-in-from-top duration-300"
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl animate-in slide-in-from-top duration-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="flex space-x-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="classCode" className="text-sm font-medium text-gray-700">
                반 코드
              </Label>
              <Input
                id="classCode"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="6자리 반 코드를 입력하세요 (예: 123456)"
                maxLength={6}
                className="font-mono text-lg text-center rounded-xl border-gray-200 focus:border-blue-400 focus:ring-blue-400 transition-all duration-300"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleSearchClass}
                disabled={isSearching || !searchCode.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:transform-none"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    검색
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 검색 결과 */}
          {foundClass && (
            <Card className="border-0 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg animate-in slide-in-from-bottom duration-500">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="ring-4 ring-blue-200">
                      <AvatarFallback className="bg-gradient-to-r from-blue-400 to-indigo-400 text-white text-lg">
                        {foundClass.teacherName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">{foundClass.name}</h4>
                      <div className="flex items-center space-x-3 text-sm text-gray-600 mt-1">
                        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-3 py-1">
                          {foundClass.grade}학년 {foundClass.classNumber}반
                        </Badge>
                        <span>•</span>
                        <span>담당교사: {foundClass.teacherName}</span>
                        <span>•</span>
                        <span>멤버: {foundClass.memberCount}명</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        생성일: {new Date(foundClass.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div>
                    {isAlreadyMember(foundClass.id) ? (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-4 py-2">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        참가중
                      </Badge>
                    ) : getRequestStatus(foundClass.id)?.status === "pending" ? (
                      <Badge variant="secondary" className="rounded-full px-4 py-2">
                        <Clock className="h-4 w-4 mr-2" />
                        요청 대기중
                      </Badge>
                    ) : (
                      <Button
                        onClick={handleRequestJoin}
                        className="rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 py-2 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        참가 요청
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* 내 참가 요청 목록 */}
      <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl hover:shadow-2xl transition-all duration-500">
        <CardHeader className="relative">
          <CardTitle className="flex items-center text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
              <Users className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              내 참가 요청
            </span>
          </CardTitle>
          <CardDescription className="text-gray-600">보낸 참가 요청들의 상태를 확인할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            {myRequests
              .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
              .map((request, index) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100 hover:shadow-lg transition-all duration-300 animate-in slide-in-from-left"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div>
                    <h4 className="font-semibold text-gray-800">{request.className}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      요청일: {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                    {request.respondedAt && (
                      <p className="text-sm text-gray-600">
                        응답일: {new Date(request.respondedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {request.status === "pending" && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full px-4 py-2 animate-pulse">
                        <Clock className="h-4 w-4 mr-2" />
                        대기중
                      </Badge>
                    )}
                    {request.status === "approved" && (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-4 py-2">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        승인됨
                      </Badge>
                    )}
                    {request.status === "rejected" && (
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full px-4 py-2">
                          <XCircle className="h-4 w-4 mr-2" />
                          거절됨
                        </Badge>
                        {canRetryRequest(request.classId) && (
                          <Button
                            size="sm"
                            onClick={() => handleRetryRequest(request.classId, request.className)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-full px-3 py-1 text-xs transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            다시 요청
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
