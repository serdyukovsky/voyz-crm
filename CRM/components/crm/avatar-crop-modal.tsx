"use client"

import { useState, useRef, useCallback } from 'react'
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const OUTPUT_SIZE = 256

interface AvatarCropModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string
  onCropComplete: (croppedBase64: string) => void
}

export function AvatarCropModal({ isOpen, onClose, imageSrc, onCropComplete }: AvatarCropModalProps) {
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<Crop>()
  const imgRef = useRef<HTMLImageElement>(null)

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget
    const initialCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 80 },
        1,
        naturalWidth,
        naturalHeight
      ),
      naturalWidth,
      naturalHeight
    )
    setCrop(initialCrop)
    setCompletedCrop(initialCrop)
  }, [])

  const handleApply = useCallback(() => {
    if (!completedCrop || !imgRef.current) return

    const image = imgRef.current
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let sourceX: number, sourceY: number, sourceWidth: number, sourceHeight: number

    if (completedCrop.unit === '%') {
      sourceX = (completedCrop.x / 100) * image.naturalWidth
      sourceY = (completedCrop.y / 100) * image.naturalHeight
      sourceWidth = (completedCrop.width / 100) * image.naturalWidth
      sourceHeight = (completedCrop.height / 100) * image.naturalHeight
    } else {
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height
      sourceX = completedCrop.x * scaleX
      sourceY = completedCrop.y * scaleY
      sourceWidth = completedCrop.width * scaleX
      sourceHeight = completedCrop.height * scaleY
    }

    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, OUTPUT_SIZE, OUTPUT_SIZE
    )

    const croppedBase64 = canvas.toDataURL('image/png')
    onCropComplete(croppedBase64)
  }, [completedCrop, onCropComplete])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCrop(undefined)
      setCompletedCrop(undefined)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Обрезать фото</DialogTitle>
          <DialogDescription>
            Выберите область для фото профиля
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="max-h-[400px] overflow-hidden rounded-md">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
              minWidth={50}
              minHeight={50}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{ maxHeight: '400px', maxWidth: '100%' }}
              />
            </ReactCrop>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleApply} disabled={!completedCrop}>
            Применить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
