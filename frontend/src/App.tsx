// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import SmartDashboard from './pages/SmartDashboard'
import GraphView from './pages/GraphView'
import CaseGraphView from './pages/CaseGraphView'
import AdvancedGraphView from './pages/AdvancedGraphView'
import NetworkGraphView from './pages/NetworkGraphView'
import IconGallery from './pages/IconGallery'
import PersonsPage from './pages/PersonsPage'
import LinksPage from './pages/LinksPage'
import SearchPage from './pages/SearchPage'
import CaseListPage from './pages/CaseListPage'
import CaseDetailPage from './pages/CaseDetailPage'
import InvestigationWorkspace from './pages/InvestigationWorkspace'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<SmartDashboard />} />
        <Route path="cases" element={<CaseListPage />} />
        <Route path="cases/:id" element={<CaseDetailPage />} />
        <Route path="graph" element={<GraphView />} />
        <Route path="graph/person/:id" element={<GraphView />} />
        <Route path="graph/case/:id" element={<CaseGraphView />} />
        <Route path="case-graph" element={<CaseGraphView />} />
        <Route path="advanced-graph" element={<AdvancedGraphView />} />
        <Route path="network-graph" element={<NetworkGraphView />} />
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
