"use client"
import { useState, useEffect } from "react"
import { CardDescription } from "@/components/ui/card"

import { useParams, useRouter } from "next/navigation"
import { collection, query, where } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  UserPlus,
  UserMinus,
  Settings,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Crown,
  Mail,
  Shield,
  UserCheck,
  FileText,
  Clock,
  Eye,
  Upload,
  Sparkles,
  BookOpen,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { safeGetDoc, safeUpdateDoc, safeAddDoc } from "@/lib/firebase-utils"
import { usePollingData } from "@/hooks/use-polling-data"
import { FileUpload } from "@/components/file-upload"
import { FileList } from "@/components/file-list"
import { RichTextEditor } from "@/components/rich-text-editor"
import { MarkdownRenderer } from "@/components/markdown-renderer"
import type { UploadedFile } from "@/lib/storage-utils"
import Link from "next/link"

interface Group {
  id: string
  name: string
  description?: string
  classId: string
  members: string[]
  createdBy: string
  groupLeader?: string
  createdAt: Date
}

interface ClassMember {
  id: string
  classId: string
  memberId: string
  memberName: string
  memberRole: "student" | "teacher"
  joinedAt: Date
}

interface GroupInvitation {
  id: string
  groupId: string
  groupName: string
  inviterId: string
  inviterName: string
  inviteeId: string
  inviteeName: string
  status: "pending" | "accepted" | "declined"
  createdAt: Date
}

interface GroupSubmission {
  id: string
  groupId: string
  groupName: string
  content: string
  files?: UploadedFile[]
  submittedAt: Date
  submittedBy: string
  submittedByName: string
  status: "submitted" | "graded"
  grade?: number
  feedback?: string
  version: number // 제출 버전 (여러 번 제출 가능)
}

export default function GroupPage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const groupId = params.groupId as string

  const [group, setGroup] = useState<Group | null>(null)
  const [isInviting, setIsInviting] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [isChangingLeader, setIsChangingLeader] = useState(false)
  const [selectedLeaderId, setSelectedLeaderId] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // 모둠 과제 제출 관련 상태
  const [submissionContent, setSubmissionContent] = useState("")
  const [submissionFiles, setSubmissionFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmissionDialogOpen, setIsSubmissionDialogOpen] = useState(false)
  const [isViewingAssignment, setIsViewingAssignment] = useState(false)

  // 그룹 정보 로드
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId) return

      try {
        const groupData = await safeGetDoc<Group>(`groups/${groupId}`)
        if (groupData) {
          setGroup(groupData)
        } else {
          setError("모둠을 찾을 수 없습니다.")
        }
      } catch (error) {
        console.error("Error loading group:", error)
        setError("모둠 정보를 불러오는 중 오류가 발생했습니다.")
      }
    }

    loadGroup()
  }, [groupId])

  // 반 멤버들 가져오기
  const membersRef = group ? query(collection(db, "classMembers"), where("classId", "==", group.classId)) : null
  const { data: classMembers } = usePollingData<ClassMember>(membersRef)

  // 그룹 초대 목록
  const invitationsRef = user ? query(collection(db, "groupInvitations"), where("groupId", "==", groupId)) : null
  const { data: invitations, refresh: refreshInvitations } = usePollingData<GroupInvitation>(invitationsRef)

  // 모둠 제출물 가져오기
  const groupSubmissionsRef = user ? query(collection(db, "groupSubmissions"), where("groupId", "==", groupId)) : null
  const { data: groupSubmissions, refresh: refreshGroupSubmissions } =
    usePollingData<GroupSubmission>(groupSubmissionsRef)

  // 기본 모둠 과제 정보
  const defaultGroupAssignment = group
    ? {
        id: `group-default-${group.id}`,
        title: "모둠 활동 보고서",
        content: `# 모둠 활동 보고서

이 과제는 모둠이 생성될 때 자동으로 만들어지는 기본 과제입니다.

## 제출 내용
- **모둠 활동 계획**: 모둠에서 진행할 활동들의 계획
- **역할 분담 내용**: 각 모둠원의 역할과 책임
- **활동 진행 상황**: 현재까지의 활동 진행 상황
- **모둠원 간 협력 내용**: 모둠원들이 어떻게 협력하고 있는지
- **학습 성과**: 모둠 활동을 통해 얻은 학습 성과
- **개선 사항**: 앞으로 개선하고 싶은 부분

## 제출 방법
모둠장은 모둠원들과 상의하여 정기적으로 활동 내용을 업데이트해주세요.
필요한 경우 여러 번 제출할 수 있으며, 최신 제출물이 최종 평가 대상이 됩니다.`,
        dueDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1년 후 (사실상 무제한)
        classId: group.classId,
        createdBy: "system",
        createdAt: new Date(),
      }
    : null

  if (!user || !userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/80 backdrop-blur-md shadow-2xl border-0">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
            <p className="text-gray-600 mb-6">모둠에 접근하려면 먼저 로그인해주세요.</p>
            <Button
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 h-12 rounded-xl"
              asChild
            >
              <Link href="/login">로그인하기</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">모둠 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const isCreator = group.createdBy === user.uid
  const isMember = group.members.includes(user.uid)
  const isTeacher = userProfile.role === "teacher"
  const isGroupLeader = group.groupLeader === user.uid
  const canManageGroup = isCreator || isTeacher || isGroupLeader

  // 초대 가능한 멤버들 (반 멤버 중 모둠에 속하지 않은 사람들)
  const availableMembers =
    classMembers?.filter((member) => !group.members.includes(member.memberId) && member.memberId !== user.uid) || []

  // 모둠장으로 선택 가능한 멤버들 (현재 모둠 멤버 중 학생들)
  const availableLeaders =
    classMembers?.filter((member) => group.members.includes(member.memberId) && member.memberRole === "student") || []

  const handleInviteMember = async () => {
    if (!selectedMemberId) {
      setError("초대할 멤버를 선택해주세요.")
      return
    }

    const memberToInvite = classMembers?.find((m) => m.memberId === selectedMemberId)
    if (!memberToInvite) {
      setError("선택한 멤버를 찾을 수 없습니다.")
      return
    }

    setError("")
    setSuccess("")

    try {
      // 이미 초대된 사람인지 확인
      const existingInvitation = invitations?.find(
        (inv) => inv.inviteeId === selectedMemberId && inv.status === "pending",
      )
      if (existingInvitation) {
        setError("이미 초대된 멤버입니다.")
        return
      }

      const invitationData = {
        groupId: group.id,
        groupName: group.name,
        inviterId: user.uid,
        inviterName: userProfile.name,
        inviteeId: selectedMemberId,
        inviteeName: memberToInvite.memberName,
        status: "pending" as const,
        createdAt: new Date(),
      }

      await safeAddDoc("groupInvitations", invitationData)

      setSuccess(`${memberToInvite.memberName}님에게 초대를 보냈습니다.`)
      setSelectedMemberId("")
      setIsInviting(false)
      refreshInvitations()
    } catch (error) {
      console.error("Error inviting member:", error)
      setError("멤버 초대 중 오류가 발생했습니다.")
    }
  }

  const handleChangeGroupLeader = async () => {
    if (!selectedLeaderId) {
      setError("모둠장으로 선택할 멤버를 선택해주세요.")
      return
    }

    const newLeader = classMembers?.find((m) => m.memberId === selectedLeaderId)
    if (!newLeader) {
      setError("선택한 멤버를 찾을 수 없습니다.")
      return
    }

    setError("")
    setSuccess("")

    try {
      await safeUpdateDoc(`groups/${group.id}`, { groupLeader: selectedLeaderId })

      setGroup({ ...group, groupLeader: selectedLeaderId })
      setSuccess(`${newLeader.memberName}님이 새로운 모둠장으로 선택되었습니다.`)
      setSelectedLeaderId("")
      setIsChangingLeader(false)
    } catch (error) {
      console.error("Error changing group leader:", error)
      setError("모둠장 변경 중 오류가 발생했습니다.")
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    const memberToRemove = classMembers?.find((m) => m.memberId === memberId)
    if (!memberToRemove) return

    if (!confirm(`정말로 ${memberToRemove.memberName}님을 모둠에서 제거하시겠습니까?`)) return

    try {
      const updatedMembers = group.members.filter((id) => id !== memberId)
      const updateData: any = { members: updatedMembers }

      // 제거되는 멤버가 모둠장이면 모둠장도 제거
      if (group.groupLeader === memberId) {
        updateData.groupLeader = null
      }

      await safeUpdateDoc(`groups/${group.id}`, updateData)

      setGroup({
        ...group,
        members: updatedMembers,
        groupLeader: group.groupLeader === memberId ? undefined : group.groupLeader,
      })
      setSuccess(`${memberToRemove.memberName}님이 모둠에서 제거되었습니다.`)
    } catch (error) {
      console.error("Error removing member:", error)
      setError("멤버 제거 중 오류가 발생했습니다.")
    }
  }

  const handleLeaveGroup = async () => {
    if (!confirm("정말로 이 모둠을 떠나시겠습니까?")) return

    try {
      const updatedMembers = group.members.filter((id) => id !== user.uid)
      const updateData: any = { members: updatedMembers }

      // 떠나는 사람이 모둠장이면 모둠장도 제거
      if (group.groupLeader === user.uid) {
        updateData.groupLeader = null
      }

      await safeUpdateDoc(`groups/${group.id}`, updateData)

      router.push(`/class/${group.classId}`)
    } catch (error) {
      console.error("Error leaving group:", error)
      setError("모둠 탈퇴 중 오류가 발생했습니다.")
    }
  }

  const handleSubmitGroupAssignment = async () => {
    if (!submissionContent.trim()) {
      setError("제출 내용을 입력해주세요.")
      return
    }

    setError("")
    setSuccess("")
    setIsSubmitting(true)

    try {
      // 기존 제출물이 있는지 확인하여 버전 번호 결정
      const existingSubmissions = groupSubmissions || []
      const nextVersion = existingSubmissions.length + 1

      const submissionData = {
        groupId: group.id,
        groupName: group.name,
        content: submissionContent,
        files: submissionFiles,
        submittedAt: new Date(),
        submittedBy: user.uid,
        submittedByName: userProfile.name,
        status: "submitted" as const,
        version: nextVersion,
      }

      await safeAddDoc("groupSubmissions", submissionData)

      setSuccess(`모둠 활동 보고서가 성공적으로 제출되었습니다. (버전 ${nextVersion})`)
      setSubmissionContent("")
      setSubmissionFiles([])
      setIsSubmissionDialogOpen(false)
      refreshGroupSubmissions()
    } catch (error) {
      console.error("Error submitting group assignment:", error)
      setError("모둠 과제 제출 중 오류가 발생했습니다.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getGroupMembers = () => {
    return classMembers?.filter((member) => group.members.includes(member.memberId)) || []
  }

  const pendingInvitations = invitations?.filter((inv) => inv.status === "pending") || []

  // 최신 제출물 가져오기
  const latestSubmission =
    groupSubmissions && groupSubmissions.length > 0 ? groupSubmissions.sort((a, b) => b.version - a.version)[0] : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push(`/class/${group.classId}`)}
                className="mr-4 hover:bg-purple-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                반으로 돌아가기
              </Button>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {group.name}
                </h1>
                <div className="flex items-center space-x-4 text-gray-600">
                  <span>멤버 {group.members.length}명</span>
                  <span>•</span>
                  <span>생성일: {new Date(group.createdAt).toLocaleDateString()}</span>
                  {latestSubmission && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">최근 제출: v{latestSubmission.version}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isMember && (
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">참가중</Badge>
              )}
              {isCreator && (
                <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  생성자
                </Badge>
              )}
              {isGroupLeader && (
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
                  <Shield className="h-3 w-3 mr-1" />
                  모둠장
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50/80 backdrop-blur-sm border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 bg-green-50/80 backdrop-blur-sm border-green-200">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-md rounded-full p-1 shadow-lg border-0">
            <TabsTrigger
              value="info"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              <Users className="h-4 w-4 mr-2" />
              모둠 정보
            </TabsTrigger>
            <TabsTrigger
              value="assignment"
              className="rounded-full px-6 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white transition-all duration-300"
            >
              <FileText className="h-4 w-4 mr-2" />
              모둠 과제
              {latestSubmission && (
                <Badge className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  v{latestSubmission.version}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 모둠 정보 */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="overflow-hidden bg-gradient-to-br from-purple-50 via-white to-pink-50 border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                        <Users className="h-5 w-5 text-white" />
                      </div>
                      모둠 정보
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2">모둠 이름</h3>
                      <p className="text-gray-700">{group.name}</p>
                    </div>
                    {group.description && (
                      <div className="p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-2">모둠 설명</h3>
                        <p className="text-gray-700">{group.description}</p>
                      </div>
                    )}
                    <div className="p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-2">생성 정보</h3>
                      <p className="text-gray-700">생성일: {new Date(group.createdAt).toLocaleDateString()}</p>
                      {group.groupLeader && (
                        <p className="text-gray-700 mt-2">
                          모둠장:{" "}
                          {classMembers?.find((m) => m.memberId === group.groupLeader)?.memberName || "알 수 없음"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* 모둠 멤버 */}
                <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-xl">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        모둠 멤버 ({group.members.length}명)
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        {canManageGroup && (
                          <>
                            <Dialog open={isInviting} onOpenChange={setIsInviting}>
                              <DialogTrigger asChild>
                                <Button className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 rounded-xl">
                                  <UserPlus className="h-4 w-4 mr-2" />
                                  멤버 초대
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="rounded-2xl">
                                <DialogHeader>
                                  <DialogTitle>모둠 멤버 초대</DialogTitle>
                                  <DialogDescription>반 멤버 중에서 모둠에 초대할 사람을 선택하세요.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>초대할 멤버</Label>
                                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                      <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="멤버를 선택하세요" />
                                      </SelectTrigger>
                                      <SelectContent className="rounded-xl">
                                        {availableMembers.map((member) => (
                                          <SelectItem key={member.memberId} value={member.memberId}>
                                            {member.memberName} ({member.memberRole === "teacher" ? "교사" : "학생"})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => setIsInviting(false)}
                                      className="rounded-xl"
                                    >
                                      취소
                                    </Button>
                                    <Button
                                      onClick={handleInviteMember}
                                      className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 rounded-xl"
                                    >
                                      <Mail className="h-4 w-4 mr-2" />
                                      초대 보내기
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>

                            {(isCreator || isTeacher) && availableLeaders.length > 0 && (
                              <Dialog open={isChangingLeader} onOpenChange={setIsChangingLeader}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="border-yellow-200 text-yellow-600 hover:bg-yellow-50 rounded-xl bg-transparent"
                                  >
                                    <Crown className="h-4 w-4 mr-2" />
                                    모둠장 선택
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-2xl">
                                  <DialogHeader>
                                    <DialogTitle>모둠장 선택</DialogTitle>
                                    <DialogDescription>모둠 멤버 중에서 모둠장을 선택하세요.</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>모둠장으로 선택할 멤버</Label>
                                      <Select value={selectedLeaderId} onValueChange={setSelectedLeaderId}>
                                        <SelectTrigger className="rounded-xl">
                                          <SelectValue placeholder="모둠장을 선택하세요" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                          {availableLeaders.map((member) => (
                                            <SelectItem key={member.memberId} value={member.memberId}>
                                              {member.memberName}
                                              {group.groupLeader === member.memberId && " (현재 모둠장)"}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex justify-end space-x-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => setIsChangingLeader(false)}
                                        className="rounded-xl"
                                      >
                                        취소
                                      </Button>
                                      <Button
                                        onClick={handleChangeGroupLeader}
                                        className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 rounded-xl"
                                      >
                                        <Crown className="h-4 w-4 mr-2" />
                                        모둠장 선택
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getGroupMembers().map((member) => (
                        <div
                          key={member.memberId}
                          className="flex items-center justify-between p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200"
                        >
                          <div className="flex items-center space-x-4">
                            <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold">
                                {member.memberName?.charAt(0) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-semibold text-gray-900">{member.memberName}</p>
                                <Badge
                                  className={`${
                                    member.memberRole === "teacher"
                                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                      : "bg-gray-100 text-gray-700 border border-gray-300"
                                  } border-0`}
                                >
                                  {member.memberRole === "teacher" ? "교사" : "학생"}
                                </Badge>
                                {member.memberId === group.createdBy && (
                                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                                    <Crown className="h-3 w-3 mr-1" />
                                    생성자
                                  </Badge>
                                )}
                                {member.memberId === group.groupLeader && (
                                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
                                    <Shield className="h-3 w-3 mr-1" />
                                    모둠장
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {canManageGroup && member.memberId !== group.createdBy && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveMember(member.memberId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            >
                              <UserMinus className="h-3 w-3 mr-1" />
                              제거
                            </Button>
                          )}
                        </div>
                      ))}
                      {group.members.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>아직 모둠 멤버가 없습니다</p>
                          <p className="text-sm">멤버를 초대해보세요</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 사이드바 */}
              <div className="space-y-6">
                {/* 대기 중인 초대 */}
                {pendingInvitations.length > 0 && (
                  <Card className="overflow-hidden bg-gradient-to-br from-orange-50 via-white to-red-50 border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center mr-3">
                          <Mail className="h-4 w-4 text-white" />
                        </div>
                        대기 중인 초대
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {pendingInvitations.map((invitation) => (
                          <div
                            key={invitation.id}
                            className="p-3 bg-white/50 backdrop-blur-sm rounded-lg border border-gray-200"
                          >
                            <p className="text-sm font-medium text-gray-900">{invitation.inviteeName}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(invitation.createdAt).toLocaleDateString()} 초대됨
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 모둠장 권한 */}
                {isGroupLeader && (
                  <Card className="overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                          <Shield className="h-4 w-4 text-white" />
                        </div>
                        모둠장 권한
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600 mb-4">모둠장으로서 다음 권한을 사용할 수 있습니다:</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span>멤버 초대 및 관리</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span>모둠 활동 보고서 제출</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-purple-600" />
                          <span>모둠 대표 역할</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 모둠 설정 */}
                <Card className="overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50 border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-500 to-slate-500 flex items-center justify-center mr-3">
                        <Settings className="h-4 w-4 text-white" />
                      </div>
                      모둠 설정
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isMember && !isCreator && (
                      <Button
                        onClick={handleLeaveGroup}
                        variant="outline"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 rounded-xl bg-transparent"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        모둠 탈퇴
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push(`/class/${group.classId}`)}
                      variant="outline"
                      className="w-full rounded-xl"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      반으로 돌아가기
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assignment" className="space-y-6">
            {/* 모둠 과제 카드 */}
            {defaultGroupAssignment && (
              <Card className="overflow-hidden bg-gradient-to-br from-green-50 via-white to-emerald-50 border-0 shadow-xl">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-4">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{defaultGroupAssignment.title}</CardTitle>
                        <CardDescription className="text-gray-600 mt-2">
                          모둠 생성 시 자동으로 만들어지는 기본 과제입니다
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {latestSubmission && (
                        <div className="text-right">
                          <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-lg px-4 py-2">
                            <CheckCircle className="h-4 w-4 mr-2" />v{latestSubmission.version} 제출완료
                          </Badge>
                          {latestSubmission.status === "graded" && (
                            <p className="text-sm text-purple-600 mt-1 font-medium">
                              채점완료: {latestSubmission.grade}점
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 과제 설명 */}
                  <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-lg mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-blue-600" />
                      과제 설명
                    </h3>
                    <div className="prose max-w-none">
                      <MarkdownRenderer content={defaultGroupAssignment.content} />
                    </div>
                  </div>

                  {/* 제출 현황 */}
                  <div className="p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-lg mb-4 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-orange-600" />
                      제출 현황
                    </h3>

                    {groupSubmissions && groupSubmissions.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{groupSubmissions.length}</div>
                            <div className="text-sm text-blue-600">총 제출 횟수</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {groupSubmissions.filter((s) => s.status === "graded").length}
                            </div>
                            <div className="text-sm text-green-600">채점 완료</div>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">v{latestSubmission?.version || 0}</div>
                            <div className="text-sm text-purple-600">최신 버전</div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {groupSubmissions
                            .sort((a, b) => b.version - a.version)
                            .map((submission) => (
                              <div
                                key={submission.id}
                                className="flex items-center justify-between p-4 bg-white/80 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-center space-x-4">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    v{submission.version}
                                  </Badge>
                                  <div>
                                    <p className="font-medium text-gray-900">{submission.submittedByName}님이 제출</p>
                                    <p className="text-sm text-gray-500">
                                      {new Date(submission.submittedAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {submission.status === "graded" ? (
                                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      {submission.grade}점
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="border-orange-300 text-orange-600">
                                      <Clock className="h-3 w-3 mr-1" />
                                      채점 대기
                                    </Badge>
                                  )}
                                  {submission.files && submission.files.length > 0 && (
                                    <span className="text-xs text-gray-500">📎 {submission.files.length}개 파일</span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-400 to-gray-500 flex items-center justify-center mx-auto mb-4 opacity-50">
                          <FileText className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-lg mb-2 font-medium">아직 제출하지 않았습니다</p>
                        <p className="text-sm">모둠장이 모둠 활동 보고서를 제출해주세요</p>
                      </div>
                    )}
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="flex justify-center space-x-4">
                    <Button
                      onClick={() => setIsViewingAssignment(true)}
                      variant="outline"
                      className="bg-white/50 backdrop-blur-sm border-gray-200 hover:bg-white/80 rounded-xl"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      과제 상세보기
                    </Button>

                    {isGroupLeader && (
                      <Button
                        onClick={() => setIsSubmissionDialogOpen(true)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 rounded-xl"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {latestSubmission ? "새 버전 제출" : "보고서 제출"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* 과제 상세보기 모달 */}
      {defaultGroupAssignment && (
        <Dialog open={isViewingAssignment} onOpenChange={setIsViewingAssignment}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                {defaultGroupAssignment.title}
              </DialogTitle>
              <DialogDescription>모둠 생성 시 자동으로 만들어지는 기본 과제입니다</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="p-6 bg-gray-50 rounded-xl">
                <div className="prose max-w-none">
                  <MarkdownRenderer content={defaultGroupAssignment.content} />
                </div>
              </div>

              {latestSubmission && (
                <div className="p-6 bg-green-50 rounded-xl">
                  <h3 className="font-semibold text-lg mb-4">최근 제출물 (v{latestSubmission.version})</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">제출자</Label>
                        <p className="text-gray-900">{latestSubmission.submittedByName}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">제출일시</Label>
                        <p className="text-gray-900">{new Date(latestSubmission.submittedAt).toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">제출 내용</Label>
                      <div className="mt-2 p-4 bg-white rounded-lg border">
                        <MarkdownRenderer content={latestSubmission.content} />
                      </div>
                    </div>
                    {latestSubmission.files && latestSubmission.files.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">첨부 파일</Label>
                        <div className="mt-2">
                          <FileList files={latestSubmission.files} canDelete={false} />
                        </div>
                      </div>
                    )}
                    {latestSubmission.status === "graded" && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-800 mb-2">채점 결과</h4>
                        <div className="flex items-center space-x-4">
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-lg px-3 py-1">
                            {latestSubmission.grade}점
                          </Badge>
                          {latestSubmission.feedback && (
                            <div className="flex-1">
                              <p className="text-sm text-purple-700">{latestSubmission.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* 모둠 과제 제출 모달 */}
      {defaultGroupAssignment && (
        <Dialog open={isSubmissionDialogOpen} onOpenChange={setIsSubmissionDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                  <Upload className="h-4 w-4 text-white" />
                </div>
                모둠 활동 보고서 제출
                {latestSubmission && (
                  <Badge className="ml-3 bg-blue-100 text-blue-700">
                    새 버전: v{(latestSubmission.version || 0) + 1}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                모둠장으로서 모둠 활동 보고서를 제출합니다. 여러 번 제출할 수 있으며, 최신 제출물이 최종 평가 대상이
                됩니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* 과제 정보 */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-semibold mb-2">과제 안내</h3>
                <div className="prose max-w-none text-sm">
                  <MarkdownRenderer content={defaultGroupAssignment.content.substring(0, 500) + "..."} />
                </div>
              </div>

              {/* 제출 내용 */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">모둠 활동 보고서 내용</Label>
                  <RichTextEditor
                    value={submissionContent}
                    onChange={setSubmissionContent}
                    placeholder="모둠 활동 보고서 내용을 자세히 작성해주세요..."
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">첨부 파일</Label>
                  <FileUpload
                    onFilesUploaded={setSubmissionFiles}
                    maxFiles={10}
                    uploadPath={`group-submissions/${group.id}`}
                    acceptedTypes={["image/*", "application/pdf", ".doc,.docx,.txt"]}
                    uploadedFiles={submissionFiles}
                  />
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmissionDialogOpen(false)
                    setSubmissionContent("")
                    setSubmissionFiles([])
                  }}
                  className="rounded-xl"
                >
                  취소
                </Button>
                <Button
                  onClick={handleSubmitGroupAssignment}
                  disabled={isSubmitting || !submissionContent.trim()}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 rounded-xl"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      제출 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      보고서 제출
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
