import { RegisterForm } from "@/components/crm/auth-forms"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { Languages } from 'lucide-react'
import Grainient from '@/components/shared/Grainient'

export default function RegisterPage() {
  const { language, setLanguage } = useTranslation()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Grainient Background */}
      <div className="absolute inset-0 z-0">
        <Grainient />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full px-6 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-10">
          <button onClick={() => { window.location.href = '/' }} className="text-xl font-semibold tracking-tight text-white hover:text-white/80 transition-colors">
            TripSystem
          </button>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.12] bg-black/70 backdrop-blur-xl p-8">
          <RegisterForm />
        </div>
      </div>

      {/* Language switcher - bottom right */}
      <div className="fixed bottom-5 right-5 z-20">
        <button
          onClick={() => setLanguage(language === 'ru' ? 'en' : 'ru')}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/40 hover:text-white/70 hover:border-white/15 transition-all"
          title={language === 'en' ? 'Русский' : 'English'}
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="uppercase font-medium">{language}</span>
        </button>
      </div>
    </div>
  )
}
