"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Clock, FileText, Send, CheckCircle, AlertCircle, BookOpen, Eye, XCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { FileUpload } from "./file-upload"
import { FileList } from "./file-list"
import { MarkdownRenderer } from "./markdown-renderer"
import { QuizViewer } from "./quiz-viewer"
import { safeAddDoc } from "@/lib/firebase-utils"
import type { UploadedFile } from "@/lib/storage-utils"

interface ClassAssignment {
  id: string
  title: string
  content: string
  dueDate: string
  classId: string
  files?: UploadedFile[]
  createdBy: string
  createdAt: Date
  hasQuiz?: boolean
  quiz?: any
}

interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  content: string
  files?: UploadedFile[]
  submittedAt: Date
  status: "submitted" | "graded"
  grade?: number
  feedback?: string
}

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

interface AssignmentViewerProps {
  assignment: ClassAssignment
  onClose: () => void
  onSubmit: (assignmentId: string) => Promise<void>
  submissionContent: string
  setSubmissionContent: (content: string) => void
  submissionFiles: UploadedFile[]
  setSubmissionFiles: (files: UploadedFile[]) => void
  isSubmitting: boolean
  isSubmitted: boolean
  submission?: AssignmentSubmission
  isOverdue: boolean
  userRole: string
  classId: string
  groups: Group[]
  members: ClassMember[]
  userId: string
  userName: string
}

export function AssignmentViewer({
  assignment,
  onClose,
  onSubmit,
  submissionContent,
  setSubmissionContent,
  submissionFiles,
  setSubmissionFiles,
  isSubmitting,
  isSubmitted,
  submission,
  isOverdue,
  userRole,
  classId,
  groups,
  members,
  userId,
  userName,
}: AssignmentViewerProps) {
  const { user, userProfile } = useAuth()
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedSubmissionType, setSelectedSubmissionType] = useState<"individual" | "group">("individual")
  const [selectedGroupId, setSelectedGroupId] = useState("")
  const [isGroupSubmission, setIsGroupSubmission] = useState(false)

  const isStudent = userRole === "student"
  const isTeacher = userRole === "teacher" || userRole === "admin"

  // 마감 시간 체크 - 현재 시간과 비교
  const now = new Date()
  const dueDate = new Date(assignment.dueDate)
  const isAssignmentOverdue = now > dueDate

  // 제출 가능 여부 - 학생이고, 아직 제출하지 않았고, 마감되지 않았을 때만 가능
  const canSubmit = isStudent && !isSubmitted && !isAssignmentOverdue

  // 사용자가 속한 그룹들 찾기
  const userGroups = groups.filter((group) => group.members.includes(userId))

  // 마감까지 남은 시간 계산
  const getTimeRemaining = () => {
    const diff = dueDate.getTime() - now.getTime()

    if (diff <= 0) {
      return { text: "마감됨", color: "text-red-600", bgColor: "bg-red-50" }
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 3) {
      return { text: `${days}일 남음`, color: "text-green-600", bgColor: "bg-green-50" }
    } else if (days > 1) {
      return { text: `${days}일 ${hours}시간 남음`, color: "text-yellow-600", bgColor: "bg-yellow-50" }
    } else if (days === 1) {
      return { text: `1일 ${hours}시간 남음`, color: "text-orange-600", bgColor: "bg-orange-50" }
    } else if (hours > 0) {
      return { text: `${hours}시간 남음`, color: "text-red-600", bgColor: "bg-red-50" }
    } else if (minutes > 0) {
      return { text: `${minutes}분 남음`, color: "text-red-600", bgColor: "bg-red-50" }
    } else {
      return { text: "곧 마감", color: "text-red-600", bgColor: "bg-red-50" }
    }
  }

  const timeRemaining = getTimeRemaining()

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError("제출할 수 없습니다.")
      return
    }

    if (!submissionContent.trim() && submissionFiles.length === 0) {
      setError("제출할 내용이나 파일을 추가해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      await onSubmit(assignment.id)
      setSuccess("과제가 성공적으로 제출되었습니다.")
    } catch (error: any) {
      console.error("Assignment submission error:", error)
      setError(error.message || "과제 제출 중 오류가 발생했습니다.")
    }
  }

  const handleGroupSubmit = async () => {
    if (!selectedGroupId) {
      setError("모둠을 선택해주세요.")
      return
    }

    if (!submissionContent.trim() && submissionFiles.length === 0) {
      setError("제출할 내용이나 파일을 추가해주세요.")
      return
    }

    setError("")
    setSuccess("")

    try {
      const selectedGroup = groups.find((g) => g.id === selectedGroupId)
      if (!selectedGroup) {
        setError("선택한 모둠을 찾을 수 없습니다.")
        return
      }

      const groupSubmissionData = {
        assignmentId: assignment.id,
        groupId: selectedGroupId,
        groupName: selectedGroup.name,
        content: submissionContent,
        files: submissionFiles,
        submittedAt: new Date(),
        submittedBy: userId,
        submittedByName: userName,
        status: "submitted" as const,
      }

      await safeAddDoc("groupSubmissions", groupSubmissionData)
      setSuccess("모둠 과제가 성공적으로 제출되었습니다.")

      // 제출 후 상태 초기화
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error("Group submission error:", error)
      setError(error.message || "모둠 과제 제출 중 오류가 발생했습니다.")
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-gray-900">{assignment.title}</DialogTitle>
              <DialogDescription className="text-base">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>마감: {new Date(assignment.dueDate).toLocaleString()}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="h-4 w-4" />
                    <span>생성: {new Date(assignment.createdAt).toLocaleDateString()}</span>
                  </span>
                </div>
              </DialogDescription>
            </div>
            <div className="text-right space-y-2">
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${timeRemaining.bgColor} ${timeRemaining.color} border`}
              >
                <Clock className="h-3 w-3 mr-1 inline" />
                {timeRemaining.text}
              </div>
              {isSubmitted && (
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  제출완료
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* 알림 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* 마감 경고 */}
          {isAssignmentOverdue && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>이 과제는 마감되었습니다. 더 이상 제출할 수 없습니다.</AlertDescription>
            </Alert>
          )}

          {/* 과제 내용 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="h-5 w-5 mr-2" />
                과제 내용
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={assignment.content} />
              </div>

              {assignment.files && assignment.files.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900">첨부 파일</h4>
                    <FileList files={assignment.files} canDelete={false} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 퀴즈 섹션 */}
          {assignment.hasQuiz && assignment.quiz && isStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <BookOpen className="h-5 w-5 mr-2" />
                  퀴즈
                </CardTitle>
                <CardDescription>과제와 함께 제공되는 퀴즈를 완료하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <QuizViewer
                  assignment={assignment}
                  onQuizComplete={() => {
                    setSuccess("퀴즈가 성공적으로 제출되었습니다!")
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* 제출 섹션 (학생용) */}
          {isStudent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Send className="h-5 w-5 mr-2" />
                  과제 제출
                </CardTitle>
                <CardDescription>
                  {canSubmit
                    ? "아래에 과제 내용을 작성하고 필요한 파일을 첨부한 후 제출하세요."
                    : isSubmitted
                      ? "이미 제출된 과제입니다."
                      : isAssignmentOverdue
                        ? "제출 기한이 지났습니다."
                        : "제출할 수 없습니다."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {canSubmit ? (
                  <>
                    {/* 제출 유형 선택 */}
                    {userGroups.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">제출 유형</Label>
                        <div className="flex space-x-4">
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="submissionType"
                              value="individual"
                              checked={selectedSubmissionType === "individual"}
                              onChange={(e) => {
                                setSelectedSubmissionType(e.target.value as "individual" | "group")
                                setIsGroupSubmission(false)
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-sm">개인 제출</span>
                          </label>
                          <label className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name="submissionType"
                              value="group"
                              checked={selectedSubmissionType === "group"}
                              onChange={(e) => {
                                setSelectedSubmissionType(e.target.value as "individual" | "group")
                                setIsGroupSubmission(true)
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-sm">모둠 제출</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* 모둠 선택 */}
                    {selectedSubmissionType === "group" && userGroups.length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">모둠 선택</Label>
                        <select
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                          className="w-full h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500 bg-white"
                        >
                          <option value="">모둠을 선택하세요</option>
                          {userGroups.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name} ({group.members.length}명)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 텍스트 제출 */}
                    <div className="space-y-3">
                      <Label htmlFor="submissionContent" className="text-sm font-medium text-gray-700">
                        제출 내용
                      </Label>
                      <Textarea
                        id="submissionContent"
                        placeholder="과제 내용을 입력하세요..."
                        value={submissionContent}
                        onChange={(e) => setSubmissionContent(e.target.value)}
                        rows={8}
                        className="resize-none rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    {/* 파일 업로드 */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">첨부 파일</Label>
                      <FileUpload
                        onFilesUploaded={setSubmissionFiles}
                        uploadPath={`submissions/${classId}/${userId}`}
                        uploadedFiles={submissionFiles}
                        maxFiles={10}
                        maxFileSize={1024} // 1GB
                        isAssignmentSubmission={true}
                        acceptedTypes={[
                          "image/*",
                          "application/pdf",
                          ".doc,.docx,.txt,.rtf",
                          ".xls,.xlsx,.csv",
                          ".ppt,.pptx",
                          ".zip,.rar,.7z,.gz,.tar,.bz2,.xz,.tgz",
                          "video/*",
                          "audio/*",
                          ".py,.java,.cpp,.c,.js,.html,.css",
                        ]}
                        onFileRemoved={(fileId) => {
                          setSubmissionFiles(submissionFiles.filter((f) => f.id !== fileId))
                        }}
                      />
                    </div>

                    {/* 제출 버튼 */}
                    <div className="flex justify-end space-x-3">
                      <Button variant="outline" onClick={onClose}>
                        취소
                      </Button>
                      <Button
                        onClick={selectedSubmissionType === "group" ? handleGroupSubmit : handleSubmit}
                        disabled={isSubmitting || (!submissionContent.trim() && submissionFiles.length === 0)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            제출 중...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            {selectedSubmissionType === "group" ? "모둠 과제 제출" : "과제 제출"}
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    {isSubmitted ? (
                      <div className="space-y-4">
                        <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                        <div>
                          <p className="font-medium text-gray-900">과제가 제출되었습니다</p>
                          {submission && (
                            <>
                              <p className="text-sm text-gray-500 mt-2">
                                제출일: {new Date(submission.submittedAt).toLocaleString()}
                              </p>
                              {submission.status === "graded" && submission.grade !== undefined && (
                                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                                  <p className="font-semibold text-green-800">채점 완료</p>
                                  <p className="text-lg font-bold text-green-600">{submission.grade}점</p>
                                  {submission.feedback && (
                                    <div className="mt-3 text-left">
                                      <p className="font-medium text-gray-700 mb-1">교사 피드백:</p>
                                      <p className="text-sm text-gray-600 bg-white p-3 rounded border">
                                        {submission.feedback}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ) : isAssignmentOverdue ? (
                      <div className="space-y-4">
                        <XCircle className="h-12 w-12 mx-auto text-red-500" />
                        <div>
                          <p className="font-medium text-red-600">제출 기한이 지났습니다</p>
                          <p className="text-sm text-gray-500">
                            마감일: {new Date(assignment.dueDate).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <AlertCircle className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="font-medium text-gray-600">제출할 수 없습니다</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 교사용 정보 */}
          {isTeacher && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Eye className="h-5 w-5 mr-2" />
                  제출 현황
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">0</div>
                    <div className="text-sm text-gray-600">총 제출</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">0</div>
                    <div className="text-sm text-gray-600">채점 완료</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">0</div>
                    <div className="text-sm text-gray-600">미제출</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
