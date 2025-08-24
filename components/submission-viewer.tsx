"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText,
  Download,
  Users,
  User,
  Calendar,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Clock,
  CheckCircle,
} from "lucide-react"
import { doc, updateDoc, collection, addDoc, query, where, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/hooks/use-toast"
import { IndividualSubmissionViewer } from "./individual-submission-viewer"

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
  feedback?: string
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
  feedback?: string
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

interface SubmissionViewerProps {
  assignment: Assignment
  submissions?: Submission[]
  groupSubmissions?: GroupSubmission[]
  onClose: () => void
}

export function SubmissionViewer({
  assignment,
  submissions = [],
  groupSubmissions = [],
  onClose,
}: SubmissionViewerProps) {
  const { user } = useAuth()
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | GroupSubmission | null>(null)
  const [expandedFiles, setExpandedFiles] = useState<{ [key: string]: boolean }>({})
  const [comments, setComments] = useState<{ [key: string]: any[] }>({})
  const [newComment, setNewComment] = useState("")
  const [gradingData, setGradingData] = useState<{ [key: string]: { grade: number; feedback: string } }>({})

  // 제출물 정보 슬라이드 상태
  const [showSubmissionInfo, setShowSubmissionInfo] = useState(true)

  const totalSubmissions = (submissions?.length || 0) + (groupSubmissions?.length || 0)
  const gradedCount =
    (submissions?.filter((s) => s.status === "graded")?.length || 0) +
    (groupSubmissions?.filter((s) => s.status === "graded")?.length || 0)
  const lateCount =
    (submissions?.filter((s) => s.isLate)?.length || 0) + (groupSubmissions?.filter((s) => s.isLate)?.length || 0)

  useEffect(() => {
    // 댓글 실시간 구독
    const loadComments = () => {
      const allSubmissions = [...(submissions || []), ...(groupSubmissions || [])]

      allSubmissions.forEach((submission) => {
        const commentsQuery = query(
          collection(db, "submissionComments"),
          where("submissionId", "==", submission.id),
          orderBy("createdAt", "asc"),
        )

        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
          const submissionComments: any[] = []
          snapshot.forEach((doc) => {
            submissionComments.push({ id: doc.id, ...doc.data() })
          })
          setComments((prev) => ({ ...prev, [submission.id]: submissionComments }))
        })

        return unsubscribe
      })
    }

    if (totalSubmissions > 0) {
      loadComments()
    }
  }, [submissions, groupSubmissions, totalSubmissions])

  const handleGradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      const submissionRef = doc(db, assignment.isGroupAssignment ? "groupSubmissions" : "submissions", submissionId)
      await updateDoc(submissionRef, {
        grade,
        feedback,
        status: "graded",
        gradedAt: new Date(),
        gradedBy: user?.uid,
      })

      toast({
        title: "채점 완료",
        description: "제출물이 성공적으로 채점되었습니다.",
      })
    } catch (error) {
      console.error("채점 실패:", error)
      toast({
        title: "채점 실패",
        description: "채점 중 오류가 발생했습니다.",
        variant: "destructive",
      })
    }
  }

  const handleAddComment = async (submissionId: string) => {
    if (!newComment.trim()) return

    try {
      await addDoc(collection(db, "submissionComments"), {
        submissionId,
        assignmentId: assignment.id,
        authorId: user?.uid,
        authorName: user?.displayName || user?.email,
        content: newComment,
        createdAt: new Date(),
      })

      setNewComment("")
      toast({
        title: "댓글 추가됨",
        description: "댓글이 성공적으로 추가되었습니다.",
      })
    } catch (error) {
      console.error("댓글 추가 실패:", error)
      toast({
        title: "댓글 추가 실패",
        description: "댓글 추가 중 오류가 발생했습니다.",
        variant: "destructive",
      })
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

  const toggleFileExpansion = (submissionId: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [submissionId]: !prev[submissionId],
    }))
  }

  const getStatusBadge = (status: string, isLate: boolean) => {
    if (status === "graded") {
      return <Badge className="bg-green-100 text-green-800">채점 완료</Badge>
    }
    if (isLate) {
      return <Badge variant="destructive">지각 제출</Badge>
    }
    return <Badge className="bg-blue-100 text-blue-800">제출됨</Badge>
  }

  if (selectedSubmission) {
    return (
      <IndividualSubmissionViewer
        submission={selectedSubmission}
        assignment={assignment}
        onBack={() => setSelectedSubmission(null)}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-8 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{assignment.title}</h2>
              <p className="text-gray-600 mt-1 flex items-center gap-2">
                <span>제출물 관리</span>
                <Badge variant="outline" className="text-xs">
                  {assignment.isGroupAssignment ? "그룹 과제" : "개인 과제"}
                </Badge>
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={onClose}
            className="hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors bg-transparent"
          >
            닫기
          </Button>
        </div>

        {/* 제출물 정보 슬라이드 */}
        <div
          className={`border-b bg-gradient-to-r from-gray-50 to-blue-50/30 transition-all duration-300 ${showSubmissionInfo ? "max-h-40" : "max-h-14"} overflow-hidden`}
        >
          <ScrollArea className="h-full">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-blue-100">
                    <div className="text-3xl font-bold text-blue-600 mb-1">{totalSubmissions}</div>
                    <div className="text-sm text-gray-600 font-medium">총 제출물</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-green-100">
                    <div className="text-3xl font-bold text-green-600 mb-1">{gradedCount}</div>
                    <div className="text-sm text-gray-600 font-medium">채점 완료</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-red-100">
                    <div className="text-3xl font-bold text-red-600 mb-1">{lateCount}</div>
                    <div className="text-sm text-gray-600 font-medium">지각 제출</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl shadow-sm border border-orange-100">
                    <div className="text-3xl font-bold text-orange-600 mb-1">{totalSubmissions - gradedCount}</div>
                    <div className="text-sm text-gray-600 font-medium">채점 대기</div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSubmissionInfo(!showSubmissionInfo)}
                  className="flex items-center gap-2 hover:bg-white/80 rounded-lg px-4 py-2"
                >
                  {showSubmissionInfo ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      숨기기
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      보기
                    </>
                  )}
                </Button>
              </div>

              {showSubmissionInfo && (
                <div className="mt-6 grid grid-cols-2 gap-6 text-sm">
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <span className="font-semibold text-gray-700">마감일:</span>
                    <p className="text-gray-600 mt-1">{formatDate(assignment.dueDate)}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <span className="font-semibold text-gray-700">만점:</span>
                    <p className="text-gray-600 mt-1">{assignment.maxScore}점</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <span className="font-semibold text-gray-700">과제 유형:</span>
                    <p className="text-gray-600 mt-1">{assignment.isGroupAssignment ? "그룹 과제" : "개인 과제"}</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <span className="font-semibold text-gray-700">채점률:</span>
                    <p className="text-gray-600 mt-1">
                      {totalSubmissions > 0 ? Math.round((gradedCount / totalSubmissions) * 100) : 0}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-hidden bg-gray-50/30">
          <Tabs defaultValue={assignment.isGroupAssignment ? "group" : "individual"} className="h-full flex flex-col">
            <div className="px-8 pt-6">
              <TabsList className="bg-white shadow-sm border border-gray-200 p-1">
                {!assignment.isGroupAssignment && (
                  <TabsTrigger
                    value="individual"
                    className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg px-4 py-2"
                  >
                    <User className="h-4 w-4" />
                    개인 제출물 ({submissions?.length || 0})
                  </TabsTrigger>
                )}
                {assignment.isGroupAssignment && (
                  <TabsTrigger
                    value="group"
                    className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-lg px-4 py-2"
                  >
                    <Users className="h-4 w-4" />
                    그룹 제출물 ({groupSubmissions?.length || 0})
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            <div className="flex-1 overflow-hidden px-8 pb-8">
              {!assignment.isGroupAssignment && (
                <TabsContent value="individual" className="h-full mt-6">
                  <ScrollArea className="h-full">
                    <div className="space-y-6">
                      {submissions && submissions.length > 0 ? (
                        submissions.map((submission) => (
                          <Card
                            key={submission.id}
                            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:scale-[1.02] bg-white overflow-hidden"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <Avatar className="h-16 w-16 ring-4 ring-blue-100 shadow-lg">
                                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-bold">
                                        {submission.studentName?.[0]?.toUpperCase() || "?"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                      {submission.status === "graded" ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Clock className="h-4 w-4 text-orange-500" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-bold text-xl text-gray-900 mb-2">{submission.studentName}</h3>
                                    <p className="text-gray-600 mb-3">{submission.studentEmail}</p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(submission.submittedAt)}
                                      </div>
                                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                                        <FileText className="h-4 w-4" />
                                        {submission.files?.length || 0}개 파일
                                      </div>
                                      {comments[submission.id] && (
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                                          <MessageSquare className="h-4 w-4" />
                                          {comments[submission.id].length}개 댓글
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                  {getStatusBadge(submission.status, submission.isLate)}
                                  {submission.grade !== undefined ? (
                                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                      {submission.grade}/{assignment.maxScore}점
                                    </div>
                                  ) : (
                                    <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-medium">
                                      미채점
                                    </div>
                                  )}
                                </div>
                              </div>

                              {submission.content && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-400">
                                  <p className="text-gray-700 line-clamp-2 leading-relaxed">{submission.content}</p>
                                </div>
                              )}

                              {submission.feedback && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-400">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-semibold text-green-800">교사 피드백</span>
                                  </div>
                                  <p className="text-green-700 line-clamp-2 leading-relaxed">{submission.feedback}</p>
                                </div>
                              )}

                              {submission.status === "submitted" && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border-l-4 border-orange-400">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-semibold text-orange-800">채점 대기 중</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-3">
                                  {submission.files && submission.files.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleFileExpansion(submission.id)
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg px-3 py-2"
                                    >
                                      {expandedFiles[submission.id] ? (
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                      )}
                                      파일 {expandedFiles[submission.id] ? "숨기기" : "보기"}
                                    </Button>
                                  )}
                                </div>

                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSubmission(submission)
                                  }}
                                >
                                  상세보기 & 채점
                                </Button>
                              </div>

                              {submission.files && submission.files.length > 0 && expandedFiles[submission.id] && (
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                  <div className="space-y-3">
                                    {submission.files.map((file, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50/30 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                                      >
                                        <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                                            <FileText className="h-6 w-6 text-white" />
                                          </div>
                                          <div>
                                            <p className="font-medium text-gray-900">{file.name}</p>
                                            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(file.url, "_blank")
                                          }}
                                          className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-lg"
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          다운로드
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-20">
                          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <FileText className="h-12 w-12 text-gray-400" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-3">제출물이 없습니다</h3>
                          <p className="text-gray-500 text-lg">아직 제출된 과제가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {assignment.isGroupAssignment && (
                <TabsContent value="group" className="h-full mt-6">
                  <ScrollArea className="h-full">
                    <div className="space-y-6">
                      {groupSubmissions && groupSubmissions.length > 0 ? (
                        groupSubmissions.map((submission) => (
                          <Card
                            key={submission.id}
                            className="cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:scale-[1.02] bg-white overflow-hidden"
                            onClick={() => setSelectedSubmission(submission)}
                          >
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="relative">
                                    <Avatar className="h-16 w-16 ring-4 ring-purple-100 shadow-lg">
                                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xl font-bold">
                                        {submission.groupName?.[0]?.toUpperCase() || "G"}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                                      {submission.status === "graded" ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <Clock className="h-4 w-4 text-orange-500" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-bold text-xl text-gray-900 mb-2">{submission.groupName}</h3>
                                    <p className="text-gray-600 mb-3">
                                      {submission.members?.length || 0}명 그룹 • 제출자: {submission.submittedByName}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                                        <Calendar className="h-4 w-4" />
                                        {formatDate(submission.submittedAt)}
                                      </div>
                                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                                        <FileText className="h-4 w-4" />
                                        {submission.files?.length || 0}개 파일
                                      </div>
                                      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                                        <Users className="h-4 w-4" />
                                        {submission.members?.length || 0}명
                                      </div>
                                      {comments[submission.id] && (
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-full">
                                          <MessageSquare className="h-4 w-4" />
                                          {comments[submission.id].length}개 댓글
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                  {getStatusBadge(submission.status, submission.isLate)}
                                  {submission.grade !== undefined ? (
                                    <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                      {submission.grade}/{assignment.maxScore}점
                                    </div>
                                  ) : (
                                    <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm font-medium">
                                      미채점
                                    </div>
                                  )}
                                </div>
                              </div>

                              {submission.members && submission.members.length > 0 && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-l-4 border-purple-400">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Users className="h-4 w-4 text-purple-600" />
                                    <span className="text-sm font-semibold text-purple-800">그룹 멤버</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {submission.members.map((member, index) => (
                                      <div
                                        key={index}
                                        className="bg-white px-3 py-1 rounded-full text-sm font-medium text-purple-700 border border-purple-200 shadow-sm"
                                      >
                                        {member.name}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {submission.content && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-l-4 border-purple-400">
                                  <p className="text-gray-700 line-clamp-2 leading-relaxed">{submission.content}</p>
                                </div>
                              )}

                              {submission.feedback && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-l-4 border-green-400">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-sm font-semibold text-green-800">교사 피드백</span>
                                  </div>
                                  <p className="text-green-700 line-clamp-2 leading-relaxed">{submission.feedback}</p>
                                </div>
                              )}

                              {submission.status === "submitted" && (
                                <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border-l-4 border-orange-400">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-semibold text-orange-800">채점 대기 중</span>
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-3">
                                  {submission.files && submission.files.length > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleFileExpansion(submission.id)
                                      }}
                                      className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg px-3 py-2"
                                    >
                                      {expandedFiles[submission.id] ? (
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                      )}
                                      파일 {expandedFiles[submission.id] ? "숨기기" : "보기"}
                                    </Button>
                                  )}
                                </div>

                                <Button
                                  size="sm"
                                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-2 rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedSubmission(submission)
                                  }}
                                >
                                  상세보기 & 채점
                                </Button>
                              </div>

                              {submission.files && submission.files.length > 0 && expandedFiles[submission.id] && (
                                <div className="mt-6 pt-4 border-t border-gray-100">
                                  <div className="space-y-3">
                                    {submission.files.map((file, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-purple-50/30 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors"
                                      >
                                        <div className="flex items-center gap-4">
                                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                                            <FileText className="h-6 w-6 text-white" />
                                          </div>
                                          <div>
                                            <p className="font-medium text-gray-900">{file.name}</p>
                                            <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                                          </div>
                                        </div>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(file.url, "_blank")
                                          }}
                                          className="hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 rounded-lg"
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          다운로드
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <div className="text-center py-20">
                          <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Users className="h-12 w-12 text-gray-400" />
                          </div>
                          <h3 className="text-2xl font-semibold text-gray-900 mb-3">그룹 제출물이 없습니다</h3>
                          <p className="text-gray-500 text-lg">아직 제출된 그룹 과제가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
