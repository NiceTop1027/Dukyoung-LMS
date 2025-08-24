"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Download, FileText, ImageIcon, Archive, Video, Music, Code, Eye, ExternalLink } from "lucide-react"
import { formatFileSize, type UploadedFile } from "@/lib/storage-utils"

interface FileListProps {
  files: UploadedFile[]
  showDownload?: boolean
  showPreview?: boolean
  onFileClick?: (file: UploadedFile) => void
  className?: string
}

export function FileList({
  files,
  showDownload = true,
  showPreview = false,
  onFileClick,
  className = "",
}: FileListProps) {
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null)

  const getFileIcon = (fileType: string, fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase() || ""

    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />
    }

    if (fileType === "application/pdf" || fileType.includes("document")) {
      return <FileText className="h-5 w-5 text-red-500" />
    }

    if (
      fileType.includes("zip") ||
      fileType.includes("compressed") ||
      fileType.includes("rar") ||
      fileType.includes("7z") ||
      ["zip", "rar", "7z", "gz", "tar", "bz2"].includes(extension)
    ) {
      return <Archive className="h-5 w-5 text-orange-500" />
    }

    if (fileType.startsWith("video/")) {
      return <Video className="h-5 w-5 text-purple-500" />
    }

    if (fileType.startsWith("audio/")) {
      return <Music className="h-5 w-5 text-green-500" />
    }

    if (["py", "java", "cpp", "c", "js", "html", "css", "php", "rb"].includes(extension)) {
      return <Code className="h-5 w-5 text-gray-600" />
    }

    return <FileText className="h-5 w-5 text-gray-500" />
  }

  const getFileTypeLabel = (fileType: string, fileName: string) => {
    const extension = fileName.split(".").pop()?.toUpperCase() || ""

    if (fileType.startsWith("image/")) return "IMAGE"
    if (fileType === "application/pdf") return "PDF"
    if (fileType.includes("document")) return "DOC"
    if (fileType.includes("spreadsheet")) return "EXCEL"
    if (fileType.includes("presentation")) return "PPT"
    if (fileType.startsWith("video/")) return "VIDEO"
    if (fileType.startsWith("audio/")) return "AUDIO"
    if (fileType.includes("zip") || fileType.includes("compressed")) return "ARCHIVE"

    return extension || "FILE"
  }

  const handleDownload = async (file: UploadedFile) => {
    try {
      const response = await fetch(file.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const handlePreview = (file: UploadedFile) => {
    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      window.open(file.url, "_blank")
    } else {
      setPreviewFile(file)
    }
  }

  const handleFileClick = (file: UploadedFile) => {
    if (onFileClick) {
      onFileClick(file)
    } else if (showPreview) {
      handlePreview(file)
    }
  }

  if (!files || files.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
        <p>첨부된 파일이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {files.map((file) => (
        <Card key={file.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center space-x-3 flex-1 min-w-0 cursor-pointer"
                onClick={() => handleFileClick(file)}
              >
                <div className="flex-shrink-0">{getFileIcon(file.type, file.name)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeLabel(file.type, file.name)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{new Date(file.uploadedAt).toLocaleDateString("ko-KR")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {showPreview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handlePreview(file)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}

                {showDownload && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(file)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open(file.url, "_blank")}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
