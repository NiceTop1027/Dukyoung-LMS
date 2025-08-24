"use client"

import { useMemo } from "react"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const processedContent = useMemo(() => {
    if (!content) return ""

    // 간단한 마크다운 처리
    let processed = content

    // 헤더 처리
    processed = processed.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 mt-4">$1</h3>')
    processed = processed.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3 mt-6">$1</h2>')
    processed = processed.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 mt-8">$1</h1>')

    // 볼드 처리
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    processed = processed.replace(/__(.*?)__/g, '<strong class="font-semibold">$1</strong>')

    // 이탤릭 처리
    processed = processed.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    processed = processed.replace(/_(.*?)_/g, '<em class="italic">$1</em>')

    // 코드 블록 처리
    processed = processed.replace(
      /```([\s\S]*?)```/g,
      '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto"><code>$1</code></pre>',
    )

    // 인라인 코드 처리
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>')

    // 링크 처리
    processed = processed.replace(
      /\[([^\]]+)\]$$([^)]+)$$/g,
      '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>',
    )

    // 리스트 처리
    processed = processed.replace(/^\* (.*$)/gim, '<li class="ml-4">• $1</li>')
    processed = processed.replace(/^- (.*$)/gim, '<li class="ml-4">• $1</li>')
    processed = processed.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')

    // 줄바꿈 처리
    processed = processed.replace(/\n\n/g, '</p><p class="mb-3">')
    processed = processed.replace(/\n/g, "<br>")

    // 전체를 p 태그로 감싸기
    if (processed && !processed.startsWith("<")) {
      processed = `<p class="mb-3">${processed}</p>`
    }

    return processed
  }, [content])

  if (!content) {
    return <div className={className}>내용이 없습니다.</div>
  }

  return (
    <div className={`prose prose-sm max-w-none ${className}`} dangerouslySetInnerHTML={{ __html: processedContent }} />
  )
}
