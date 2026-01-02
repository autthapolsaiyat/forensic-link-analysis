// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SmartDashboard from './pages/SmartDashboard'
import JarvisNetworkPage from './pages/JarvisNetworkPage'
import HierarchicalNetworkPage from './pages/HierarchicalNetworkPage'
import IconGallery from './pages/IconGallery'
import PersonsPage from './pages/PersonsPage'
import LinksPage from './pages/LinksPage'
import SearchPage from './pages/SearchPage'
import CaseListPage from './pages/CaseListPage'
import CaseDetailPage from './pages/CaseDetailPage'
import InvestigationWorkspace from './pages/InvestigationWorkspace'
import LiveImportMonitor from './pages/LiveImportMonitor'

function App() {
  return (
    <Routes>
      {/* Fullscreen routes - no layout */}
      <Route path="/live" element={<LiveImportMonitor />} />
      <Route path="/import-monitor" element={<LiveImportMonitor />} />
      <Route path="/hierarchy/case/:id" element={<HierarchicalNetworkPage />} />
      <Route path="/hierarchy" element={<HierarchicalNetworkPage />} />
      
      {/* Normal routes with layout */}
      <Route path="/" element={<Layout />}>
        <Route index element={<SmartDashboard />} />
        <Route path="cases" element={<CaseListPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="graph" element={<JarvisNetworkPage />} />
        <Route path="graph/person/:id" element={<JarvisNetworkPage />} />
        <Route path="graph/case/:id" element={<JarvisNetworkPage />} />
        <Route path="case-graph" element={<JarvisNetworkPage />} />
        <Route path="advanced-graph" element={<JarvisNetworkPage />} />
        <Route path="network-graph" element={<JarvisNetworkPage />} />
        <Route path="icons" element={<IconGallery />} />
        <Route path="persons" element={<PersonsPage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="workspace" element={<InvestigationWorkspace />} />
      </Route>
    </Routes>
  )
}

export default App
