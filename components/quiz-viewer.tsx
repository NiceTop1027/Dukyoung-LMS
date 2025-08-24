"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Clock, CheckCircle, XCircle, HelpCircle, Trophy, RotateCcw, Send } from "lucide-react"
import type { Quiz, QuizQuestion } from "./quiz-creator"

export interface QuizAnswer {
  questionId: string
  answer: string | number
}

export interface QuizAttempt {
  id: string
  quizId: string
  studentId: string
  studentName: string
  answers: QuizAnswer[]
  score: number
  totalPoints: number
  percentage: number
  passed: boolean
  timeSpent: number // seconds
  submittedAt: Date
  showResults: boolean
}

interface QuizViewerProps {
  quiz: Quiz
  isOpen: boolean
  onClose: () => void
  onSubmit: (attempt: QuizAttempt) => void
  studentId: string
  studentName: string
  existingAttempt?: QuizAttempt
}

export function QuizViewer({
  quiz,
  isOpen,
  onClose,
  onSubmit,
  studentId,
  studentName,
  existingAttempt,
}: QuizViewerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])

  // 퀴즈 초기화
  useEffect(() => {
    if (isOpen && quiz) {
      // 문제 순서 섞기
      const shuffledQuestions = quiz.shuffleQuestions
        ? [...quiz.questions].sort(() => Math.random() - 0.5)
        : quiz.questions

      // 선택지 순서 섞기
      const processedQuestions = shuffledQuestions.map((q) => {
        if (q.type === "multiple-choice" && quiz.shuffleOptions && q.options) {
          const shuffledOptions = [...q.options]
          const correctIndex = q.correctAnswer as number
          const correctOption = shuffledOptions[correctIndex]

          // 선택지 섞기
          shuffledOptions.sort(() => Math.random() - 0.5)

          // 새로운 정답 인덱스 찾기
          const newCorrectIndex = shuffledOptions.indexOf(correctOption)

          return {
            ...q,
            options: shuffledOptions,
            correctAnswer: newCorrectIndex,
          }
        }
        return q
      })

      setQuestions(processedQuestions)
      setAnswers([])
      setCurrentQuestionIndex(0)
      setIsSubmitted(false)
      setShowResults(false)
      setStartTime(new Date())

      // 제한 시간 설정
      if (quiz.timeLimit) {
        setTimeLeft(quiz.timeLimit * 60) // 분을 초로 변환
      }

      // 기존 시도가 있는 경우 결과 보기 모드
      if (existingAttempt) {
        setIsSubmitted(true)
        setShowResults(true)
        setAnswers(existingAttempt.answers)
      }
    }
  }, [isOpen, quiz, existingAttempt])

  // 타이머
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev && prev <= 1) {
            handleSubmit() // 시간 종료 시 자동 제출
            return 0
          }
          return prev ? prev - 1 : 0
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [timeLeft, isSubmitted])

  // 답안 저장
  const handleAnswerChange = (questionId: string, answer: string | number) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) => (a.questionId === questionId ? { ...a, answer } : a))
      }
      return [...prev, { questionId, answer }]
    })
  }

  // 현재 문제의 답안 가져오기
  const getCurrentAnswer = (questionId: string) => {
    return answers.find((a) => a.questionId === questionId)?.answer
  }

  // 채점
  const calculateScore = () => {
    let score = 0
    questions.forEach((question) => {
      const answer = answers.find((a) => a.questionId === question.id)
      if (answer) {
        if (question.type === "short-answer") {
          // 주관식은 대소문자 구분 없이 비교
          if (
            typeof answer.answer === "string" &&
            typeof question.correctAnswer === "string" &&
            answer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
          ) {
            score += question.points
          }
        } else {
          // 객관식, O/X는 정확히 일치해야 함
          if (answer.answer === question.correctAnswer) {
            score += question.points
          }
        }
      }
    })
    return score
  }

  // 제출
  const handleSubmit = () => {
    if (isSubmitted) return

    const score = calculateScore()
    const percentage = Math.round((score / quiz.totalPoints) * 100)
    const passed = percentage >= quiz.passingScore
    const timeSpent = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0

    const attempt: QuizAttempt = {
      id: `attempt_${Date.now()}`,
      quizId: quiz.id,
      studentId,
      studentName,
      answers,
      score,
      totalPoints: quiz.totalPoints,
      percentage,
      passed,
      timeSpent,
      submittedAt: new Date(),
      showResults: quiz.showResults,
    }

    setIsSubmitted(true)
    if (quiz.showResults) {
      setShowResults(true)
    }

    onSubmit(attempt)
  }

  // 시간 포맷팅
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  if (!currentQuestion && !showResults) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <HelpCircle className="h-5 w-5" />
              <span>{quiz.title}</span>
            </div>
            {timeLeft !== null && !isSubmitted && (
              <Badge variant={timeLeft < 300 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
                <Clock className="h-4 w-4 mr-1" />
                {formatTime(timeLeft)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* 결과 보기 모드 */}
        {showResults && existingAttempt && (
          <div className="space-y-6">
            {/* 결과 요약 */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-0">
              <CardHeader>
                <CardTitle className="flex items-center justify-center space-x-2">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                  <span>퀴즈 결과</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{existingAttempt.score}</div>
                    <div className="text-sm text-gray-600">획득 점수</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">{existingAttempt.totalPoints}</div>
                    <div className="text-sm text-gray-600">총 점수</div>
                  </div>
                  <div>
                    <div className={`text-3xl font-bold ${existingAttempt.passed ? "text-green-600" : "text-red-600"}`}>
                      {existingAttempt.percentage}%
                    </div>
                    <div className="text-sm text-gray-600">정답률</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-blue-600">
                      {Math.floor(existingAttempt.timeSpent / 60)}:
                      {(existingAttempt.timeSpent % 60).toString().padStart(2, "0")}
                    </div>
                    <div className="text-sm text-gray-600">소요 시간</div>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <Badge
                    className={`text-xl px-6 py-3 ${existingAttempt.passed ? "bg-green-500" : "bg-red-500"} text-white`}
                  >
                    {existingAttempt.passed ? "합격" : "불합격"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* 문제별 결과 */}
            <Card>
              <CardHeader>
                <CardTitle>문제별 결과</CardTitle>
                <CardDescription>각 문제의 정답과 해설을 확인하세요</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question, index) => {
                  const userAnswer = existingAttempt.answers.find((a) => a.questionId === question.id)
                  const isCorrect =
                    question.type === "short-answer"
                      ? typeof userAnswer?.answer === "string" &&
                        typeof question.correctAnswer === "string" &&
                        userAnswer.answer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim()
                      : userAnswer?.answer === question.correctAnswer

                  return (
                    <div
                      key={question.id}
                      className={`p-4 rounded-lg border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">문제 {index + 1}</Badge>
                          <Badge variant="secondary">{question.points}점</Badge>
                          {isCorrect ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div className={`text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                          {isCorrect ? "정답" : "오답"}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="font-medium">{question.question}</p>

                        {question.type === "multiple-choice" && (
                          <div className="space-y-2">
                            {question.options!.map((option, optIndex) => (
                              <div
                                key={optIndex}
                                className={`p-2 rounded border ${
                                  optIndex === question.correctAnswer
                                    ? "bg-green-100 border-green-300"
                                    : optIndex === userAnswer?.answer
                                      ? "bg-red-100 border-red-300"
                                      : "bg-gray-50 border-gray-200"
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium">{optIndex + 1}.</span>
                                  <span>{option}</span>
                                  {optIndex === question.correctAnswer && (
                                    <CheckCircle className="h-4 w-4 text-green-600 ml-auto" />
                                  )}
                                  {optIndex === userAnswer?.answer && optIndex !== question.correctAnswer && (
                                    <XCircle className="h-4 w-4 text-red-600 ml-auto" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === "true-false" && (
                          <div className="space-y-2">
                            <div
                              className={`p-2 rounded border ${question.correctAnswer === 0 ? "bg-green-100 border-green-300" : userAnswer?.answer === 0 ? "bg-red-100 border-red-300" : "bg-gray-50 border-gray-200"}`}
                            >
                              <div className="flex items-center justify-between">
                                <span>참 (O)</span>
                                {question.correctAnswer === 0 && <CheckCircle className="h-4 w-4 text-green-600" />}
                                {userAnswer?.answer === 0 && question.correctAnswer !== 0 && (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                            </div>
                            <div
                              className={`p-2 rounded border ${question.correctAnswer === 1 ? "bg-green-100 border-green-300" : userAnswer?.answer === 1 ? "bg-red-100 border-red-300" : "bg-gray-50 border-gray-200"}`}
                            >
                              <div className="flex items-center justify-between">
                                <span>거짓 (X)</span>
                                {question.correctAnswer === 1 && <CheckCircle className="h-4 w-4 text-green-600" />}
                                {userAnswer?.answer === 1 && question.correctAnswer !== 1 && (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {question.type === "short-answer" && (
                          <div className="space-y-2">
                            <div className="p-2 bg-gray-50 rounded border">
                              <span className="text-sm text-gray-600">내 답안: </span>
                              <span className={isCorrect ? "text-green-600 font-medium" : "text-red-600"}>
                                {userAnswer?.answer || "답안 없음"}
                              </span>
                            </div>
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <span className="text-sm text-gray-600">정답: </span>
                              <span className="text-green-600 font-medium">{question.correctAnswer}</span>
                            </div>
                          </div>
                        )}

                        {question.explanation && (
                          <div className="p-3 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-start space-x-2">
                              <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-blue-800 mb-1">해설</div>
                                <div className="text-sm text-blue-700">{question.explanation}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* 재시도 버튼 */}
            {quiz.allowRetake && (
              <div className="flex justify-center">
                <Button
                  onClick={() => {
                    setShowResults(false)
                    setIsSubmitted(false)
                    setAnswers([])
                    setCurrentQuestionIndex(0)
                    setStartTime(new Date())
                    if (quiz.timeLimit) {
                      setTimeLeft(quiz.timeLimit * 60)
                    }
                  }}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  다시 풀기
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 퀴즈 풀기 모드 */}
        {!showResults && currentQuestion && (
          <div className="space-y-6">
            {/* 진행률 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>
                  문제 {currentQuestionIndex + 1} / {questions.length}
                </span>
                <span>{Math.round(progress)}% 완료</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* 퀴즈 설명 */}
            {currentQuestionIndex === 0 && quiz.description && (
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>{quiz.description}</AlertDescription>
              </Alert>
            )}

            {/* 현재 문제 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Badge variant="outline">
                      {currentQuestion.type === "multiple-choice"
                        ? "객관식"
                        : currentQuestion.type === "true-false"
                          ? "O/X"
                          : "주관식"}
                    </Badge>
                    <Badge variant="secondary">{currentQuestion.points}점</Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-lg font-medium">{currentQuestion.question}</p>

                {/* 객관식 */}
                {currentQuestion.type === "multiple-choice" && (
                  <div className="space-y-2">
                    {currentQuestion.options!.map((option, index) => (
                      <label
                        key={index}
                        className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name={`question_${currentQuestion.id}`}
                          value={index}
                          checked={getCurrentAnswer(currentQuestion.id) === index}
                          onChange={() => handleAnswerChange(currentQuestion.id, index)}
                          className="text-blue-600"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* O/X */}
                {currentQuestion.type === "true-false" && (
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`question_${currentQuestion.id}`}
                        value={0}
                        checked={getCurrentAnswer(currentQuestion.id) === 0}
                        onChange={() => handleAnswerChange(currentQuestion.id, 0)}
                        className="text-blue-600"
                      />
                      <span>참 (O)</span>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name={`question_${currentQuestion.id}`}
                        value={1}
                        checked={getCurrentAnswer(currentQuestion.id) === 1}
                        onChange={() => handleAnswerChange(currentQuestion.id, 1)}
                        className="text-blue-600"
                      />
                      <span>거짓 (X)</span>
                    </label>
                  </div>
                )}

                {/* 주관식 */}
                {currentQuestion.type === "short-answer" && (
                  <div className="space-y-2">
                    <Label>답안을 입력하세요</Label>
                    <Input
                      value={(getCurrentAnswer(currentQuestion.id) as string) || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="답안을 입력하세요"
                      className="text-lg"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 네비게이션 */}
            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                이전 문제
              </Button>

              <div className="flex space-x-2">
                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    disabled={!getCurrentAnswer(currentQuestion.id)}
                  >
                    다음 문제
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={answers.length !== questions.length}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    제출하기
                  </Button>
                )}
              </div>
            </div>

            {/* 답안 현황 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">답안 현황</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                  {questions.map((_, index) => (
                    <Button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      variant={index === currentQuestionIndex ? "default" : "outline"}
                      size="sm"
                      className={`h-8 w-8 p-0 ${
                        getCurrentAnswer(questions[index].id) !== undefined
                          ? "bg-green-100 border-green-300 text-green-700"
                          : ""
                      }`}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  답안 완료: {answers.length} / {questions.length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
