"use client"

console.log('📄 ProfilePage: File loaded')

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { CRMLayout } from "@/components/crm/layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChevronLeft, Upload, X } from 'lucide-react'
import Link from "next/link"
import { getMyProfile, updateMyProfile, type User } from "@/lib/api/users"
import { useToastNotification } from "@/hooks/use-toast-notification"
import { AvatarCropModal } from "@/components/crm/avatar-crop-modal"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  console.log('🚀 ProfilePage: Component rendered')
  
  const router = useRouter()
  const { showSuccess, showError } = useToastNotification()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  
  // Form state
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [telegramUsername, setTelegramUsername] = useState("")
  const [avatar, setAvatar] = useState<string | undefined>(undefined)
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(undefined)
  
  console.log('🚀 ProfilePage: Current state:', { firstName, lastName, email, isLoading, user: user?.id })

  // Phone mask formatting (same as in create-user-modal)
  const formatPhone = (value: string): string => {
    let digits = value.replace(/\D/g, '')
    
    if (digits.length > 0 && digits[0] === '8') {
      digits = '7' + digits.slice(1)
    }
    
    if (digits.length === 0) return ''
    
    if (digits.length === 1 && digits[0] === '8') {
      return '+7'
    }
    
    if (digits.length > 0 && digits[0] !== '7' && digits[0] !== '8') {
      digits = '7' + digits
    }
    
    if (digits.length <= 1) return '+7'
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true)
        if (typeof window === 'undefined') {
          setIsLoading(false)
          return
        }

        const userStr = localStorage.getItem('user')
        console.log('🔍 ProfilePage: Starting load, localStorage user:', userStr)
        
        if (!userStr) {
          showError('No user data found. Please log in again.')
          setIsLoading(false)
          return
        }

        const localUser = JSON.parse(userStr)
        console.log('🔍 ProfilePage: Parsed local user:', localUser)
        
        if (!localUser.id) {
          showError('Invalid user data. Please log in again.')
          setIsLoading(false)
          return
        }

        // ALWAYS load from API - ignore localStorage for display
        console.log('🔍 ProfilePage: Fetching from API /users/me')
        try {
          const userData = await getMyProfile()
          console.log('✅ ProfilePage: API returned:', {
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            telegramUsername: userData.telegramUsername,
          })
          
          if (!userData || !userData.id) {
            throw new Error('Invalid user data received from API')
          }
          
          // Set state with API data
          setUser(userData)
          setFirstName(userData.firstName || "")
          setLastName(userData.lastName || "")
          setEmail(userData.email || "")
          setPhone(userData.phone || "")
          setTelegramUsername(userData.telegramUsername || "")
          setAvatar(userData.avatar)
          setAvatarPreview(userData.avatar)
          
          console.log('✅ ProfilePage: State set to:', {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
          })
          
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify({
            ...localUser,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            telegramUsername: userData.telegramUsername,
            avatar: userData.avatar,
          }))
        } catch (apiError) {
          console.error('❌ ProfilePage: API error:', apiError)
          showError('Failed to load profile from server')
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error('❌ ProfilePage: Fatal error:', error)
        showError('Failed to load profile data')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [showError])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Выберите файл изображения')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Размер изображения не должен превышать 5 МБ')
      return
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setRawImageSrc(base64)
      setCropModalOpen(true)
    } catch (error) {
      console.error('Failed to read image file:', error)
      showError('Не удалось загрузить изображение')
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleCropComplete = (croppedBase64: string) => {
    setAvatar(croppedBase64)
    setAvatarPreview(croppedBase64)
    setRawImageSrc(null)
    setCropModalOpen(false)
    showSuccess('Фото профиля обновлено')
  }

  const handleRemoveAvatar = () => {
    setAvatar(undefined)
    setAvatarPreview(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!user) {
      showError('No user data available')
      return
    }

    try {
      setIsSaving(true)
      const updateData: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      }

      if (phone.trim()) {
        updateData.phone = phone.trim()
      }
      if (telegramUsername.trim()) {
        updateData.telegramUsername = telegramUsername.trim()
      }
      if (avatar) {
        updateData.avatar = avatar
      }
      
      const updatedUser = await updateMyProfile(updateData)

      // Update localStorage with new data
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user')
        if (userStr) {
          const localUser = JSON.parse(userStr)
          const updatedLocalUser = {
            ...localUser,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone || phone,
            telegramUsername: updatedUser.telegramUsername || telegramUsername,
            ...(updatedUser.avatar && { avatar: updatedUser.avatar }),
          }
          localStorage.setItem('user', JSON.stringify(updatedLocalUser))
        }
      }

      setUser(updatedUser)
      setFirstName(updatedUser.firstName || "")
      setLastName(updatedUser.lastName || "")
      setEmail(updatedUser.email || "")
      setPhone(updatedUser.phone || "")
      setTelegramUsername(updatedUser.telegramUsername || "")
      setAvatar(updatedUser.avatar)
      setAvatarPreview(updatedUser.avatar)
      
      showSuccess('Profile updated successfully')
    } catch (error) {
      console.error('Failed to update profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
      showError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const getUserInitials = (): string => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMMM yyyy')
    } catch {
      return dateString
    }
  }

  const getRoleDisplayName = (role?: string): string => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator'
      case 'MANAGER':
        return 'Manager'
      case 'VIEWER':
        return 'Viewer'
      default:
        return role || 'N/A'
    }
  }

  if (isLoading) {
    return (
      <CRMLayout>
        <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  if (!user) {
    return (
      <CRMLayout>
        <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Failed to load profile data</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  return (
    <CRMLayout>
      <div className="min-h-[calc(100vh-3rem)] px-6 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground">Update your personal information</p>
          </div>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Avatar */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Avatar</CardTitle>
              <CardDescription>Update your profile picture</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarPreview || avatar} alt={`${firstName} ${lastName}`} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                {avatarPreview && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                    onClick={handleRemoveAvatar}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  {isUploadingAvatar ? "Uploading..." : "Upload Image"}
                </Button>
                <p className="text-xs text-muted-foreground">JPG, PNG up to 5MB</p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
              <CardDescription>Update your name and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-xs font-medium">First Name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-xs font-medium">Last Name</Label>
                  <Input 
                    id="lastName" 
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-9" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium">Phone</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="+7 (999) 999-99-99"
                  className="h-9" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegramUsername" className="text-xs font-medium">Telegram Username</Label>
                <Input 
                  id="telegramUsername" 
                  value={telegramUsername}
                  onChange={(e) => setTelegramUsername(e.target.value)}
                  placeholder="@username"
                  className="h-9" 
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Account Information</CardTitle>
              <CardDescription>Your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium text-foreground">{getRoleDisplayName(user.role)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium text-foreground">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-muted-foreground">{user.id}</span>
              </div>
              {user.lastLoginAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Login</span>
                  <span className="font-medium text-foreground">{formatDate(user.lastLoginAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={isSaving || isUploadingAvatar}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
            <Link href="/settings">
              <Button variant="ghost">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>
      {rawImageSrc && (
        <AvatarCropModal
          isOpen={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false)
            setRawImageSrc(null)
          }}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </CRMLayout>
  )
}
