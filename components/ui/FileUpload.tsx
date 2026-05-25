'use client'

import { useRef, useState } from 'react'
import { Loader2, Paperclip, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

type Bucket = 'product-images' | 'kyc-documents' | 'org-assets'

interface FileUploadProps {
  bucket: Bucket
  path: string
  onUploaded: (url: string) => void
  accept?: string
  label?: string
  className?: string
}

export function FileUpload({ bucket, path, onUploaded, accept = 'image/*', label = 'Upload file', className }: FileUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fullPath = `${path}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true })
    if (error) {
      toast.error(error.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath)
    onUploaded(data.publicUrl)
    setUploading(false)
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 transition-colors hover:border-[#ff6d43] hover:text-[#ff6d43] disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {uploading ? 'Uploading…' : label}
      </button>
    </div>
  )
}

interface ImageListUploadProps {
  bucket: Bucket
  path: string
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
  className?: string
}

export function ImageListUpload({ bucket, path, images, onChange, maxImages = 8, className }: ImageListUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const fullPath = `${path}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true })
    if (error) {
      toast.error(error.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath)
    onChange([...images, data.publicUrl])
    setUploading(false)
  }

  const removeImage = async (url: string, idx: number) => {
    const path = url.split(`/${bucket}/`)[1]
    if (path) {
      await supabase.storage.from(bucket).remove([path])
    }
    onChange(images.filter((_, i) => i !== idx))
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {images.map((url, i) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
            <img src={url} alt={`Image ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url, i)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-[#ff6d43] hover:text-[#ff6d43] disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  <span className="text-[10px]">Add</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
      {images.length > 0 && (
        <p className="mt-1.5 text-xs text-gray-400">
          {images.length}/{maxImages} images · First image is the cover
        </p>
      )}
    </div>
  )
}

interface DocumentUploadProps {
  bucket: Bucket
  path: string
  onUploaded: (url: string, name: string) => void
  accept?: string
  label?: string
  className?: string
}

export function DocumentUpload({ bucket, path, onUploaded, accept = '.pdf,image/*', label = 'Upload document', className }: DocumentUploadProps) {
  const supabase = createClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File) => {
    setUploading(true)
    const fullPath = `${path}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true })
    if (error) {
      toast.error(error.message)
      setUploading(false)
      return
    }
    const { data } = await supabase.storage.from(bucket).createSignedUrl(fullPath, 60 * 60 * 24 * 7)
    if (data?.signedUrl) onUploaded(data.signedUrl, file.name)
    setUploading(false)
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-600 transition-colors hover:border-[#ff6d43] hover:text-[#ff6d43] disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4" />
        )}
        {uploading ? 'Uploading…' : label}
      </button>
    </div>
  )
}
