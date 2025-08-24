"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bold, Italic, Underline, List, ListOrdered, Link, ImageIcon, Type, Video, Eye } from "lucide-react"
import { MarkdownRenderer } from "./markdown-renderer"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = "200px" }: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [activeTab, setActiveTab] = useState("edit")

  const insertText = (before: string, after = "") => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)

    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end)
    onChange(newText)

    // 커서 위치 조정
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    const newText = value.substring(0, start) + text + value.substring(end)
    onChange(newText)

    // 커서 위치 조정
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  const handleImageInsert = () => {
    const url = prompt("이미지 URL을 입력하세요:")
    if (url) {
      const alt = prompt("이미지 설명을 입력하세요 (선택사항):", "이미지") || "이미지"
      insertAtCursor(`![${alt}](${url})`)
    }
  }

  const handleVideoInsert = () => {
    const url = prompt("동영상 URL을 입력하세요 (YouTube, MP4 등):")
    if (url) {
      if (url.includes("youtube.com") || url.includes("youtu.be")) {
        insertAtCursor(`${url}`)
      } else {
        insertAtCursor(`${url}`)
      }
    }
  }

  const handleLinkInsert = () => {
    const url = prompt("링크 URL을 입력하세요:")
    if (url) {
      const text = prompt("링크 텍스트를 입력하세요:", "링크") || "링크"
      insertAtCursor(`[${text}](${url})`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 키가 form submit을 트리거하지 않도록 방지
    if (e.key === "Enter" && !e.shiftKey) {
      e.stopPropagation()
      // 기본 동작(새 줄 추가)은 허용하되 form submit은 방지
    }
  }

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.preventDefault()
    e.stopPropagation()
    action()
  }

  return (
    <div className="border rounded-lg">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between border-b bg-gray-50 px-2 py-1">
          <div className="flex flex-wrap items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, () => insertText("**", "**"))}
              title="굵게"
            >
              <Bold className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, () => insertText("*", "*"))}
              title="기울임"
            >
              <Italic className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, () => insertText("<u>", "</u>"))}
              title="밑줄"
            >
              <Underline className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, () => insertText("# ", ""))}
              title="제목"
            >
              <Type className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, () => insertText("- ", ""))}
              title="목록"
            >
              <List className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, () => insertText("1. ", ""))}
              title="번호 목록"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, handleLinkInsert)}
              title="링크"
            >
              <Link className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, handleImageInsert)}
              title="이미지"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, handleVideoInsert)}
              title="동영상"
            >
              <Video className="h-4 w-4" />
            </Button>

            <div className="w-px h-6 bg-gray-300 mx-1" />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => handleButtonClick(e, () => insertAtCursor("\n---\n"))}
              title="구분선"
            >
              ―
            </Button>
          </div>

          <TabsList className="h-8">
            <TabsTrigger value="edit" className="text-xs px-2 py-1">
              편집
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-2 py-1">
              <Eye className="h-3 w-3 mr-1" />
              미리보기
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="edit" className="m-0">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="border-0 resize-none focus-visible:ring-0 rounded-t-none"
            style={{ minHeight }}
            onKeyDown={handleKeyDown}
            onKeyPress={(e) => e.stopPropagation()}
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0">
          <div className="p-4 rounded-b-lg" style={{ minHeight }}>
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-gray-500 italic">미리보기할 내용이 없습니다.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 도움말 */}
      <div className="p-2 text-xs text-gray-500 bg-gray-50 border-t">
        <p>
          <strong>마크다운 문법:</strong> **굵게**, *기울임*, # 제목, - 목록, [링크](URL), ![이미지](URL), YouTube URL
          자동 변환
        </p>
      </div>
    </div>
  )
}
