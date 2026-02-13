import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@/components/theme-provider'
import { I18nProvider } from '@/lib/i18n/i18n-context'
import { Toaster } from '@/components/ui/sonner'
import { Toaster as ToastToaster } from '@/components/ui/toaster'
import { queryClient } from '@/lib/query-client'
import { PageSkeleton } from '@/components/shared/loading-skeleton'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { setGlobalUnauthorizedHandler } from '@/lib/api/api-client'
import { SearchProvider } from '@/components/crm/search-context'
import { dealKeys } from '@/hooks/use-deals'
import { pipelineKeys } from '@/hooks/use-pipelines'
import { getDeals } from '@/lib/api/deals'
import { getPipelines } from '@/lib/api/pipelines'
// Temporarily disabled Analytics to debug white screen
// import { Analytics } from '@vercel/analytics/react'

// Prefetch critical data IMMEDIATELY (before React renders, in parallel with /me auth check)
// This eliminates the waterfall: /me (578ms) → mount → /deals (3.4s)
// Now: /me + /deals + /pipelines all fire at t=0
;(() => {
  const token = localStorage.getItem('access_token')
  if (!token) return
  const pipelineId = localStorage.getItem('lastSelectedFunnelId')
  if (pipelineId) {
    queryClient.prefetchQuery({
      queryKey: dealKeys.list({ pipelineId, limit: 1000, view: 'kanban' as const }),
      queryFn: () => getDeals({ pipelineId, limit: 1000, view: 'kanban' }),
    })
  }
  queryClient.prefetchQuery({
    queryKey: pipelineKeys.list(),
    queryFn: () => getPipelines(),
  })
})()

// Auth pages - load immediately (no skeleton needed)
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Eagerly start loading DealsPage chunk (don't wait for auth to complete)
const dealsPageImport = import('./pages/DealsPage')

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DealsPage = lazy(() => dealsPageImport)
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

// Component to set up global unauthorized handler
function UnauthorizedHandler() {
  const { logout } = useAuth()
  
  useEffect(() => {
    // Set global handler for 401 responses
    setGlobalUnauthorizedHandler(() => {
      logout()
    })
  }, [logout])
  
  return null
}

function AppRoutes() {
  return (
    <>
      <Routes>
      {/* Auth pages - load immediately (not lazy, no Suspense) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Protected routes - all require authentication */}
      <Route path="/" element={<Navigate to="/deals" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <DashboardPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/deals" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <DealsPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/deals/:id" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <DealDetailPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/tasks" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <TasksPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/contacts" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <ContactsPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/contacts/:id" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <ContactDetailPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/companies" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <CompaniesPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/companies/:id" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <CompanyDetailPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <AnalyticsPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/logs" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <LogsPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/import-export" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <ImportExportPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <UsersPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <SettingsPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/settings/pipelines" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <SettingsPipelinesPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/settings/preferences" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <SettingsPreferencesPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/settings/profile" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <SettingsProfilePage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/settings/shortcuts" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <SettingsShortcutsPage />
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/settings/users" element={
        <ProtectedRoute>
          <Suspense fallback={<PageSkeleton />}>
            <SettingsUsersPage />
          </Suspense>
        </ProtectedRoute>
      } />
      </Routes>
    </>
  )
}

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
            <AuthProvider>
              <SearchProvider>
                <UnauthorizedHandler />
                <AppRoutes />
              </SearchProvider>
            </AuthProvider>
          </BrowserRouter>
          <Toaster />
          <ToastToaster />
          {/* <Analytics /> */}
          {/* React Query DevTools disabled */}
          {/* {import.meta.env.DEV && (
            <ReactQueryDevtools initialIsOpen={false} />
          )} */}
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}

export default App

