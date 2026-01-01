import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import GraphView from './pages/GraphView'
import PersonsPage from './pages/PersonsPage'
import LinksPage from './pages/LinksPage'
import SearchPage from './pages/SearchPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="graph" element={<GraphView />} />
        <Route path="graph/person/:id" element={<GraphView />} />
        <Route path="graph/case/:id" element={<GraphView />} />
        <Route path="persons" element={<PersonsPage />} />
        <Route path="links" element={<LinksPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
    </Routes>
  )
}

export default App
