import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './pages/Dashboard'
import Leads from './pages/Leads'
import Customers from './pages/Customers'
import Tasks from './pages/Tasks'
import CommandCenter from './pages/CommandCenter'
import KnowledgeBase from './pages/KnowledgeBase'
import Emails from './pages/Emails'
import Workflows from './pages/Workflows'
import ComingSoon from './pages/ComingSoon'
import Analytics from './pages/Analytics'
import Login from './pages/Login'
import Register from './pages/Register'
import { NAV_ITEMS } from './data/navigation'

// Modules with a real page get a route above; everything else in
// NAV_ITEMS falls through to a polished "coming soon" placeholder so
// every sidebar link always leads somewhere.
const COMING_SOON_COPY = {
  '/workflows': 'Build safe trigger-based automations across your CRM, tasks and email.',
  '/settings': 'Company profile, integrations, and user management.',
}

function usePageTitle() {
  const { pathname } = useLocation()
  const match = NAV_ITEMS.find((item) =>
    item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
  )
  return match?.label ?? 'AutomateAI'
}

function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const title = usePageTitle()

  return (
    <div className="bg-grid min-h-screen bg-base">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="lg:pl-[248px]">
        <Topbar title={title} onOpenMobile={() => setMobileOpen(true)} />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/ai-agent" element={<CommandCenter />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/emails" element={<Emails />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/analytics" element={<Analytics />} />
            {Object.entries(COMING_SOON_COPY).map(([path, description]) => (
              <Route
                key={path}
                path={path}
                element={
                  <ComingSoon
                    title={NAV_ITEMS.find((i) => i.path === path)?.label ?? 'Coming soon'}
                    description={description}
                  />
                }
              />
            ))}
            <Route path="*" element={<ComingSoon title="Not found" description="That page doesn't exist." />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
