import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@/components/theme-provider'
import { I18nProvider } from '@/lib/i18n/i18n-context'
import { Toaster } from '@/components/ui/sonner'
import { Toaster as ToastToaster } from '@/components/ui/toaster'
import { queryClient } from '@/lib/query-client'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
// Temporarily disabled Analytics to debug white screen
// import { Analytics } from '@vercel/analytics/react'

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DealsPage = lazy(() => import('./pages/DealsPage'))
const DealDetailPage = lazy(() => import('./pages/DealDetailPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const ContactsPage = lazy(() => import('./pages/ContactsPage'))
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage'))
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'))
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const LogsPage = lazy(() => import('./pages/LogsPage'))
const ImportExportPage = lazy(() => import('./pages/ImportExportPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SettingsPipelinesPage = lazy(() => import('./pages/SettingsPipelinesPage'))
const SettingsPreferencesPage = lazy(() => import('./pages/SettingsPreferencesPage'))
const SettingsProfilePage = lazy(() => import('./pages/SettingsProfilePage'))
const SettingsShortcutsPage = lazy(() => import('./pages/SettingsShortcutsPage'))
const SettingsUsersPage = lazy(() => import('./pages/SettingsUsersPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/deals" element={<DealsPage />} />
              <Route path="/deals/:id" element={<DealDetailPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/contacts/:id" element={<ContactDetailPage />} />
              <Route path="/companies" element={<CompaniesPage />} />
              <Route path="/companies/:id" element={<CompanyDetailPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/import-export" element={<ImportExportPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/pipelines" element={<SettingsPipelinesPage />} />
              <Route path="/settings/preferences" element={<SettingsPreferencesPage />} />
              <Route path="/settings/profile" element={<SettingsProfilePage />} />
              <Route path="/settings/shortcuts" element={<SettingsShortcutsPage />} />
              <Route path="/settings/users" element={<SettingsUsersPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
        <ToastToaster />
        {/* <Analytics /> */}
        <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}

export default App

