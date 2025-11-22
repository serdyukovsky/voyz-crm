"use client"

import { Instagram, MessageCircle, Phone, Users } from 'lucide-react'
import { Contact } from '@/types/contact'

interface SocialLinksProps {
  contact: Contact
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function SocialLinks({ contact, size = 'md', className }: SocialLinksProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const getSocialLink = (platform: string) => {
    const social = contact.social?.[platform as keyof typeof contact.social]
    if (!social) return null

    let url = social
    if (platform === 'telegram' && !url.startsWith('http')) {
      url = `https://t.me/${url.replace('@', '')}`
    }
    if (platform === 'whatsapp' && !url.startsWith('http')) {
      const phone = url.replace(/[^0-9]/g, '')
      url = `https://wa.me/${phone}`
    }

    return url
  }

  const socialPlatforms = [
    { key: 'instagram', icon: Instagram, label: 'Instagram' },
    { key: 'telegram', icon: MessageCircle, label: 'Telegram' },
    { key: 'whatsapp', icon: Phone, label: 'WhatsApp' },
    { key: 'vk', icon: Users, label: 'VK' },
  ]

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {socialPlatforms.map(({ key, icon: Icon, label }) => {
        const link = getSocialLink(key)
        if (!link) return null

        return (
          <a
            key={key}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            aria-label={`${label} link`}
            title={label}
          >
            <Icon className={sizeClasses[size]} />
          </a>
        )
      })}
    </div>
  )
}

