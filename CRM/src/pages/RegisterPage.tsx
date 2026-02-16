import { RegisterForm } from "@/components/crm/auth-forms"
import { useTranslation } from '@/lib/i18n/i18n-context'
import { Languages } from 'lucide-react'

export default function RegisterPage() {
  const { language, setLanguage } = useTranslation()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/[0.07] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/[0.07] rounded-full blur-[120px] pointer-events-none" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full px-6 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-10">
          <a href="/" className="text-xl font-semibold tracking-tight text-white hover:text-white/80 transition-colors">
            TripSystem
          </a>
        </div>

        {/* Form card */}
        <div className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-8">
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
