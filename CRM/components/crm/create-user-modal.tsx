"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, Eye, EyeOff } from "lucide-react"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/api/users'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone?: string
    telegramUsername?: string
    role?: UserRole
    isActive?: boolean
  }) => Promise<void>
}

export function CreateUserModal({ 
  isOpen, 
  onClose, 
  onSave
}: CreateUserModalProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [telegramUsername, setTelegramUsername] = useState("")
  const [role, setRole] = useState<UserRole>("MANAGER")
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [isRoleSelectOpen, setIsRoleSelectOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string | string[]>>({})
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const roles: { value: UserRole; label: string }[] = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'VIEWER', label: 'Viewer' },
  ]

  useEffect(() => {
    if (isOpen) {
      // Reset form when opening
      setEmail("")
      setPassword("")
      setConfirmPassword("")
      setFirstName("")
      setLastName("")
      setPhone("")
      setTelegramUsername("")
      setRole("MANAGER")
      setIsActive(true)
      setLoading(false)
      setShowPassword(false)
      setShowConfirmPassword(false)
      setErrors({})
    }
  }, [isOpen])

  // Phone mask formatting
  const formatPhone = (value: string): string => {
    // Remove all non-digits
    let digits = value.replace(/\D/g, '')
    
    // Convert 8 to 7 at the start (Russian phone format)
    if (digits.length > 0 && digits[0] === '8') {
      digits = '7' + digits.slice(1)
    }
    
    // Format: +7 (XXX) XXX-XX-XX
    if (digits.length === 0) return ''
    
    // If starts with 8, convert to 7
    if (digits.length === 1 && digits[0] === '8') {
      return '+7'
    }
    
    // If doesn't start with 7, prepend 7 (but not if it's already 8 which we converted)
    if (digits.length > 0 && digits[0] !== '7' && digits[0] !== '8') {
      digits = '7' + digits
    }
    
    // Ensure first digit is 7
    if (digits.length > 0 && digits[0] !== '7') {
      digits = '7' + digits.slice(1)
    }
    
    if (digits.length <= 1) return `+${digits}`
    if (digits.length <= 4) return `+${digits[0]} (${digits.slice(1)}`
    if (digits.length <= 7) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`
    if (digits.length <= 9) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
    // Clear phone error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }))
    }
  }

  // Validation functions
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return t('users.errors.emailRequired') || 'Email обязателен'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return t('users.errors.emailInvalid') || 'Некорректный формат email'
    }
    return null
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    if (!password) {
      return [t('users.errors.passwordRequired') || 'Пароль обязателен']
    }
    if (password.length < 6) {
      errors.push(t('users.errors.passwordMinLength') || 'Минимум 6 символов')
    }
    if (!/[A-Za-z]/.test(password)) {
      errors.push(t('users.errors.passwordLetter') || 'Хотя бы одна буква')
    }
    if (!/[0-9]/.test(password)) {
      errors.push(t('users.errors.passwordNumber') || 'Хотя бы одна цифра')
    }
    return errors
  }

  const validatePhone = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '')
    if (!digits || digits.length === 0) {
      return t('users.errors.phoneRequired') || 'Номер телефона обязателен'
    }
    if (digits.length < 11) {
      return t('users.errors.phoneInvalid') || 'Номер телефона должен содержать 11 цифр'
    }
    return null
  }

  // Real-time form validation to enable/disable the button
  const isFormValid = useMemo(() => {
    // Check all required fields
    if (!firstName.trim()) return false
    if (!lastName.trim()) return false
    if (!email.trim() || validateEmail(email) !== null) return false
    if (!password || validatePassword(password).length > 0) return false
    if (!confirmPassword.trim() || password !== confirmPassword) return false
    // Phone validation - check if phone is valid
    const phoneError = validatePhone(phone)
    if (phoneError) return false
    return true
  }, [firstName, lastName, email, password, confirmPassword, phone, t])

  const handleSave = async () => {
    // Clear previous errors
    setErrors({})

    // Validate all fields
    const newErrors: Record<string, string> = {}
    
    if (!firstName.trim()) {
      newErrors.firstName = t('users.errors.firstNameRequired') || 'Имя обязательно'
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = t('users.errors.lastNameRequired') || 'Фамилия обязательна'
    }

    const emailError = validateEmail(email)
    if (emailError) {
      newErrors.email = emailError
    }

    const phoneError = validatePhone(phone)
    if (phoneError) {
      newErrors.phone = phoneError
    }

    const passwordErrors = validatePassword(password)
    if (passwordErrors.length > 0) {
      newErrors.password = passwordErrors
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('users.errors.confirmPasswordRequired') || 'Подтверждение пароля обязательно'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('users.errors.passwordsDoNotMatch') || 'Пароли не совпадают'
    }

    // If there are errors, set them and stop
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await onSave({
        email: email.trim(),
        password: password.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        telegramUsername: telegramUsername.trim() || undefined,
        role,
        isActive,
      })
      
      onClose()
    } catch (error) {
      console.error('Failed to create user:', error instanceof Error ? error.message : String(error))
      // Show error to user in modal
      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать пользователя'
      setErrors({ 
        general: errorMessage.includes('already exists') || errorMessage.includes('уже существует')
          ? 'Пользователь с таким email уже существует'
          : errorMessage.includes('email') || errorMessage.includes('Email')
          ? 'Некорректный формат email'
          : errorMessage.includes('password') || errorMessage.includes('Пароль')
          ? 'Пароль не соответствует требованиям'
          : errorMessage
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        onClose()
      }
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4 rounded-br-3xl">
        <div className="space-y-4">
          {/* General Error */}
          {errors.general && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.general}</p>
            </div>
          )}
          {/* First Name */}
          <div>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value)
                if (errors.firstName) {
                  setErrors(prev => ({ ...prev, firstName: '' }))
                }
              }}
              placeholder={t('users.firstName') || 'Имя'}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && e.ctrlKey) {
                  e.preventDefault()
                  handleSave()
                }
              }}
              className={cn(
                "!text-lg !font-semibold h-auto py-1 border-0 shadow-none focus-visible:ring-0 pr-12",
                errors.firstName && "border-red-500"
              )}
              autoFocus
            />
            {errors.firstName && (
              <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>
            )}
          </div>

          {/* Fields area */}
          <div className="space-y-1 relative">
            <div className="space-y-3">
              <div>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (errors.lastName) {
                      setErrors(prev => ({ ...prev, lastName: '' }))
                    }
                  }}
                  placeholder={t('users.lastName') || 'Фамилия'}
                  className={cn("text-sm", errors.lastName && "border-red-500")}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>
                )}
              </div>
              <div>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) {
                      setErrors(prev => ({ ...prev, email: '' }))
                    }
                  }}
                  placeholder={t('users.email') || 'Email'}
                  className={cn("text-sm", errors.email && "border-red-500")}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder={t('users.phone') || '+7 (999) 999-99-99'}
                  className={cn("text-sm", errors.phone && "border-red-500")}
                />
                {errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
              <Input
                id="telegramUsername"
                type="text"
                value={telegramUsername}
                onChange={(e) => setTelegramUsername(e.target.value)}
                placeholder={t('users.telegramUsername') || 'Ник в Telegram'}
                className="text-sm"
              />
              <div className="relative">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) {
                        setErrors(prev => ({ ...prev, password: '' }))
                      }
                      // Clear confirm password error if passwords match
                      if (errors.confirmPassword && e.target.value === confirmPassword) {
                        setErrors(prev => ({ ...prev, confirmPassword: '' }))
                      }
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => {
                      // Delay to allow interaction with the popover
                      setTimeout(() => setIsPasswordFocused(false), 200)
                    }}
                    placeholder={t('users.password') || 'Пароль'}
                    className={cn("text-sm pr-10", errors.password && "border-red-500")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full w-10 hover:bg-transparent z-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {isPasswordFocused && password.length > 0 && (
                  <div className="absolute left-0 top-full mt-1 w-64 p-3 bg-popover border border-border rounded-md shadow-md z-50">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground">
                        {t('users.passwordRequirements') || 'Требования к паролю:'}
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li className={cn("flex items-center gap-2", password.length >= 6 && "text-green-600")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", password.length >= 6 ? "bg-green-600" : "bg-muted-foreground")} />
                          {t('users.passwordRequirement.length') || 'Минимум 6 символов'}
                        </li>
                        <li className={cn("flex items-center gap-2", /[A-Za-z]/.test(password) && "text-green-600")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", /[A-Za-z]/.test(password) ? "bg-green-600" : "bg-muted-foreground")} />
                          {t('users.passwordRequirement.letter') || 'Хотя бы одна буква'}
                        </li>
                        <li className={cn("flex items-center gap-2", /[0-9]/.test(password) && "text-green-600")}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", /[0-9]/.test(password) ? "bg-green-600" : "bg-muted-foreground")} />
                          {t('users.passwordRequirement.number') || 'Хотя бы одна цифра'}
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
                {errors.password && Array.isArray(errors.password) && errors.password.length > 0 && (
                  <div className="mt-1">
                    {errors.password.map((error, index) => (
                      <p key={index} className="text-xs text-red-500">{error}</p>
                    ))}
                  </div>
                )}
                {errors.password && typeof errors.password === 'string' && (
                  <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: '' }))
                    }
                  }}
                  placeholder={t('users.confirmPassword') || 'Подтвердите пароль'}
                  className={cn("text-sm pr-10", errors.confirmPassword && "border-red-500")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              {/* Role selection at the bottom left */}
              <div className="flex items-center gap-2 text-xs">
                <Popover open={isRoleSelectOpen} onOpenChange={setIsRoleSelectOpen}>
                  <PopoverTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      {roles.find(r => r.value === role)?.label || t('users.selectRole')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder={t('users.searchRole') || t('common.search')} />
                      <CommandList>
                        <CommandEmpty>{t('common.noData')}</CommandEmpty>
                        <CommandGroup>
                          {roles.map((r) => (
                            <CommandItem
                              key={r.value}
                              value={r.label}
                              onSelect={() => {
                                setRole(r.value)
                                setIsRoleSelectOpen(false)
                              }}
                            >
                              {r.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {/* Save button at the bottom right */}
              <Button 
                size="icon" 
                className="h-10 w-10 rounded-full" 
                onClick={handleSave}
                disabled={loading || !isFormValid}
                title={t('users.createUser') || 'Создать пользователя'}
              >
                <Check className="h-5 w-5" strokeWidth={3} />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

