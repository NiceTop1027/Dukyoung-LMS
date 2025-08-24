"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  GraduationCap,
  Users,
  CheckCircle,
  AlertTriangle,
  Edit,
  Trash2,
  Search,
  UserPlus,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  X,
} from "lucide-react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { type UserProfile, updateUserProfile, deleteUserProfile } from "@/lib/auth-utils"
import { UserCreationModal } from "./user-creation-modal"
import { generateRandomPassword } from "@/lib/password-utils"

interface UserManagementModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UserManagementModal({ isOpen, onClose }: UserManagementModalProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher" | "admin">("all")
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")

  // 사용자 목록 로드
  const loadUsers = async () => {
    setLoading(true)
    setError("")
    try {
      const usersRef = collection(db, "users")
      const usersQuery = query(usersRef, orderBy("createdAt", "desc"), limit(100))
      const snapshot = await getDocs(usersQuery)

      const usersList: UserProfile[] = []
      snapshot.forEach((doc) => {
        const userData = doc.data()
        usersList.push({
          ...userData,
          createdAt: userData.createdAt?.toDate() || new Date(),
          updatedAt: userData.updatedAt?.toDate() || new Date(),
        } as UserProfile)
      })

      setUsers(usersList)
      setFilteredUsers(usersList)
    } catch (error: any) {
      console.error("Error loading users:", error)
      setError("사용자 목록을 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  // 사용자 필터링
  useEffect(() => {
    let filtered = users

    // 검색어 필터
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.uniqueId?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // 역할 필터
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, roleFilter])

  // 모달이 열릴 때 사용자 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  // 사용자 수정
  const handleEditUser = async (updatedUser: UserProfile) => {
    try {
      setError("")
      setSuccess("")

      const updateData: Partial<UserProfile> = {
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        uniqueId: updatedUser.uniqueId,
        updatedAt: new Date(),
      }

      // 역할별 추가 데이터
      if (updatedUser.role === "student") {
        updateData.grade = updatedUser.grade
        updateData.class = updatedUser.class
        updateData.userId = updatedUser.uniqueId
        updateData.studentId = updatedUser.uniqueId
      } else if (updatedUser.role === "teacher") {
        updateData.teacherSubject = updatedUser.teacherSubject
        updateData.userId = updatedUser.uniqueId
        updateData.teacherId = updatedUser.uniqueId
      }

      await updateUserProfile(updatedUser.uid, updateData)

      // 로컬 상태 업데이트
      setUsers((prev) => prev.map((user) => (user.uid === updatedUser.uid ? { ...user, ...updateData } : user)))

      setEditingUser(null)
      setSuccess("사용자 정보가 성공적으로 수정되었습니다.")
    } catch (error: any) {
      console.error("Error updating user:", error)
      setError("사용자 정보 수정에 실패했습니다: " + error.message)
    }
  }

  // 사용자 삭제
  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`정말로 ${user.name} 사용자를 삭제하시겠습니까?`)) {
      return
    }

    try {
      setError("")
      setSuccess("")

      await deleteUserProfile(user.uid)

      // 로컬 상태에서 제거
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      setSuccess("사용자가 성공적으로 삭제되었습니다.")
    } catch (error: any) {
      console.error("Error deleting user:", error)
      setError("사용자 삭제에 실패했습니다: " + error.message)
    }
  }

  // 비밀번호 재설정
  const handleResetPassword = async (user: UserProfile) => {
    try {
      setError("")
      setSuccess("")

      const password = newPassword || generateRandomPassword()

      // 실제 환경에서는 Firebase Admin SDK를 사용해야 합니다
      // 여기서는 UI만 구현
      setSuccess(`${user.name}의 새 비밀번호: ${password}`)
      setNewPassword("")
    } catch (error: any) {
      console.error("Error resetting password:", error)
      setError("비밀번호 재설정에 실패했습니다.")
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <User className="h-4 w-4" />
      case "teacher":
        return <Users className="h-4 w-4" />
      case "student":
        return <GraduationCap className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500"
      case "teacher":
        return "bg-blue-500"
      case "student":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "관리자"
      case "teacher":
        return "교사"
      case "student":
        return "학생"
      default:
        return "알 수 없음"
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center text-2xl font-bold">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center mr-4 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                사용자 관리
              </span>
            </DialogTitle>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="list" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="list">사용자 목록</TabsTrigger>
              <TabsTrigger value="create">새 사용자 생성</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-6">
              {/* 검색 및 필터 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Search className="h-5 w-5 mr-2" />
                    검색 및 필터
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <Label htmlFor="search">검색</Label>
                      <Input
                        id="search"
                        placeholder="이름, 이메일, ID로 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <Label htmlFor="roleFilter">역할 필터</Label>
                      <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">전체</SelectItem>
                          <SelectItem value="admin">관리자</SelectItem>
                          <SelectItem value="teacher">교사</SelectItem>
                          <SelectItem value="student">학생</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 사용자 목록 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      사용자 목록 ({filteredUsers.length}명)
                    </span>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />새 사용자 추가
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                      <span className="ml-2">사용자 목록을 불러오는 중...</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>사용자가 없습니다.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.uid}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              {getRoleIcon(user.role)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">{user.name}</h3>
                                <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                                  {getRoleText(user.role)}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <p className="text-xs text-gray-500">ID: {user.uniqueId}</p>
                              {user.role === "student" && user.grade && user.class && (
                                <p className="text-xs text-gray-500">
                                  {user.grade}학년 {user.class}반
                                </p>
                              )}
                              {user.role === "teacher" && user.teacherSubject && (
                                <p className="text-xs text-gray-500">담당: {user.teacherSubject}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="h-5 w-5 mr-2" />새 사용자 생성
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-lg"
                  >
                    <UserPlus className="h-6 w-6 mr-2" />새 사용자 계정 생성하기
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 사용자 편집 모달 */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                사용자 정보 수정
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleEditUser(editingUser)
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editName">이름</Label>
                  <Input
                    id="editName"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="editEmail">이메일</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editRole">역할</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value: any) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">관리자</SelectItem>
                      <SelectItem value="teacher">교사</SelectItem>
                      <SelectItem value="student">학생</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editUniqueId">고유 ID</Label>
                  <Input
                    id="editUniqueId"
                    value={editingUser.uniqueId}
                    onChange={(e) => setEditingUser({ ...editingUser, uniqueId: e.target.value })}
                    required
                  />
                </div>
              </div>

              {editingUser.role === "student" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="editGrade">학년</Label>
                    <Select
                      value={editingUser.grade || ""}
                      onValueChange={(value) => setEditingUser({ ...editingUser, grade: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="학년 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1학년</SelectItem>
                        <SelectItem value="2">2학년</SelectItem>
                        <SelectItem value="3">3학년</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editClass">반</Label>
                    <Select
                      value={editingUser.class || ""}
                      onValueChange={(value) => setEditingUser({ ...editingUser, class: value })}
                    >
                      <SelectTrigger>
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
              )}

              {editingUser.role === "teacher" && (
                <div>
                  <Label htmlFor="editTeacherSubject">담당 과목</Label>
                  <Input
                    id="editTeacherSubject"
                    value={editingUser.teacherSubject || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, teacherSubject: e.target.value })}
                    placeholder="담당 과목을 입력하세요"
                  />
                </div>
              )}

              <Separator />

              <div className="space-y-4">
                <h4 className="font-semibold">비밀번호 재설정</h4>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 (비워두면 자동 생성)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setNewPassword(generateRandomPassword())}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" onClick={() => handleResetPassword(editingUser)}>
                    재설정
                  </Button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  <X className="h-4 w-4 mr-2" />
                  취소
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  저장
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* 사용자 생성 모달 */}
      <UserCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onUserCreated={(userInfo) => {
          // 새로 생성된 사용자를 목록에 추가
          const newUser: UserProfile = {
            uid: userInfo.uid,
            email: userInfo.email,
            name: userInfo.name,
            role: userInfo.role,
            uniqueId: userInfo.uniqueId,
            createdAt: userInfo.createdAt,
            updatedAt: userInfo.updatedAt,
            ...(userInfo.role === "student" && {
              grade: userInfo.grade,
              class: userInfo.class,
              userId: userInfo.userId,
              studentId: userInfo.studentId,
            }),
            ...(userInfo.role === "teacher" && {
              teacherSubject: userInfo.teacherSubject,
              userId: userInfo.userId,
              teacherId: userInfo.teacherId,
            }),
          }
          setUsers((prev) => [newUser, ...prev])
          setShowCreateModal(false)
        }}
      />
    </>
  )
}
