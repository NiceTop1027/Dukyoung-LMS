"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  User,
  Lock,
  AlertCircle,
  CheckCircle,
  Copy,
  Mail,
  UserCheck,
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Shield,
  Camera,
  Upload,
  X,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { updateUserProfile } from "@/lib/auth-utils"
import { uploadFile } from "@/lib/storage-utils"
import { PasswordChangeModal } from "./password-change-modal"

interface ProfileSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onProfileUpdated?: () => void
}

export function ProfileSettingsModal({ isOpen, onClose, onProfileUpdated }: ProfileSettingsModalProps) {
  const { user, userProfile } = useAuth()
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingProfile, setIsUploadingProfile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 프로필 정보 상태
  const [profileData, setProfileData] = useState({
    name: userProfile?.name || "",
    grade: userProfile?.grade || "",
    class: userProfile?.class || "",
    teacherSubject: userProfile?.teacherSubject || "",
    profileImageUrl: userProfile?.profileImageUrl || "",
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !userProfile) return

    setError("")
    setSuccess("")
    setIsLoading(true)

    try {
      const updates: any = {
        updatedAt: new Date(),
      }

      // 모든 사용자가 이름과 프로필 이미지를 수정할 수 있음
      updates.name = profileData.name

      // 프로필 이미지 URL 업데이트
      if (profileData.profileImageUrl !== userProfile.profileImageUrl) {
        updates.profileImageUrl = profileData.profileImageUrl
      }

      // 교사는 자신의 담당 과목을 수정할 수 있음, 관리자는 모든 교사 정보 수정 가능
      if (userProfile.role === "teacher" || userProfile.role === "admin") {
        if (profileData.teacherSubject !== userProfile.teacherSubject) {
          updates.teacherSubject = profileData.teacherSubject
        }
      }

      // 관리자는 학생 정보를 수정할 수 있음
      if (userProfile.role === "admin") {
        if (profileData.grade !== userProfile.grade) {
          updates.grade = profileData.grade
        }
        if (profileData.class !== userProfile.class) {
          updates.class = profileData.class
        }
      }

      console.log("Updating profile with:", updates)
      await updateUserProfile(user.uid, updates)

      setSuccess("프로필이 성공적으로 업데이트되었습니다.")

      // onProfileUpdated가 함수인지 확인하고 호출
      if (typeof onProfileUpdated === "function") {
        onProfileUpdated()
      }
    } catch (error: any) {
      console.error("Error updating profile:", error)
      setError(error.message || "프로필 업데이트 중 오류가 발생했습니다.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileImageUpload = async (file: File) => {
    if (!user) return

    setIsUploadingProfile(true)
    setError("")

    try {
      // 파일 크기 체크 (5MB 제한)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error("파일 크기는 5MB 이하여야 합니다.")
      }

      // 이미지 파일 타입 체크
      if (!file.type.startsWith("image/")) {
        throw new Error("이미지 파일만 업로드할 수 있습니다.")
      }

      const uploadedFile = await uploadFile(file, `files/${user.uid}`)

      setProfileData((prev) => ({
        ...prev,
        profileImageUrl: uploadedFile.url,
      }))

      setSuccess("프로필 이미지가 업로드되었습니다. '프로필 업데이트' 버튼을 눌러 저장하세요.")
    } catch (error: any) {
      console.error("Profile image upload error:", error)
      setError(error.message || "프로필 이미지 업로드 중 오류가 발생했습니다.")
    } finally {
      setIsUploadingProfile(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleProfileImageUpload(file)
    }
  }

  const handleRemoveProfileImage = () => {
    setProfileData((prev) => ({
      ...prev,
      profileImageUrl: "",
    }))
    setSuccess("프로필 이미지가 제거되었습니다. '프로필 업데이트' 버튼을 눌러 저장하세요.")
  }

  const handleCopyUniqueId = () => {
    if (userProfile?.uniqueId) {
      navigator.clipboard.writeText(userProfile.uniqueId)
      setSuccess("고유 ID가 클립보드에 복사되었습니다.")
      setTimeout(() => setSuccess(""), 2000)
    }
  }

  // 기본 프로필 정보는 모든 사용자가 수정 가능
  const canEditBasicProfile = true
  // 학생 정보는 관리자만 수정 가능
  const canEditStudentInfo = userProfile?.role === "admin"
  // 교사 정보는 교사 본인과 관리자만 수정 가능
  const canEditTeacherInfo = userProfile?.role === "teacher" || userProfile?.role === "admin"

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "teacher":
        return "secondary"
      default:
        return "default"
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" />
      case "teacher":
        return <BookOpen className="h-4 w-4" />
      default:
        return <GraduationCap className="h-4 w-4" />
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case "admin":
        return "관리자"
      case "teacher":
        return "교사"
      default:
        return "학생"
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-6">
            <DialogTitle className="flex items-center text-2xl font-bold">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              프로필 설정
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              개인정보를 확인하고 계정 설정을 관리할 수 있습니다
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
              <TabsTrigger value="profile" className="flex items-center space-x-2 text-sm font-medium">
                <User className="h-4 w-4" />
                <span>프로필 정보</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center space-x-2 text-sm font-medium">
                <Lock className="h-4 w-4" />
                <span>보안 설정</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              {/* 알림 메시지 */}
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="font-medium text-green-800">{success}</AlertDescription>
                </Alert>
              )}

              {/* 프로필 이미지 섹션 */}
              <Card className="shadow-sm border-0 bg-gradient-to-br from-purple-50 to-pink-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold flex items-center">
                    <Camera className="h-5 w-5 mr-2 text-purple-600" />
                    프로필 이미지
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    프로필 사진을 업로드하여 개성을 표현해보세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    {/* 프로필 이미지 미리보기 */}
                    <div className="relative">
                      <Avatar className="w-32 h-32 ring-4 ring-purple-200 shadow-lg">
                        {profileData.profileImageUrl ? (
                          <AvatarImage
                            src={profileData.profileImageUrl || "/placeholder.svg"}
                            alt="프로필 이미지"
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <AvatarFallback className="text-4xl bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                            {userProfile?.name?.charAt(0) ?? "?"}
                          </AvatarFallback>
                        )}
                      </Avatar>

                      {/* 이미지 제거 버튼 */}
                      {profileData.profileImageUrl && (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={handleRemoveProfileImage}
                          className="absolute -top-2 -right-2 w-8 h-8 rounded-full p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* 업로드 버튼들 */}
                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingProfile}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        {isUploadingProfile ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            업로드 중...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            이미지 업로드
                          </>
                        )}
                      </Button>
                    </div>

                    {/* 파일 입력 */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* 업로드 안내 */}
                    <div className="text-center">
                      <p className="text-sm text-gray-500">JPG, PNG, GIF 파일을 업로드할 수 있습니다</p>
                      <p className="text-xs text-gray-400">최대 파일 크기: 5MB</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 기본 정보 카드 */}
              <Card className="shadow-sm border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold flex items-center">
                    <UserCheck className="h-5 w-5 mr-2 text-blue-600" />
                    기본 정보
                  </CardTitle>
                  <CardDescription className="text-gray-600">프로필 정보를 수정할 수 있습니다</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-6">
                    {/* 고유 ID */}
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700 flex items-center">
                        <Copy className="h-4 w-4 mr-2" />
                        고유 ID
                      </Label>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 p-3 bg-white border-2 border-gray-200 rounded-lg shadow-sm">
                          <code className="text-sm font-mono text-gray-800 font-medium">
                            {userProfile?.uniqueId || "생성 중..."}
                          </code>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleCopyUniqueId}
                          disabled={!userProfile?.uniqueId}
                          className="px-4 py-2 h-auto border-2 hover:bg-blue-50 hover:border-blue-300 bg-transparent"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          복사
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 bg-white p-2 rounded border-l-4 border-blue-200">
                        💡 시스템에서 자동 생성된 고유 식별자입니다. 다른 사용자와 구분하는 데 사용됩니다.
                      </p>
                    </div>

                    <Separator className="my-6" />

                    {/* 계정 정보 그리드 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 이메일 */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          이메일
                        </Label>
                        <Input
                          value={userProfile?.email || ""}
                          disabled
                          className="bg-gray-50 border-2 border-gray-200 text-gray-700 font-medium"
                        />
                      </div>

                      {/* 역할 */}
                      <div className="space-y-3">
                        <Label className="text-sm font-semibold text-gray-700 flex items-center">
                          <Shield className="h-4 w-4 mr-2" />
                          역할
                        </Label>
                        <div className="p-3 bg-white border-2 border-gray-200 rounded-lg">
                          <Badge
                            variant={getRoleBadgeVariant(userProfile?.role || "")}
                            className="text-sm px-3 py-1 font-medium"
                          >
                            <span className="mr-2">{getRoleIcon(userProfile?.role || "")}</span>
                            {getRoleText(userProfile?.role || "")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    {/* 개인 정보 */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <User className="h-5 w-5 mr-2" />
                        개인 정보
                      </h3>

                      {/* 이름 */}
                      <div className="space-y-3">
                        <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                          이름
                        </Label>
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                          disabled={!canEditBasicProfile}
                          placeholder="이름을 입력하세요"
                          className={`border-2 ${!canEditBasicProfile ? "bg-gray-50 border-gray-200" : "border-gray-300 focus:border-blue-400"}`}
                        />
                      </div>

                      {/* 학생 정보 */}
                      {userProfile?.role === "student" && (
                        <div className="bg-white p-6 rounded-lg border-2 border-gray-200 space-y-6">
                          <h4 className="text-md font-semibold text-gray-800 flex items-center">
                            <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
                            학급 정보
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 학년 */}
                            <div className="space-y-3">
                              <Label htmlFor="grade" className="text-sm font-semibold text-gray-700 flex items-center">
                                <Calendar className="h-4 w-4 mr-2" />
                                학년
                              </Label>
                              <Select
                                value={profileData.grade}
                                onValueChange={(value) => setProfileData((prev) => ({ ...prev, grade: value }))}
                                disabled={!canEditStudentInfo}
                              >
                                <SelectTrigger
                                  className={`border-2 ${!canEditStudentInfo ? "bg-gray-50 border-gray-200" : "border-gray-300"}`}
                                >
                                  <SelectValue placeholder="학년을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1학년</SelectItem>
                                  <SelectItem value="2">2학년</SelectItem>
                                  <SelectItem value="3">3학년</SelectItem>
                                </SelectContent>
                              </Select>
                              {!canEditStudentInfo && (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border-l-4 border-amber-200">
                                  ⚠️ 학년은 관리자만 수정할 수 있습니다
                                </p>
                              )}
                            </div>

                            {/* 반 */}
                            <div className="space-y-3">
                              <Label htmlFor="class" className="text-sm font-semibold text-gray-700 flex items-center">
                                <Users className="h-4 w-4 mr-2" />반
                              </Label>
                              <Select
                                value={profileData.class}
                                onValueChange={(value) => setProfileData((prev) => ({ ...prev, class: value }))}
                                disabled={!canEditStudentInfo}
                              >
                                <SelectTrigger
                                  className={`border-2 ${!canEditStudentInfo ? "bg-gray-50 border-gray-200" : "border-gray-300"}`}
                                >
                                  <SelectValue placeholder="반을 선택하세요" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                    <SelectItem key={num} value={num.toString()}>
                                      {num}반
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {!canEditStudentInfo && (
                                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border-l-4 border-amber-200">
                                  ⚠️ 반은 관리자만 수정할 수 있습니다
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 교사 정보 */}
                      {userProfile?.role === "teacher" && (
                        <div className="space-y-3">
                          <Label
                            htmlFor="teacherSubject"
                            className="text-sm font-semibold text-gray-700 flex items-center"
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            담당 과목
                          </Label>
                          <Input
                            id="teacherSubject"
                            value={profileData.teacherSubject}
                            onChange={(e) => setProfileData((prev) => ({ ...prev, teacherSubject: e.target.value }))}
                            disabled={!canEditTeacherInfo}
                            placeholder="담당 과목을 입력하세요"
                            className={`border-2 ${!canEditTeacherInfo ? "bg-gray-50 border-gray-200" : "border-gray-300 focus:border-blue-400"}`}
                          />
                        </div>
                      )}
                    </div>

                    {/* 프로필 업데이트 버튼 - 모든 사용자에게 표시 */}
                    <div className="pt-6">
                      <Button
                        type="submit"
                        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 transition-colors"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            업데이트 중...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            프로필 업데이트
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              {/* 비밀번호 변경 카드 */}
              <Card className="shadow-sm border-0 bg-gradient-to-br from-green-50 to-emerald-50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Lock className="h-5 w-5 text-green-600" />
                    </div>
                    비밀번호 변경
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    보안을 위해 정기적으로 비밀번호를 변경하세요
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full h-12 text-base font-semibold bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    비밀번호 변경
                  </Button>
                </CardContent>
              </Card>

              {/* 계정 정보 카드 */}
              <Card className="shadow-sm border-0 bg-gradient-to-br from-purple-50 to-violet-50">
                <CardHeader>
                  <CardTitle className="text-xl font-bold flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg mr-3">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    계정 정보
                  </CardTitle>
                  <CardDescription className="text-gray-600">계정 생성 및 수정 정보</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <Label className="text-sm font-semibold text-gray-600 flex items-center mb-2">
                      <Calendar className="h-4 w-4 mr-2" />
                      계정 생성일
                    </Label>
                    <p className="text-base font-medium text-gray-800">
                      {userProfile?.createdAt
                        ? new Date(userProfile.createdAt).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "정보 없음"}
                    </p>
                  </div>
                  {userProfile?.updatedAt && (
                    <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                      <Label className="text-sm font-semibold text-gray-600 flex items-center mb-2">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        마지막 수정일
                      </Label>
                      <p className="text-base font-medium text-gray-800">
                        {new Date(userProfile.updatedAt).toLocaleString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setIsPasswordModalOpen(false)
          setSuccess("비밀번호가 성공적으로 변경되었습니다.")
        }}
      />
    </>
  )
}
