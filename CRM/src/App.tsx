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

// Auth pages - load immediately (no skeleton needed)
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

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
            <Routes>
              {/* Auth pages - load immediately (not lazy, no Suspense) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Other pages - lazy loaded with Suspense */}
              <Route path="/" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DashboardPage />
                </Suspense>
              } />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/deals" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DealsPage />
                </Suspense>
              } />
              <Route path="/deals/:id" element={
                <Suspense fallback={<PageSkeleton />}>
                  <DealDetailPage />
                </Suspense>
              } />
              <Route path="/tasks" element={
                <Suspense fallback={<PageSkeleton />}>
                  <TasksPage />
                </Suspense>
              } />
              <Route path="/contacts" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ContactsPage />
                </Suspense>
              } />
              <Route path="/contacts/:id" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ContactDetailPage />
                </Suspense>
              } />
              <Route path="/companies" element={
                <Suspense fallback={<PageSkeleton />}>
                  <CompaniesPage />
                </Suspense>
              } />
              <Route path="/companies/:id" element={
                <Suspense fallback={<PageSkeleton />}>
                  <CompanyDetailPage />
                </Suspense>
              } />
              <Route path="/analytics" element={
                <Suspense fallback={<PageSkeleton />}>
                  <AnalyticsPage />
                </Suspense>
              } />
              <Route path="/logs" element={
                <Suspense fallback={<PageSkeleton />}>
                  <LogsPage />
                </Suspense>
              } />
              <Route path="/import-export" element={
                <Suspense fallback={<PageSkeleton />}>
                  <ImportExportPage />
                </Suspense>
              } />
              <Route path="/users" element={
                <Suspense fallback={<PageSkeleton />}>
                  <UsersPage />
                </Suspense>
              } />
              <Route path="/settings" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsPage />
                </Suspense>
              } />
              <Route path="/settings/pipelines" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsPipelinesPage />
                </Suspense>
              } />
              <Route path="/settings/preferences" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsPreferencesPage />
                </Suspense>
              } />
              <Route path="/settings/profile" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsProfilePage />
                </Suspense>
              } />
              <Route path="/settings/shortcuts" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsShortcutsPage />
                </Suspense>
              } />
              <Route path="/settings/users" element={
                <Suspense fallback={<PageSkeleton />}>
                  <SettingsUsersPage />
                </Suspense>
              } />
            </Routes>
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

