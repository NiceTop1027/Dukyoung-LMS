"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Label } from "@/components/ui/label"
import {
  FileText,
  Download,
  User,
  Calendar,
  ArrowLeft,
  Save,
  Star,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"

interface Submission {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  submittedAt: any
  files: Array<{
    name: string
    url: string
    size: number
  }>
  content?: string
  grade?: number
  status: "submitted" | "graded" | "late"
  isLate: boolean
}

interface GroupSubmission {
  id: string
  groupId: string
  groupName: string
  members: Array<{
    id: string
    name: string
    email: string
  }>
  submittedAt: any
  files: Array<{
    name: string
    url: string
    size: number
  }>
  content?: string
  grade?: number
  status: "submitted" | "graded" | "late"
  isLate: boolean
  submittedBy: string
  submittedByName: string
}

interface Assignment {
  id: string
  title: string
  description: string
  dueDate: any
  isGroupAssignment: boolean
  maxScore: number
}

interface IndividualSubmissionViewerProps {
  submission: Submission | GroupSubmission
  assignment: Assignment
  onBack: () => void
  onClose: () => void
}

export function IndividualSubmissionViewer({
  submission,
  assignment,
  onBack,
  onClose,
}: IndividualSubmissionViewerProps) {
  const { user } = useAuth()
  const [grade, setGrade] = useState<string>(submission.grade?.toString() || "")
  const [isGrading, setIsGrading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveGrade = async () => {
    if (!grade.trim()) {
      toast({
        title: "입력 오류",
        description: "점수를 입력해주세요.",
        variant: "destructive",
      })
      return
    }

    const gradeNumber = Number.parseFloat(grade)
    if (isNaN(gradeNumber) || gradeNumber < 0 || gradeNumber > assignment.maxScore) {
      toast({
        title: "점수 오류",
        description: `점수는 0부터 ${assignment.maxScore}점 사이여야 합니다.`,
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const submissionRef = doc(
        db,
        assignment.isGroupAssignment ? "groupSubmissions" : "assignmentSubmissions",
        submission.id,
      )

      const updateData: any = {
        grade: gradeNumber,
        status: "graded",
        gradedAt: new Date(),
        gradedBy: user?.uid,
      }

      await updateDoc(submissionRef, updateData)

      toast({
        title: "저장 완료",
        description: "점수가 성공적으로 저장되었습니다.",
      })

      setIsGrading(false)
    } catch (error) {
      console.error("저장 실패:", error)
      toast({
        title: "저장 실패",
        description: "저장 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "날짜 없음"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString("ko-KR")
  }

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "graded") {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          채점 완료
        </Badge>
      )
    }
    if (isLate) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          지각 제출
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        제출됨
      </Badge>
    )
  }

  const isGroupSubmission = (sub: Submission | GroupSubmission): sub is GroupSubmission => {
    return "groupName" in sub
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack} className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              목록으로
            </Button>
            <div>
              <h2 className="text-xl font-bold">
                {isGroupSubmission(submission) ? submission.groupName : submission.studentName}
              </h2>
              <p className="text-gray-600">{assignment.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(submission.status, submission.isLate)}
            {submission.grade !== undefined && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 flex items-center gap-1">
                <Star className="h-3 w-3" />
                {submission.grade}/{assignment.maxScore}점
              </Badge>
            )}
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-auto bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 p-8 h-full min-h-0">
            {/* 제출물 정보 (3/4) */}
            <div className="lg:col-span-3 flex flex-col h-full">
              <ScrollArea className="flex-1">
                <div className="space-y-6">
                  {/* 기본 정보 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {isGroupSubmission(submission) ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                        제출 정보
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">
                            {isGroupSubmission(submission)
                              ? submission.groupName?.[0]?.toUpperCase() || "G"
                              : submission.studentName?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-lg">
                            {isGroupSubmission(submission) ? submission.groupName : submission.studentName}
                          </h3>
                          <p className="text-gray-600">
                            {isGroupSubmission(submission)
                              ? `${submission.members?.length || 0}명 그룹 • 제출자: ${submission.submittedByName}`
                              : submission.studentEmail}
                          </p>
                        </div>
                      </div>

                      {isGroupSubmission(submission) && submission.members && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-medium mb-3">그룹 멤버</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {submission.members.map((member, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs bg-purple-100 text-purple-600">
                                    {member.name?.[0]?.toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{member.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>제출일: {formatDate(submission.submittedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span>파일: {submission.files?.length || 0}개</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 제출 내용 */}
                  {submission.content && (
                    <Card>
                      <CardHeader>
                        <CardTitle>제출 내용</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="whitespace-pre-wrap">{submission.content}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 첨부 파일 */}
                  {submission.files && submission.files.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>첨부 파일</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {submission.files.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-gray-500" />
                                <div>
                                  <p className="font-medium">{file.name}</p>
                                  <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(file.url, "_blank")}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                다운로드
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* 채점 섹션 (1/4) */}
            <div className="flex flex-col h-full">
              <Card className="flex-1">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Star className="h-5 w-5" />
                      채점
                    </span>
                    {!isGrading && (
                      <Button size="sm" onClick={() => setIsGrading(true)} className="bg-blue-600 hover:bg-blue-700">
                        {submission.status === "graded" ? "수정" : "채점하기"}
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isGrading ? (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="grade">점수 (최대 {assignment.maxScore}점)</Label>
                        <Input
                          id="grade"
                          type="number"
                          min="0"
                          max={assignment.maxScore}
                          value={grade}
                          onChange={(e) => setGrade(e.target.value)}
                          placeholder="점수 입력"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveGrade}
                          disabled={isSaving}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving ? "저장 중..." : "저장"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsGrading(false)
                            setGrade(submission.grade?.toString() || "")
                          }}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {submission.grade !== undefined ? (
                        <div className="text-center p-6 bg-yellow-50 rounded-lg">
                          <div className="text-3xl font-bold text-yellow-800 mb-2">
                            {submission.grade}/{assignment.maxScore}
                          </div>
                          <div className="text-sm text-yellow-600">점</div>
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-gray-50 rounded-lg">
                          <div className="text-gray-500 mb-2">아직 채점되지 않음</div>
                          <div className="text-sm text-gray-400">점수를 입력해주세요</div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
