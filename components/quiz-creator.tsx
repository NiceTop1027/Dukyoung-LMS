"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2, Save, X, HelpCircle, AlertTriangle } from "lucide-react"

export interface QuizQuestion {
  id: string
  type: "multiple-choice" | "true-false" | "short-answer"
  question: string
  options?: string[]
  correctAnswer: string | number
  points: number
  explanation?: string
}

export interface Quiz {
  id: string
  title: string
  description?: string
  questions: QuizQuestion[]
  totalPoints: number
  passingScore: number // percentage
  timeLimit?: number // minutes
  allowRetake: boolean
  showResults: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
}

interface QuizCreatorProps {
  quiz?: Quiz
  onSave: (quiz: Quiz) => void
  onCancel: () => void
}

export function QuizCreator({ quiz, onSave, onCancel }: QuizCreatorProps) {
  const [quizData, setQuizData] = useState<Quiz>({
    id: quiz?.id || `quiz_${Date.now()}`,
    title: quiz?.title || "",
    description: quiz?.description || "",
    questions: quiz?.questions || [],
    totalPoints: quiz?.totalPoints || 0,
    passingScore: quiz?.passingScore || 60,
    timeLimit: quiz?.timeLimit,
    allowRetake: quiz?.allowRetake || false,
    showResults: quiz?.showResults || true,
    shuffleQuestions: quiz?.shuffleQuestions || false,
    shuffleOptions: quiz?.shuffleOptions || false,
  })

  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion>({
    id: `question_${Date.now()}`,
    type: "multiple-choice",
    question: "",
    options: ["", ""],
    correctAnswer: 0,
    points: 1,
    explanation: "",
  })

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("questions")

  // 총 점수 계산
  const calculateTotalPoints = (questions: QuizQuestion[]) => {
    return questions.reduce((total, q) => total + q.points, 0)
  }

  // 문제 추가/수정
  const handleSaveQuestion = () => {
    if (!currentQuestion.question.trim()) {
      setError("문제를 입력해주세요.")
      return
    }

    if (currentQuestion.type === "multiple-choice") {
      if (currentQuestion.options!.some((opt) => !opt.trim())) {
        setError("모든 선택지를 입력해주세요.")
        return
      }
      if (currentQuestion.options!.length < 2) {
        setError("선택지는 최소 2개 이상이어야 합니다.")
        return
      }
    }

    if (currentQuestion.type === "short-answer" && !currentQuestion.correctAnswer) {
      setError("정답을 입력해주세요.")
      return
    }

    setError("")

    const newQuestions = [...quizData.questions]
    if (editingIndex !== null) {
      newQuestions[editingIndex] = { ...currentQuestion }
    } else {
      newQuestions.push({ ...currentQuestion, id: `question_${Date.now()}` })
    }

    setQuizData({
      ...quizData,
      questions: newQuestions,
      totalPoints: calculateTotalPoints(newQuestions),
    })

    // 폼 초기화
    setCurrentQuestion({
      id: `question_${Date.now()}`,
      type: "multiple-choice",
      question: "",
      options: ["", ""],
      correctAnswer: 0,
      points: 1,
      explanation: "",
    })
    setEditingIndex(null)
  }

  // 문제 삭제
  const handleDeleteQuestion = (index: number) => {
    const newQuestions = quizData.questions.filter((_, i) => i !== index)
    setQuizData({
      ...quizData,
      questions: newQuestions,
      totalPoints: calculateTotalPoints(newQuestions),
    })
  }

  // 문제 편집
  const handleEditQuestion = (index: number) => {
    setCurrentQuestion({ ...quizData.questions[index] })
    setEditingIndex(index)
    setActiveTab("questions")
  }

  // 선택지 추가
  const addOption = () => {
    if (currentQuestion.options && currentQuestion.options.length < 6) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, ""],
      })
    }
  }

  // 선택지 삭제
  const removeOption = (index: number) => {
    if (currentQuestion.options && currentQuestion.options.length > 2) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== index)
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions,
        correctAnswer: currentQuestion.correctAnswer === index ? 0 : currentQuestion.correctAnswer,
      })
    }
  }

  // 선택지 업데이트
  const updateOption = (index: number, value: string) => {
    if (currentQuestion.options) {
      const newOptions = [...currentQuestion.options]
      newOptions[index] = value
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions,
      })
    }
  }

  // 퀴즈 저장
  const handleSaveQuiz = () => {
    if (!quizData.title.trim()) {
      setError("퀴즈 제목을 입력해주세요.")
      return
    }

    if (quizData.questions.length === 0) {
      setError("최소 1개 이상의 문제를 추가해주세요.")
      return
    }

    setError("")
    onSave(quizData)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">퀴즈 만들기</h2>
          <p className="text-gray-600">학생들을 위한 퀴즈를 생성하세요</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={onCancel} variant="outline">
            <X className="h-4 w-4 mr-2" />
            취소
          </Button>
          <Button onClick={handleSaveQuiz} className="bg-gradient-to-r from-blue-500 to-indigo-500">
            <Save className="h-4 w-4 mr-2" />
            저장
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">기본 정보</TabsTrigger>
          <TabsTrigger value="questions">문제 관리</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>퀴즈 기본 정보</CardTitle>
              <CardDescription>퀴즈의 제목과 설명을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">퀴즈 제목</Label>
                <Input
                  id="title"
                  value={quizData.title}
                  onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                  placeholder="퀴즈 제목을 입력하세요"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">퀴즈 설명 (선택사항)</Label>
                <Textarea
                  id="description"
                  value={quizData.description}
                  onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                  placeholder="퀴즈에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>총 문제 수</Label>
                  <div className="text-2xl font-bold text-blue-600">{quizData.questions.length}</div>
                </div>
                <div className="space-y-2">
                  <Label>총 점수</Label>
                  <div className="text-2xl font-bold text-green-600">{quizData.totalPoints}점</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          {/* 문제 추가/편집 폼 */}
          <Card>
            <CardHeader>
              <CardTitle>{editingIndex !== null ? "문제 편집" : "새 문제 추가"}</CardTitle>
              <CardDescription>문제 유형을 선택하고 내용을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>문제 유형</Label>
                  <Select
                    value={currentQuestion.type}
                    onValueChange={(value: "multiple-choice" | "true-false" | "short-answer") =>
                      setCurrentQuestion({
                        ...currentQuestion,
                        type: value,
                        options:
                          value === "multiple-choice" ? ["", ""] : value === "true-false" ? ["참", "거짓"] : undefined,
                        correctAnswer: value === "true-false" ? 0 : value === "short-answer" ? "" : 0,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">객관식</SelectItem>
                      <SelectItem value="true-false">O/X</SelectItem>
                      <SelectItem value="short-answer">주관식</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>배점</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={currentQuestion.points}
                    onChange={(e) =>
                      setCurrentQuestion({ ...currentQuestion, points: Number.parseInt(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>문제</Label>
                <Textarea
                  value={currentQuestion.question}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, question: e.target.value })}
                  placeholder="문제를 입력하세요"
                  rows={3}
                />
              </div>

              {/* 객관식 선택지 */}
              {currentQuestion.type === "multiple-choice" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>선택지</Label>
                    <Button
                      onClick={addOption}
                      size="sm"
                      variant="outline"
                      disabled={currentQuestion.options!.length >= 6}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      선택지 추가
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {currentQuestion.options!.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={currentQuestion.correctAnswer === index}
                          onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: index })}
                          className="text-blue-600"
                        />
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`선택지 ${index + 1}`}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => removeOption(index)}
                          size="sm"
                          variant="ghost"
                          disabled={currentQuestion.options!.length <= 2}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* O/X 정답 */}
              {currentQuestion.type === "true-false" && (
                <div className="space-y-2">
                  <Label>정답</Label>
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="tfAnswer"
                        checked={currentQuestion.correctAnswer === 0}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: 0 })}
                        className="text-blue-600"
                      />
                      <span>참 (O)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="tfAnswer"
                        checked={currentQuestion.correctAnswer === 1}
                        onChange={() => setCurrentQuestion({ ...currentQuestion, correctAnswer: 1 })}
                        className="text-blue-600"
                      />
                      <span>거짓 (X)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 주관식 정답 */}
              {currentQuestion.type === "short-answer" && (
                <div className="space-y-2">
                  <Label>정답</Label>
                  <Input
                    value={currentQuestion.correctAnswer as string}
                    onChange={(e) => setCurrentQuestion({ ...currentQuestion, correctAnswer: e.target.value })}
                    placeholder="정답을 입력하세요"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>해설 (선택사항)</Label>
                <Textarea
                  value={currentQuestion.explanation}
                  onChange={(e) => setCurrentQuestion({ ...currentQuestion, explanation: e.target.value })}
                  placeholder="문제에 대한 해설을 입력하세요"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-2">
                {editingIndex !== null && (
                  <Button
                    onClick={() => {
                      setCurrentQuestion({
                        id: `question_${Date.now()}`,
                        type: "multiple-choice",
                        question: "",
                        options: ["", ""],
                        correctAnswer: 0,
                        points: 1,
                        explanation: "",
                      })
                      setEditingIndex(null)
                    }}
                    variant="outline"
                  >
                    취소
                  </Button>
                )}
                <Button onClick={handleSaveQuestion}>{editingIndex !== null ? "수정" : "추가"}</Button>
              </div>
            </CardContent>
          </Card>

          {/* 문제 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>문제 목록 ({quizData.questions.length}개)</CardTitle>
              <CardDescription>생성된 문제들을 확인하고 편집할 수 있습니다</CardDescription>
            </CardHeader>
            <CardContent>
              {quizData.questions.length > 0 ? (
                <div className="space-y-3">
                  {quizData.questions.map((question, index) => (
                    <div key={question.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline">
                              {question.type === "multiple-choice"
                                ? "객관식"
                                : question.type === "true-false"
                                  ? "O/X"
                                  : "주관식"}
                            </Badge>
                            <Badge variant="secondary">{question.points}점</Badge>
                          </div>
                          <p className="font-medium mb-2">{question.question}</p>
                          {question.type === "multiple-choice" && (
                            <div className="text-sm text-gray-600">
                              정답: {question.options![question.correctAnswer as number]}
                            </div>
                          )}
                          {question.type === "true-false" && (
                            <div className="text-sm text-gray-600">
                              정답: {question.correctAnswer === 0 ? "참 (O)" : "거짓 (X)"}
                            </div>
                          )}
                          {question.type === "short-answer" && (
                            <div className="text-sm text-gray-600">정답: {question.correctAnswer}</div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={() => handleEditQuestion(index)} size="sm" variant="outline">
                            편집
                          </Button>
                          <Button
                            onClick={() => handleDeleteQuestion(index)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>아직 문제가 없습니다. 새 문제를 추가해보세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>퀴즈 설정</CardTitle>
              <CardDescription>퀴즈의 채점 및 진행 방식을 설정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passingScore">합격 점수 (%)</Label>
                  <Input
                    id="passingScore"
                    type="number"
                    min="0"
                    max="100"
                    value={quizData.passingScore}
                    onChange={(e) => setQuizData({ ...quizData, passingScore: Number.parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">제한 시간 (분, 선택사항)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="1"
                    max="180"
                    value={quizData.timeLimit || ""}
                    onChange={(e) =>
                      setQuizData({
                        ...quizData,
                        timeLimit: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder="제한 없음"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allowRetake"
                    checked={quizData.allowRetake}
                    onCheckedChange={(checked) => setQuizData({ ...quizData, allowRetake: checked as boolean })}
                  />
                  <Label htmlFor="allowRetake" className="cursor-pointer">
                    재시도 허용
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showResults"
                    checked={quizData.showResults}
                    onCheckedChange={(checked) => setQuizData({ ...quizData, showResults: checked as boolean })}
                  />
                  <Label htmlFor="showResults" className="cursor-pointer">
                    결과 즉시 공개
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffleQuestions"
                    checked={quizData.shuffleQuestions}
                    onCheckedChange={(checked) => setQuizData({ ...quizData, shuffleQuestions: checked as boolean })}
                  />
                  <Label htmlFor="shuffleQuestions" className="cursor-pointer">
                    문제 순서 섞기
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="shuffleOptions"
                    checked={quizData.shuffleOptions}
                    onCheckedChange={(checked) => setQuizData({ ...quizData, shuffleOptions: checked as boolean })}
                  />
                  <Label htmlFor="shuffleOptions" className="cursor-pointer">
                    선택지 순서 섞기 (객관식)
                  </Label>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">퀴즈 요약</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">총 문제:</span>
                    <span className="ml-2 font-medium">{quizData.questions.length}개</span>
                  </div>
                  <div>
                    <span className="text-blue-600">총 점수:</span>
                    <span className="ml-2 font-medium">{quizData.totalPoints}점</span>
                  </div>
                  <div>
                    <span className="text-blue-600">합격 점수:</span>
                    <span className="ml-2 font-medium">
                      {Math.ceil((quizData.totalPoints * quizData.passingScore) / 100)}점 ({quizData.passingScore}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600">제한 시간:</span>
                    <span className="ml-2 font-medium">
                      {quizData.timeLimit ? `${quizData.timeLimit}분` : "제한 없음"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
