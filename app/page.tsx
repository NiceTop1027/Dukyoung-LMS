"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Users, Award, TrendingUp, ArrowRight, Target, Zap, Shield, Globe, Smartphone } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  const [activeFeature, setActiveFeature] = useState(0)

  const features = [
    {
      icon: BookOpen,
      title: "학습 관리 시스템",
      description:
        "과제 배정부터 제출까지 체계적인 학습 관리를 제공합니다. 교사는 쉽게 과제를 생성하고 학생들의 제출 현황을 확인할 수 있습니다.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: Users,
      title: "실시간 협업",
      description:
        "교사와 학생 간의 원활한 소통을 지원합니다. 반별 관리와 그룹 활동을 통해 효과적인 학습 환경을 제공합니다.",
      color: "from-green-500 to-emerald-500",
    },
    {
      icon: Award,
      title: "성과 관리",
      description:
        "학습 진도와 과제 제출 현황을 한눈에 파악할 수 있습니다. 개별 학생의 학습 상황을 체계적으로 관리합니다.",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: TrendingUp,
      title: "진도 추적",
      description: "개별 학생의 학습 진도를 실시간으로 추적하고 필요한 피드백을 제공할 수 있습니다.",
      color: "from-orange-500 to-red-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl shadow-xl border-b border-white/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-blue-100">
                <Image
                  src="/images/school-logo.png"
                  alt="덕영고등학교 로고"
                  fill
                  className="object-contain p-1"
                  priority
                />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  덕영고등학교 LMS
                </h1>
                <p className="text-sm text-gray-600 font-medium">학습 관리 시스템</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" asChild className="hover:bg-blue-50 font-semibold">
                <Link href="/login">로그인</Link>
              </Button>
              <Button
                asChild
                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
              >
                <Link href="/login">시작하기</Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full opacity-20 animate-pulse" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full opacity-20 animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-10 animate-in slide-in-from-left duration-700">
              <div className="space-y-6">
                <Badge className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white border-0 px-6 py-3 text-sm font-semibold shadow-lg">
                  <Zap className="h-4 w-4 mr-2" />웹 기반 학습 관리 플랫폼
                </Badge>
                <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    체계적인 학습
                  </span>
                  <br />
                  <span className="text-gray-800">더 나은 교육</span>
                </h1>
                <p className="text-xl text-gray-600 leading-relaxed max-w-xl">
                  덕영고등학교 LMS는 교사와 학생을 위한 통합 학습 관리 시스템입니다. 과제 관리부터 진도 추적까지 모든
                  학습 과정을 효율적으로 관리할 수 있습니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <Button
                  size="lg"
                  asChild
                  className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 h-16 px-10 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold"
                >
                  <Link href="/login">
                    지금 시작하기
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-16 px-10 text-lg rounded-2xl border-2 border-blue-200 hover:bg-blue-50 transition-all duration-300 bg-white/80 backdrop-blur-sm font-semibold"
                >
                  <Link href="/login">더 알아보기</Link>
                </Button>
              </div>
            </div>

            <div className="relative animate-in slide-in-from-right duration-700">
              <div className="relative w-full h-[500px] lg:h-[600px]">
                {/* Main Logo */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-80 h-80 lg:w-96 lg:h-96">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-20 animate-pulse" />
                    <div className="absolute inset-4 bg-white rounded-full shadow-2xl flex items-center justify-center">
                      <Image
                        src="/images/school-logo.png"
                        alt="덕영고등학교 LMS"
                        width={200}
                        height={200}
                        className="object-contain drop-shadow-xl"
                        priority
                      />
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-10 left-10 bg-white rounded-2xl p-4 shadow-xl animate-bounce">
                  <BookOpen className="h-8 w-8 text-blue-500" />
                </div>
                <div className="absolute top-20 right-10 bg-white rounded-2xl p-4 shadow-xl animate-bounce delay-300">
                  <Users className="h-8 w-8 text-green-500" />
                </div>
                <div className="absolute bottom-20 left-10 bg-white rounded-2xl p-4 shadow-xl animate-bounce delay-700">
                  <Award className="h-8 w-8 text-purple-500" />
                </div>
                <div className="absolute bottom-10 right-10 bg-white rounded-2xl p-4 shadow-xl animate-bounce delay-1000">
                  <TrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-6 mb-20 animate-in fade-in duration-700">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-6 py-3 text-sm font-semibold shadow-lg">
              <Target className="h-4 w-4 mr-2" />
              주요 기능
            </Badge>
            <h2 className="text-5xl lg:text-6xl font-bold">
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                학습 관리의 모든 것을
              </span>
              <br />
              <span className="text-gray-800">하나로 연결합니다</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              웹 기반 통합 학습 관리 시스템으로 교사와 학생 모두에게 편리하고 효과적인 교육 환경을 제공합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl border-0 overflow-hidden bg-white/80 backdrop-blur-sm ${
                  activeFeature === index ? "ring-2 ring-blue-500 shadow-2xl scale-105" : ""
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                />
                <CardHeader className="relative pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300`}
                      >
                        <feature.icon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl group-hover:text-blue-600 transition-colors duration-300 mb-2">
                          {feature.title}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative">
                  <CardDescription className="text-gray-600 text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                  <div className="mt-4 flex items-center text-sm text-blue-600 font-medium group-hover:text-blue-700 transition-colors duration-300">
                    자세히 알아보기
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-pulse" />
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/5 rounded-full animate-pulse delay-1000" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center space-y-10 animate-in fade-in duration-700">
            <div className="space-y-6">
              <Badge className="bg-white/20 text-white border-0 px-6 py-3 text-sm font-semibold shadow-lg">
                <Shield className="h-4 w-4 mr-2" />
                안전하고 신뢰할 수 있는 플랫폼
              </Badge>
              <h2 className="text-5xl lg:text-6xl font-bold text-white">지금 바로 시작하세요</h2>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
                덕영고등학교 LMS와 함께 더 체계적인 학습 관리를 시작해보세요. 교사와 학생 모두에게 편리한 교육 환경을
                제공합니다.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-white text-blue-600 hover:bg-gray-50 h-16 px-10 text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 font-semibold"
              >
                <Link href="/login">
                  시작하기
                  <ArrowRight className="ml-3 h-6 w-6" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden shadow-lg ring-2 ring-gray-700">
                  <Image src="/images/school-logo.png" alt="덕영고등학교 로고" fill className="object-contain p-1" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">덕영고등학교 LMS</h3>
                  <p className="text-gray-400 text-sm">학습 관리 시스템</p>
                </div>
              </div>
              <p className="text-gray-400 leading-relaxed">체계적인 학습 관리를 위한 웹 기반 플랫폼</p>
              <div className="text-sm text-gray-500 space-y-1">
                <p className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>개교: 1974년 | 특성화고등학교</span>
                </p>
                <p className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>교훈: 자율, 성실, 협동</span>
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">서비스</h4>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="/login" className="hover:text-white transition-colors flex items-center space-x-2">
                    <BookOpen className="h-4 w-4" />
                    <span>학습 관리</span>
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>반 관리</span>
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors flex items-center space-x-2">
                    <Award className="h-4 w-4" />
                    <span>과제 시스템</span>
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-white transition-colors flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>진도 추적</span>
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">기술</h4>
              <ul className="space-y-3 text-gray-400 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Next.js & React</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Firebase</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>TypeScript</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Tailwind CSS</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-6 text-lg">학교 정보</h4>
              <div className="space-y-3 text-gray-400 text-sm">
                <div className="space-y-2">
                  <p className="font-medium text-white">덕영고등학교</p>
                  <p>경기도 용인시 처인구</p>
                  <p>고림로74번길 15</p>
                </div>
                <div className="pt-4 space-y-2">
                  <p className="flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>웹 기반 플랫폼</span>
                  </p>
                  <p className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>모바일 지원</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-gray-400 text-sm">&copy; 2025 덕영고등학교 LMS. All rights reserved. | ESTD. 1974</p>
              <div className="flex items-center space-x-6 text-sm text-gray-400">
                <Link href="/login" className="hover:text-white transition-colors">
                  개인정보처리방침
                </Link>
                <Link href="/login" className="hover:text-white transition-colors">
                  이용약관
                </Link>
                <Link href="/login" className="hover:text-white transition-colors">
                  문의하기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
