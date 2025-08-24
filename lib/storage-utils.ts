import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { storage } from "./firebase"

export interface UploadedFile {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploadedAt: Date
}

// 허용된 파일 타입 - 모든 주요 파일 형식 포함
const ALLOWED_FILE_TYPES = [
  // 이미지
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "image/tiff",
  "image/ico",
  "image/heic",
  "image/heif",
  // 문서
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/rtf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/html",
  "text/css",
  "text/javascript",
  "text/typescript",
  "application/json",
  "application/xml",
  "text/xml",
  // 압축 파일 - 과제 제출용으로 확장
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/vnd.rar",
  "application/x-7z-compressed",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
  "application/x-bzip2",
  "application/x-xz",
  "application/x-compress",
  "application/x-compressed",
  "application/x-zip",
  "application/x-tar-gz",
  "application/x-tgz",
  "application/x-bzip",
  "application/x-lzip",
  "application/x-lzma",
  "application/x-lzop",
  "application/x-snappy-framed",
  "application/x-stuffit",
  "application/x-stuffitx",
  "application/x-ace-compressed",
  "application/x-alz-compressed",
  "application/x-arc",
  "application/x-arj",
  "application/x-cabinet",
  "application/x-cpio",
  "application/x-deb",
  "application/x-rpm",
  "application/x-shar",
  "application/x-iso9660-image",
  // 오디오
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
  "audio/wma",
  "audio/m4a",
  // 비디오
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/ogg",
  "video/3gpp",
  "video/x-flv",
  "video/x-ms-wmv",
  // 프로그래밍 파일
  "text/x-python",
  "text/x-java-source",
  "text/x-c",
  "text/x-c++",
  "text/x-csharp",
  "application/x-php",
  "application/x-ruby",
  "application/x-perl",
  "application/x-shell",
  // 실행 파일
  "application/octet-stream",
  "application/x-executable",
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-deb",
  "application/x-rpm",
  "application/vnd.apple.installer+xml",
  // 폰트 파일
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/font-woff2",
  // CAD 파일
  "application/dwg",
  "application/dxf",
  // 기타
  "application/epub+zip",
  "application/x-mobipocket-ebook",
  "application/vnd.amazon.ebook",
]

// 기본 최대 파일 크기 (10GB)
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024

// 과제 제출용 최대 파일 크기 (1GB)
export const ASSIGNMENT_MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024

// 경로 검증 함수
function validateUploadPath(uploadPath: string): boolean {
  console.log("Validating upload path:", uploadPath)

  if (!uploadPath || typeof uploadPath !== "string") {
    console.error("Upload path is empty or not a string:", uploadPath)
    return false
  }

  // 허용된 경로 패턴들
  const allowedPatterns = [
    /^assignments\/[a-zA-Z0-9_-]+$/, // assignments/{userId}
    /^submissions\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/, // submissions/{classId}/{studentId}
    /^files\/[a-zA-Z0-9_-]+$/, // files/{userId}
    /^classes\/[a-zA-Z0-9_-]+$/, // classes/{classId}
    /^notices\/[a-zA-Z0-9_-]+$/, // notices/{classId}
    /^profiles\/[a-zA-Z0-9_-]+$/, // profiles/{userId} - 프로필 이미지용
    /^[a-zA-Z0-9_/-]+$/, // Allow any alphanumeric path with underscores, hyphens, and forward slashes
  ]

  const isValid = allowedPatterns.some((pattern) => pattern.test(uploadPath))
  console.log("Path validation result:", isValid)
  return isValid
}

// 파일 검증 함수 - 더 관대하게 수정
function validateFile(file: File, maxFileSize?: number): { isValid: boolean; error?: string } {
  console.log("Validating file:", file.name, file.type, file.size)

  if (!file) {
    return { isValid: false, error: "파일이 선택되지 않았습니다." }
  }

  const fileSizeLimit = maxFileSize || DEFAULT_MAX_FILE_SIZE
  if (file.size > fileSizeLimit) {
    const sizeLimitMB = Math.round(fileSizeLimit / (1024 * 1024))
    return { isValid: false, error: `파일 크기가 ${sizeLimitMB}MB를 초과합니다.` }
  }

  // 파일 타입이 비어있거나 알 수 없는 경우에도 허용 (확장자로 판단)
  if (file.type && !ALLOWED_FILE_TYPES.includes(file.type)) {
    // 확장자 기반 검증
    const fileName = file.name.toLowerCase()
    const allowedExtensions = [
      // 이미지
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".bmp",
      ".svg",
      ".tiff",
      ".ico",
      ".heic",
      ".heif",
      // 문서
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".odt",
      ".ods",
      ".odp",
      ".rtf",
      ".txt",
      ".md",
      ".csv",
      ".html",
      ".css",
      ".js",
      ".ts",
      ".json",
      ".xml",
      // 압축 파일 - 과제 제출용으로 확장
      ".zip",
      ".rar",
      ".7z",
      ".gz",
      ".tar",
      ".bz2",
      ".xz",
      ".tgz",
      ".tbz2",
      ".txz",
      ".lz",
      ".lzma",
      ".lzo",
      ".Z",
      ".sit",
      ".sitx",
      ".ace",
      ".alz",
      ".arc",
      ".arj",
      ".cab",
      ".cpio",
      ".deb",
      ".rpm",
      ".shar",
      ".iso",
      ".dmg",
      ".pkg",
      // 오디오
      ".mp3",
      ".wav",
      ".ogg",
      ".m4a",
      ".aac",
      ".flac",
      ".wma",
      // 비디오
      ".mp4",
      ".mpeg",
      ".mov",
      ".avi",
      ".webm",
      ".ogv",
      ".3gp",
      ".flv",
      ".wmv",
      // 프로그래밍
      ".py",
      ".java",
      ".c",
      ".cpp",
      ".cs",
      ".php",
      ".rb",
      ".pl",
      ".sh",
      ".go",
      ".rs",
      ".kt",
      ".swift",
      ".scala",
      ".r",
      ".m",
      ".sql",
      // 실행 파일
      ".exe",
      ".msi",
      ".dmg",
      ".deb",
      ".rpm",
      ".pkg",
      ".app",
      ".apk",
      // 폰트
      ".ttf",
      ".otf",
      ".woff",
      ".woff2",
      // CAD
      ".dwg",
      ".dxf",
      // 기타
      ".epub",
      ".mobi",
      ".azw3",
    ]

    const hasAllowedExtension = allowedExtensions.some((ext) => fileName.endsWith(ext))
    if (!hasAllowedExtension && file.type) {
      return { isValid: false, error: "지원하지 않는 파일 형식입니다." }
    }
  }

  return { isValid: true }
}

// 단일 파일 업로드
export async function uploadFile(
  file: File,
  uploadPath: string,
  onProgress?: (progress: number) => void,
  maxFileSize?: number,
): Promise<UploadedFile> {
  console.log("Starting file upload:", file.name, "to path:", uploadPath)

  // 경로 검증
  if (!validateUploadPath(uploadPath)) {
    throw new Error("올바르지 않은 업로드 경로입니다.")
  }

  // 파일 검증
  const validation = validateFile(file, maxFileSize)
  if (!validation.isValid) {
    throw new Error(validation.error || "파일 검증에 실패했습니다.")
  }

  try {
    // 고유한 파일명 생성
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2, 15)
    const fileExtension = file.name.split(".").pop()
    const fileName = `${timestamp}_${randomId}.${fileExtension}`
    const fullPath = `${uploadPath}/${fileName}`

    console.log("Uploading to full path:", fullPath)

    // Firebase Storage에 업로드
    const storageRef = ref(storage, fullPath)

    // 진행률 콜백이 있는 경우 사용
    if (onProgress) {
      // 간단한 진행률 시뮬레이션 (실제 Firebase SDK는 진행률 콜백을 제공하지 않음)
      onProgress(0)
      setTimeout(() => onProgress(25), 100)
      setTimeout(() => onProgress(50), 300)
      setTimeout(() => onProgress(75), 500)
    }

    const snapshot = await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(snapshot.ref)

    if (onProgress) {
      onProgress(100)
    }

    console.log("Upload successful, download URL:", downloadURL)

    const uploadedFile: UploadedFile = {
      id: randomId,
      name: file.name,
      url: downloadURL,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
    }

    return uploadedFile
  } catch (error: any) {
    console.error("File upload error:", error)
    throw new Error(`파일 업로드에 실패했습니다: ${error.message}`)
  }
}

// 여러 파일 업로드
export async function uploadMultipleFiles(
  files: File[],
  uploadPath: string,
  maxFileSize?: number,
): Promise<UploadedFile[]> {
  console.log("Starting multiple file upload:", files.length, "files to path:", uploadPath)

  if (!files || files.length === 0) {
    return []
  }

  // 경로 검증
  if (!validateUploadPath(uploadPath)) {
    throw new Error("올바르지 않은 업로드 경로입니다.")
  }

  const uploadPromises = files.map((file) => uploadFile(file, uploadPath, undefined, maxFileSize))

  try {
    const results = await Promise.all(uploadPromises)
    console.log("Multiple file upload successful:", results.length, "files")
    return results
  } catch (error: any) {
    console.error("Multiple file upload error:", error)
    throw new Error(`파일 업로드에 실패했습니다: ${error.message}`)
  }
}

// 파일 삭제
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    console.log("Deleting file:", fileUrl)
    const fileRef = ref(storage, fileUrl)
    await deleteObject(fileRef)
    console.log("File deleted successfully")
  } catch (error: any) {
    console.error("File deletion error:", error)
    throw new Error(`파일 삭제에 실패했습니다: ${error.message}`)
  }
}

// 파일 크기를 읽기 쉬운 형태로 변환
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// 파일 타입에 따른 아이콘 반환
export function getFileIcon(fileType: string): string {
  if (fileType.startsWith("image/")) return "🖼️"
  if (fileType === "application/pdf") return "📄"
  if (fileType.includes("word")) return "📝"
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊"
  if (fileType.includes("powerpoint") || fileType.includes("presentation")) return "📊"
  if (fileType === "text/plain") return "📄"
  if (
    fileType.includes("zip") ||
    fileType.includes("rar") ||
    fileType.includes("7z") ||
    fileType.includes("gzip") ||
    fileType.includes("tar") ||
    fileType.includes("bzip") ||
    fileType.includes("compressed")
  )
    return "📦"
  if (fileType.startsWith("audio/")) return "🎵"
  if (fileType.startsWith("video/")) return "🎬"
  if (fileType.includes("json") || fileType.includes("xml")) return "⚙️"
  if (
    fileType.includes("javascript") ||
    fileType.includes("css") ||
    fileType.includes("html") ||
    fileType.includes("python") ||
    fileType.includes("java")
  )
    return "💻"
  if (fileType.includes("font")) return "🔤"
  if (fileType.includes("executable") || fileType.includes("msdownload")) return "⚙️"
  return "📎"
}
