// src/pages/JarvisNetworkPage.tsx
// JARVIS-style Network Investigation with D3.js

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  Search, ZoomIn, ZoomOut, RotateCcw, Download,
  AlertTriangle, Users, Loader2, Eye, Target,
  Network, Shield, Crosshair, Radio,
  FileText, UserX, UserMinus, User, Dna, FlaskConical
} from 'lucide-react'
import { personsApi, casesApi, searchApi } from '../services/api'
import JarvisGraphEnhanced from '../components/JarvisGraphEnhanced'

interface GraphNode {
  id: string
  type: 'case' | 'person' | 'sample' | 'cluster'
  label: string
  role?: string
  level?: number
  isCenter?: boolean
  data?: any
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
}

interface NetworkStats {
  totalCases: number
  totalPersons: number
  totalSamples: number
  suspects: number
  arrested: number
  references: number
}

export default function JarvisNetworkPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get('type') || 'case'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ level: 0, nodes: 0 })
  const [filter, setFilter] = useState<'all' | 'suspect' | 'arrested'>('all')

  // Search query
  const { data: searchResults } = useQuery({
    queryKey: ['jarvis-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm),
    enabled: searchTerm.length >= 2,
  })

  // Load network data (3 levels deep)
  const loadNetworkData = useCallback(async (entityType: string, entityId: string) => {
    setIsLoading(true)
    setLoadingProgress({ level: 0, nodes: 0 })
    
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const visitedCases = new Set<string>()
    const visitedPersons = new Set<string>()
    
    const MAX_NODES = 100
    const MAX_LEVELS = 3

    try {
      // Helper to add case node
      const addCaseNode = async (caseId: string, level: number, isCenter = false) => {
        if (visitedCases.has(caseId) || nodes.length >= MAX_NODES) return null
        visitedCases.add(caseId)

        try {
          const caseData = await casesApi.getById(caseId)
          if (!caseData) return null

          const node: GraphNode = {
            id: `case-${caseId}`,
            type: 'case',
            label: caseData.case_number || caseId,
            level,
            isCenter,
            data: caseData
          }
          nodes.push(node)
          setLoadingProgress(p => ({ ...p, nodes: nodes.length }))
          return node
        } catch (e) {
          return null
        }
      }

      // Helper to add person node
      const addPersonNode = (person: any, level: number) => {
        const personId = person.person_id || person.id
        if (visitedPersons.has(personId) || nodes.length >= MAX_NODES) return null
        visitedPersons.add(personId)

        const node: GraphNode = {
          id: `person-${personId}`,
          type: 'person',
          label: person.full_name || 'Unknown',
          role: person.role || person.person_type,
          level,
          data: person
        }
        nodes.push(node)
        setLoadingProgress(p => ({ ...p, nodes: nodes.length }))
        return node
      }

      // Level 1: Start from center entity
      setLoadingProgress({ level: 1, nodes: 0 })
      
      if (entityType === 'case') {
        const centerCase = await addCaseNode(entityId, 0, true)
        if (!centerCase) throw new Error('Case not found')

        // Get persons in this case
        const persons = await casesApi.getPersons(entityId)
        for (const person of (persons || []).slice(0, 10)) {
          const personNode = addPersonNode(person, 1)
          if (personNode) {
            edges.push({
              source: centerCase.id,
              target: personNode.id,
              type: 'has_person',
              label: person.role
            })
          }
        }

        // Get samples and DNA
        const samples = await casesApi.getSamples(entityId)
        for (const sample of (samples || []).slice(0, 5)) {
          const sampleNode: GraphNode = {
            id: `sample-${sample.sample_id}`,
            type: 'sample',
            label: sample.lab_number || sample.sample_id,
            level: 1,
            data: sample
          }
          nodes.push(sampleNode)
          edges.push({
            source: centerCase.id,
            target: sampleNode.id,
            type: 'has_sample'
          })
          
          // Add DNA node if sample has DNA profile
          if (sample.has_dna_profile) {
            const dnaNode: GraphNode = {
              id: `dna-${sample.sample_id}`,
              type: 'sample', // Use sample type for DNA helix icon
              label: 'DNA Profile',
              level: 1,
              data: { ...sample, isDNA: true }
            }
            nodes.push(dnaNode)
            edges.push({
              source: sampleNode.id,
              target: dnaNode.id,
              type: 'has_dna'
            })
          }
        }
        
        // Get DNA matches (linked cases through DNA)
        try {
          const dnaMatches = await casesApi.getDnaMatches(entityId)
          for (const match of (dnaMatches || []).slice(0, 5)) {
            const linkedCaseId = match.matched_case_id || match.case_id_2
            if (linkedCaseId && linkedCaseId !== entityId && !visitedCases.has(linkedCaseId)) {
              const linkedCase = await addCaseNode(linkedCaseId, 1)
              if (linkedCase) {
                edges.push({
                  source: centerCase.id,
                  target: linkedCase.id,
                  type: 'dna_match',
                  label: 'DNA Match'
                })
              }
            }
          }
        } catch (e) {
          // No DNA matches
        }
      } else if (entityType === 'person') {
        // Start from person
        const personData = await personsApi.getById(entityId)
        if (!personData?.person) throw new Error('Person not found')
        
        const centerPerson = addPersonNode({ ...personData.person, isCenter: true }, 0)
        if (centerPerson) {
          centerPerson.isCenter = true
          
          // Get cases for this person
          const cases = personData.cases || []
          for (const c of cases.slice(0, 8)) {
            const caseNode = await addCaseNode(c.case_id, 1)
            if (caseNode) {
              edges.push({
                source: centerPerson.id,
                target: caseNode.id,
                type: 'involved_in'
              })
            }
          }
        }
      }

      // Level 2: Expand
      setLoadingProgress(p => ({ ...p, level: 2 }))
      
      const level1Persons = nodes.filter(n => n.type === 'person' && n.level === 1)
      for (const person of level1Persons) {
        if (nodes.length >= MAX_NODES) break
        
        try {
          const personCases = await personsApi.getCases(person.data?.person_id || person.id.replace('person-', ''))
          for (const c of (personCases || []).slice(0, 3)) {
            if (nodes.length >= MAX_NODES) break
            const caseNode = await addCaseNode(c.case_id, 2)
            if (caseNode) {
              edges.push({
                source: person.id,
                target: caseNode.id,
                type: 'found_in'
              })
            }
          }
        } catch (e) {
          // Continue
        }
      }

      // Level 3: More expansion
      if (nodes.length < MAX_NODES) {
        setLoadingProgress(p => ({ ...p, level: 3 }))
        
        const level2Cases = nodes.filter(n => n.type === 'case' && n.level === 2)
        for (const caseNode of level2Cases.slice(0, 5)) {
          if (nodes.length >= MAX_NODES) break
          
          try {
            const persons = await casesApi.getPersons(caseNode.data?.case_id || caseNode.id.replace('case-', ''))
            for (const p of (persons || []).slice(0, 3)) {
              if (nodes.length >= MAX_NODES) break
              const personNode = addPersonNode({ ...p, level: 3 }, 3)
              if (personNode) {
                edges.push({
                  source: caseNode.id,
                  target: personNode.id,
                  type: 'has_person'
                })
              }
            }
          } catch (e) {
            // Continue
          }
        }
      }

      // Calculate stats
      const stats: NetworkStats = {
        totalCases: nodes.filter(n => n.type === 'case').length,
        totalPersons: nodes.filter(n => n.type === 'person').length,
        totalSamples: nodes.filter(n => n.type === 'sample').length,
        suspects: nodes.filter(n => n.type === 'person' && n.role === 'Suspect').length,
        arrested: nodes.filter(n => n.type === 'person' && n.role === 'Arrested').length,
        references: nodes.filter(n => n.type === 'person' && n.role !== 'Suspect' && n.role !== 'Arrested').length
      }

      setGraphData({ nodes, edges })
      setNetworkStats(stats)
      setSelectedEntity({ type: entityType, id: entityId })

    } catch (error) {
      console.error('Error loading network:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load from URL params on mount
  useEffect(() => {
    if (id) {
      loadNetworkData(typeParam, id)
    }
  }, [id, typeParam, loadNetworkData])

  // Handle search result selection
  const handleSelectResult = (type: string, id: string) => {
    loadNetworkData(type, id)
    setSearchTerm('')
  }

  // Handle node click
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node)
  }

  // Filter nodes
  const getFilteredData = () => {
    if (filter === 'all') return graphData

    const allowedPersonIds = new Set(
      graphData.nodes
        .filter(n => {
          if (n.type !== 'person') return false
          if (filter === 'suspect') return n.role === 'Suspect'
          if (filter === 'arrested') return n.role === 'Arrested'
          return false
        })
        .map(n => n.id)
    )

    // Always include center node
    const centerNode = graphData.nodes.find(n => n.isCenter)
    if (centerNode) allowedPersonIds.add(centerNode.id)

    // Get connected cases
    const allowedCaseIds = new Set<string>()
    graphData.edges.forEach(e => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id
      const targetId = typeof e.target === 'string' ? e.target : e.target.id
      if (allowedPersonIds.has(sourceId)) allowedCaseIds.add(targetId)
      if (allowedPersonIds.has(targetId)) allowedCaseIds.add(sourceId)
    })

    const filteredNodes = graphData.nodes.filter(n =>
      allowedPersonIds.has(n.id) ||
      allowedCaseIds.has(n.id) ||
      n.type === 'sample' ||
      n.isCenter
    )

    const nodeIds = new Set(filteredNodes.map(n => n.id))
    const filteredEdges = graphData.edges.filter(e => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id
      const targetId = typeof e.target === 'string' ? e.target : e.target.id
      return nodeIds.has(sourceId) && nodeIds.has(targetId)
    })

    return { nodes: filteredNodes, edges: filteredEdges }
  }

  const filteredData = getFilteredData()

  return (
    <div className="flex h-full">
      {/* Left Panel */}
      <div className="w-80 border-r border-cyan-500/20 flex flex-col bg-gradient-to-b from-[#0a1520] to-[#0a0e14]">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold neon-text">Network Investigation</h2>
          </div>
          <p className="text-xs text-cyan-400/50">JARVIS Intelligence Analysis</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-cyan-500/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาคดี, บุคคล..."
              className="input-jarvis pl-10"
            />
            {searchTerm && (
              <Crosshair className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400 animate-pulse" />
            )}
          </div>

          {/* Search Results */}
          {searchTerm.length >= 2 && searchResults?.data && (
            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
              {searchResults.data.cases?.slice(0, 5).map((c: any) => (
                <button
                  key={c.case_id}
                  onClick={() => handleSelectResult('case', c.case_id)}
                  className="w-full text-left p-3 holo-card hover:border-cyan-400/50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={18} className="text-cyan-400" />
                    <div>
                      <p className="font-mono text-sm text-cyan-300 group-hover:neon-text">{c.case_number}</p>
                      <p className="text-xs text-cyan-400/50">{c.case_type}</p>
                    </div>
                  </div>
                </button>
              ))}
              {searchResults.data.persons?.slice(0, 5).map((p: any) => (
                <button
                  key={p.person_id}
                  onClick={() => handleSelectResult('person', p.person_id)}
                  className="w-full text-left p-3 holo-card hover:border-cyan-400/50 transition-all group"
                >
                  <div className="flex items-center gap-2">
                    {p.role === 'Suspect' ? <UserX size={18} className="text-red-500" /> :
                     p.role === 'Arrested' ? <UserMinus size={18} className="text-orange-500" /> :
                     <User size={18} className="text-green-400" />}
                    <div>
                      <p className="text-sm text-cyan-100 group-hover:text-cyan-300">{p.full_name}</p>
                      <p className="text-xs text-cyan-400/50 font-mono">{p.id_number}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Network Stats */}
        {networkStats && (
          <div className="p-4 border-b border-cyan-500/20">
            <div className="holo-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold neon-text">พบขบวนการ!</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <p className="text-xl font-bold stat-number-jarvis">{networkStats.totalCases}</p>
                  <p className="text-[10px] text-cyan-400/60">คดี</p>
                </div>
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <p className="text-xl font-bold stat-number-jarvis">{networkStats.totalPersons}</p>
                  <p className="text-[10px] text-cyan-400/60">บุคคล</p>
                </div>
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <p className="text-xl font-bold stat-number-jarvis">{networkStats.totalSamples}</p>
                  <p className="text-[10px] text-cyan-400/60">หลักฐาน</p>
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Suspect
                  </span>
                  <span className="text-red-400 font-bold">{networkStats.suspects}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Arrested
                  </span>
                  <span className="text-orange-400 font-bold">{networkStats.arrested}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Reference
                  </span>
                  <span className="text-green-400 font-bold">{networkStats.references}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-cyan-500/20">
          <p className="text-xs text-cyan-400/50 mb-2">กรองการแสดงผล</p>
          <div className="flex flex-wrap gap-2">
            {['all', 'suspect', 'arrested'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  filter === f
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                    : 'bg-cyan-500/5 text-cyan-400/60 border border-cyan-500/20 hover:border-cyan-400/30'
                }`}
              >
                {f === 'all' ? '👁 ทั้งหมด' : f === 'suspect' ? '🔴 Suspect' : '🟠 Arrested'}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs text-cyan-400/50 mb-3">Legend - Entity Types</p>
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <FileText size={20} className="text-cyan-400" style={{ filter: 'drop-shadow(0 0 4px #00f0ff)' }} />
              <span className="text-cyan-100/80">คดีหลัก</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <FileText size={20} className="text-purple-400" style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }} />
              <span className="text-cyan-100/80">คดีเชื่อมโยง</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <UserX size={20} className="text-red-500" style={{ filter: 'drop-shadow(0 0 4px #ff2d55)' }} />
              <span className="text-cyan-100/80">Suspect</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <UserMinus size={20} className="text-orange-500" style={{ filter: 'drop-shadow(0 0 4px #ff6b35)' }} />
              <span className="text-cyan-100/80">Arrested</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User size={20} className="text-green-400" style={{ filter: 'drop-shadow(0 0 4px #39ff14)' }} />
              <span className="text-cyan-100/80">Reference</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Dna size={20} className="text-blue-400" style={{ filter: 'drop-shadow(0 0 4px #4895ef)' }} />
              <span className="text-cyan-100/80">DNA / วัตถุพยาน</span>
            </div>
          </div>
          
          {/* Connection Types */}
          <p className="text-xs text-cyan-400/50 mt-4 mb-2">Connection Types</p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-red-500" />
              <span className="text-cyan-100/60">DNA Match</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-cyan-400 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #00f0ff, #00f0ff 4px, transparent 4px, transparent 8px)' }} />
              <span className="text-cyan-100/60">Found In</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative bg-[#0a0e14]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 border-4 border-cyan-400/20 rounded-full" />
                <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-cyan-400/10 rounded-full" />
                <div className="absolute inset-2 border-2 border-transparent border-t-cyan-400/50 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
                <Radio className="absolute inset-0 m-auto w-8 h-8 text-cyan-400 animate-pulse" />
              </div>
              <p className="text-cyan-400 font-semibold">กำลังสแกนขบวนการ...</p>
              <p className="text-cyan-400/60 text-sm mt-1">
                Level {loadingProgress.level} / 3 • {loadingProgress.nodes} nodes
              </p>
              <div className="w-48 h-1 bg-cyan-500/20 rounded-full mt-3 mx-auto overflow-hidden">
                <div 
                  className="h-full bg-cyan-400 data-flow"
                  style={{ width: `${(loadingProgress.level / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : filteredData.nodes.length > 0 ? (
          <JarvisGraphEnhanced
            nodes={filteredData.nodes}
            edges={filteredData.edges}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 mx-auto mb-6 hud-circle flex items-center justify-center">
                <Target className="w-12 h-12 text-cyan-400/50" />
              </div>
              <p className="text-xl text-cyan-400/80 font-semibold">JARVIS Network Analysis</p>
              <p className="text-cyan-400/50 mt-2">ค้นหาคดีหรือบุคคลเพื่อเริ่มวิเคราะห์</p>
              <p className="text-xs text-cyan-400/30 mt-4">
                ระบบจะสืบค้นความเชื่อมโยง 3 ชั้นอัตโนมัติ
              </p>
            </div>
          </div>
        )}

        {/* Top Status Bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="holo-card px-4 py-2 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-300">Network Mode</span>
              <span className="text-xs text-cyan-400/50">• {filteredData.nodes.length} nodes • {filteredData.edges.length} edges</span>
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <button className="w-10 h-10 holo-card flex items-center justify-center hover:border-cyan-400/50 transition-all">
            <ZoomIn className="w-5 h-5 text-cyan-400" />
          </button>
          <button className="w-10 h-10 holo-card flex items-center justify-center hover:border-cyan-400/50 transition-all">
            <ZoomOut className="w-5 h-5 text-cyan-400" />
          </button>
          <button className="w-10 h-10 holo-card flex items-center justify-center hover:border-cyan-400/50 transition-all">
            <RotateCcw className="w-5 h-5 text-cyan-400" />
          </button>
          <button className="w-10 h-10 holo-card flex items-center justify-center hover:border-cyan-400/50 transition-all bg-cyan-500/20">
            <Shield className="w-5 h-5 text-cyan-400" />
          </button>
          <button className="w-10 h-10 holo-card flex items-center justify-center hover:border-cyan-400/50 transition-all">
            <Download className="w-5 h-5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Right Panel - Selected Node Details */}
      {selectedNode && (
        <div className="w-80 border-l border-cyan-500/20 bg-gradient-to-b from-[#0a1520] to-[#0a0e14] p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-cyan-300">Node Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-cyan-400/50 hover:text-cyan-400"
            >
              ✕
            </button>
          </div>

          <div className="holo-card p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              {selectedNode.type === 'case' ? (
                <FileText size={32} className={selectedNode.isCenter ? 'text-cyan-400' : 'text-purple-400'} style={{ filter: `drop-shadow(0 0 6px ${selectedNode.isCenter ? '#00f0ff' : '#a855f7'})` }} />
              ) : selectedNode.type === 'person' ? (
                selectedNode.role === 'Suspect' ? <UserX size={32} className="text-red-500" style={{ filter: 'drop-shadow(0 0 6px #ff2d55)' }} /> :
                selectedNode.role === 'Arrested' ? <UserMinus size={32} className="text-orange-500" style={{ filter: 'drop-shadow(0 0 6px #ff6b35)' }} /> :
                <User size={32} className="text-green-400" style={{ filter: 'drop-shadow(0 0 6px #39ff14)' }} />
              ) : (
                <Dna size={32} className="text-blue-400" style={{ filter: 'drop-shadow(0 0 6px #4895ef)' }} />
              )}
              <div>
                <p className="font-semibold text-cyan-100">{selectedNode.label}</p>
                <p className="text-xs text-cyan-400/50 capitalize">{selectedNode.type}</p>
              </div>
            </div>

            {selectedNode.role && (
              <div className="mt-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  selectedNode.role === 'Suspect' ? 'bg-red-500/20 text-red-400' :
                  selectedNode.role === 'Arrested' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {selectedNode.role}
                </span>
              </div>
            )}
          </div>

          {selectedNode.data && (
            <div className="space-y-3 text-sm">
              {selectedNode.data.case_type && (
                <div>
                  <p className="text-xs text-cyan-400/50">ประเภทคดี</p>
                  <p className="text-cyan-100">{selectedNode.data.case_type}</p>
                </div>
              )}
              {selectedNode.data.province && (
                <div>
                  <p className="text-xs text-cyan-400/50">จังหวัด</p>
                  <p className="text-cyan-100">{selectedNode.data.province}</p>
                </div>
              )}
              {selectedNode.data.id_number && (
                <div>
                  <p className="text-xs text-cyan-400/50">เลขประจำตัว</p>
                  <p className="text-cyan-100 font-mono">{selectedNode.data.id_number}</p>
                </div>
              )}
              {selectedNode.data.full_name && (
                <div>
                  <p className="text-xs text-cyan-400/50">ชื่อ-สกุล</p>
                  <p className="text-cyan-100">{selectedNode.data.full_name}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {selectedNode.type === 'case' && (
              <>
                <button
                  onClick={() => loadNetworkData('case', selectedNode.data?.case_id || selectedNode.id.replace('case-', ''))}
                  className="w-full holo-btn text-sm"
                >
                  ใช้เป็นจุดเริ่มต้น
                </button>
                <Link
                  to={`/cases/${selectedNode.data?.case_id || selectedNode.id.replace('case-', '')}`}
                  className="block w-full holo-btn-secondary text-sm text-center"
                >
                  ดูรายละเอียด
                </Link>
              </>
            )}
            {selectedNode.type === 'person' && (
              <button
                onClick={() => loadNetworkData('person', selectedNode.data?.person_id || selectedNode.id.replace('person-', ''))}
                className="w-full holo-btn text-sm"
              >
                ใช้เป็นจุดเริ่มต้น
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
