"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Upload, FileText, ImageIcon, Archive, Trash2 } from "lucide-react"
import { uploadFile, formatFileSize, ASSIGNMENT_MAX_FILE_SIZE, type UploadedFile } from "@/lib/storage-utils"

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void
  onFileRemoved?: (fileId: string) => void
  maxFiles?: number
  maxFileSize?: number // MB
  acceptedTypes?: string[]
  uploadPath: string
  uploadedFiles?: UploadedFile[]
  isAssignmentSubmission?: boolean // 과제 제출용인지 구분
}

export function FileUpload({
  onFilesUploaded,
  onFileRemoved,
  maxFiles = 5,
  maxFileSize = 10, // MB
  acceptedTypes = ["image/*", "application/pdf", ".doc,.docx,.txt", ".zip,.rar,.7z,.gz,.tar,.bz2"],
  uploadPath,
  uploadedFiles = [],
  isAssignmentSubmission = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [error, setError] = useState("")
  const [isUploading, setIsUploading] = useState(false)

  // 과제 제출용인 경우 1GB로 제한
  const actualMaxFileSize = isAssignmentSubmission ? 1024 : maxFileSize // MB
  const actualMaxFileSizeBytes = isAssignmentSubmission ? ASSIGNMENT_MAX_FILE_SIZE : maxFileSize * 1024 * 1024

  const getFileTypeIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />
    }
    if (fileType === "application/pdf" || fileType.includes("document")) {
      return <FileText className="h-4 w-4" />
    }
    if (
      fileType.includes("zip") ||
      fileType.includes("compressed") ||
      fileType.includes("rar") ||
      fileType.includes("7z") ||
      fileType.includes("gzip") ||
      fileType.includes("tar")
    ) {
      return <Archive className="h-4 w-4" />
    }
    return <FileText className="h-4 w-4" />
  }

  const validateFile = (file: File): string | null => {
    if (file.size > actualMaxFileSizeBytes) {
      return `파일 크기가 ${actualMaxFileSize}MB를 초과합니다.`
    }

    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    const isValidType = acceptedTypes.some((type) => {
      if (type.includes("*")) {
        return file.type.startsWith(type.replace("*", ""))
      }
      if (type.startsWith(".")) {
        return type.includes(fileExtension)
      }
      return file.type === type
    })

    if (!isValidType) {
      return "지원하지 않는 파일 형식입니다."
    }

    return null
  }

  const handleFiles = async (files: FileList) => {
    if (uploadedFiles.length + files.length > maxFiles) {
      setError(`최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`)
      return
    }

    setError("")
    setIsUploading(true)

    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        setIsUploading(false)
        return
      }
      validFiles.push(file)
    }

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const uploadedFile = await uploadFile(
          file,
          uploadPath,
          (progress) => {
            setUploadProgress((prev) => ({ ...prev, [fileId]: progress }))
          },
          actualMaxFileSizeBytes,
        )

        return uploadedFile
      })

      const newUploadedFiles = await Promise.all(uploadPromises)
      const allFiles = [...uploadedFiles, ...newUploadedFiles]
      onFilesUploaded(allFiles)
      setUploadProgress({})
    } catch (error: any) {
      console.error("Upload error:", error)
      setError("파일 업로드 중 오류가 발생했습니다: " + error.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const files = e.dataTransfer.files
      if (files.length > 0) {
        handleFiles(files)
      }
    },
    [uploadedFiles.length],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    e.target.value = ""
  }

  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = uploadedFiles.filter((file) => file.id !== fileId)
    onFilesUploaded(updatedFiles)
    if (onFileRemoved) {
      onFileRemoved(fileId)
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">파일을 드래그하여 놓거나 클릭하여 선택하세요</p>
        <p className="text-xs text-gray-500 mb-4">
          최대 {maxFiles}개, {actualMaxFileSize}MB 이하
          {isAssignmentSubmission && (
            <span className="block mt-1 text-blue-600 font-medium">
              📦 압축파일 지원: ZIP, RAR, 7Z, GZ, TAR, BZ2 등
            </span>
          )}
        </p>
        <div className="text-xs text-gray-400 mb-4">지원 형식: {acceptedTypes.join(", ")}</div>
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById("file-upload")?.click()}
          disabled={isUploading || uploadedFiles.length >= maxFiles}
        >
          파일 선택
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([fileId, progress]) => (
            <div key={fileId}>
              <div className="flex justify-between text-sm mb-1">
                <span>업로드 중...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">업로드된 파일:</h4>
          {uploadedFiles.map((file) => (
            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className="flex-shrink-0">{getFileTypeIcon(file.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                    <span className="text-xs text-gray-500">{new Date(file.uploadedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveFile(file.id)}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
