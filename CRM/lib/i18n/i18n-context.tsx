import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import enTranslations from './translations/en.json'
import ruTranslations from './translations/ru.json'

type Language = 'en' | 'ru'

type Translations = typeof enTranslations

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

const translations: Record<Language, Translations> = {
  en: enTranslations,
  ru: ruTranslations,
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Загружаем язык из localStorage или используем язык браузера
    const saved = localStorage.getItem('language') as Language
    if (saved && (saved === 'en' || saved === 'ru')) {
      return saved
    }
    // Определяем язык браузера
    const browserLang = navigator.language.split('-')[0]
    return browserLang === 'ru' ? 'ru' : 'en'
  })

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback на английский, если ключ не найден
        value = translations.en
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey]
          } else {
            return key // Возвращаем ключ, если перевод не найден
          }
        }
        break
      }
    }

    if (typeof value !== 'string') {
      return key
    }

    // Заменяем параметры в строке
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match
      })
    }

    return value
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider')
  }
  return context
}

