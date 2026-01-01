// src/pages/NetworkGraphView.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search, ZoomIn, ZoomOut, RotateCcw,
  Download, Play, Pause,
  AlertTriangle,
  Users, Loader2, Eye,
  Target, Network, Shield
} from 'lucide-react'
import { personsApi, casesApi, searchApi } from '../services/api'
import {
  CaseIcon, SuspectIcon, ArrestedIcon, ReferenceIcon,
  DNAIcon, SampleIcon, FingerprintIcon, DrugIcon,
  WeaponIcon, LocationIcon, VehicleIcon, PhoneIcon,
  MoneyIcon, OrganizationIcon, VictimIcon, DocumentIcon
} from '../components/ForensicIcons'

// Types
interface GraphNode {
  id: string
  type: 'case' | 'person' | 'sample' | 'cluster'
  label: string
  data: any
  level: number
  color?: string
  size?: number
  isCenter?: boolean
  clusterInfo?: {
    caseCount: number
    personCount: number
    sampleCount: number
    items: any[]
  }
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
  color?: string
}

interface NetworkStats {
  totalCases: number
  totalPersons: number
  totalSamples: number
  suspects: number
  arrested: number
  references: number
  depth: number
}

const MAX_NODES = 100
const CLUSTER_THRESHOLD = 50

export default function NetworkGraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<any>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0, level: 0 })
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null)
  const [filter, setFilter] = useState<'all' | 'suspect' | 'arrested'>('all')
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set())
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true)

  // Search
  const { data: searchResults } = useQuery({
    queryKey: ['network-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm, 'all'),
    enabled: searchTerm.length >= 2,
  })

  // Deep Network Loading - 3 Levels
  const loadNetworkData = useCallback(async (entityType: string, entityId: string) => {
    setIsLoading(true)
    setLoadingProgress({ current: 0, total: 0, level: 1 })
    
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const visitedCases = new Set<string>()
    const visitedPersons = new Set<string>()
    const allPersons: any[] = []
    
    try {
      // Level 1: Start from case or person
      if (entityType === 'case') {
        const [caseInfo, samples, persons] = await Promise.all([
          casesApi.getById(entityId),
          casesApi.getSamples(entityId),
          casesApi.getPersons(entityId)
        ])
        
        visitedCases.add(entityId)
        
        // Add center case
        nodes.push({
          id: entityId,
          type: 'case',
          label: caseInfo.case_number,
          data: caseInfo,
          level: 0,
          color: '#00d4ff',
          size: 30,
          isCenter: true
        })
        
        // Add samples
        samples?.forEach((s: any) => {
          nodes.push({
            id: s.sample_id,
            type: 'sample',
            label: s.lab_number,
            data: s,
            level: 1,
            color: '#4895ef',
            size: 15
          })
          edges.push({
            source: entityId,
            target: s.sample_id,
            type: 'has_sample',
            color: '#00d4ff'
          })
        })
        
        // Add persons from level 1
        persons?.forEach((p: any) => {
          if (!visitedPersons.has(p.person_id)) {
            visitedPersons.add(p.person_id)
            allPersons.push(p)
            nodes.push({
              id: p.person_id,
              type: 'person',
              label: p.full_name,
              data: p,
              level: 1,
              color: p.role === 'Suspect' ? '#ef233c' : p.role === 'Arrested' ? '#f77f00' : '#2ec4b6',
              size: 22
            })
            if (samples?.length > 0) {
              edges.push({
                source: samples[0].sample_id,
                target: p.person_id,
                type: 'dna_match',
                label: 'DNA',
                color: '#ef233c'
              })
            }
          }
        })
      } else {
        // Start from person
        const [person, cases] = await Promise.all([
          personsApi.getById(entityId),
          personsApi.getCases(entityId)
        ])
        
        visitedPersons.add(entityId)
        allPersons.push(person)
        
        nodes.push({
          id: entityId,
          type: 'person',
          label: person.full_name,
          data: person,
          level: 0,
          color: person.person_type === 'Suspect' ? '#ef233c' : person.person_type === 'Arrested' ? '#f77f00' : '#2ec4b6',
          size: 30,
          isCenter: true
        })
        
        cases?.forEach((c: any) => {
          if (!visitedCases.has(c.case_id)) {
            visitedCases.add(c.case_id)
            nodes.push({
              id: c.case_id,
              type: 'case',
              label: c.case_number,
              data: c,
              level: 1,
              color: '#00d4ff',
              size: 20
            })
            edges.push({
              source: entityId,
              target: c.case_id,
              type: 'involved_in',
              label: c.role,
              color: '#4895ef'
            })
          }
        })
      }
      
      setLoadingProgress({ current: nodes.length, total: 0, level: 1 })
      
      // Level 2: Expand each person to find more cases
      setLoadingProgress(prev => ({ ...prev, level: 2 }))
      const level2Persons = [...allPersons]
      
      for (const person of level2Persons) {
        if (nodes.length >= MAX_NODES) break
        
        try {
          const cases = await personsApi.getCases(person.person_id)
          
          for (const c of cases || []) {
            if (visitedCases.has(c.case_id) || nodes.length >= MAX_NODES) continue
            
            visitedCases.add(c.case_id)
            nodes.push({
              id: c.case_id,
              type: 'case',
              label: c.case_number,
              data: c,
              level: 2,
              color: '#a855f7',
              size: 18
            })
            edges.push({
              source: person.person_id,
              target: c.case_id,
              type: 'found_in',
              label: 'พบใน',
              color: '#a855f7'
            })
            
            // Get persons from this case
            try {
              const casePersons = await casesApi.getPersons(c.case_id)
              for (const cp of casePersons || []) {
                if (visitedPersons.has(cp.person_id) || nodes.length >= MAX_NODES) continue
                
                visitedPersons.add(cp.person_id)
                allPersons.push(cp)
                nodes.push({
                  id: cp.person_id,
                  type: 'person',
                  label: cp.full_name,
                  data: cp,
                  level: 2,
                  color: cp.role === 'Suspect' ? '#ef233c' : cp.role === 'Arrested' ? '#f77f00' : '#2ec4b6',
                  size: 18
                })
                edges.push({
                  source: c.case_id,
                  target: cp.person_id,
                  type: 'involved',
                  color: cp.role === 'Suspect' ? '#ef233c' : '#f77f00'
                })
              }
            } catch {}
          }
          
          setLoadingProgress({ current: nodes.length, total: MAX_NODES, level: 2 })
        } catch {}
      }
      
      // Level 3: Expand new persons
      setLoadingProgress(prev => ({ ...prev, level: 3 }))
      const level3Persons = allPersons.filter(p => {
        const node = nodes.find(n => n.id === p.person_id)
        return node && node.level === 2
      })
      
      for (const person of level3Persons) {
        if (nodes.length >= MAX_NODES) break
        
        try {
          const cases = await personsApi.getCases(person.person_id)
          
          for (const c of cases || []) {
            if (visitedCases.has(c.case_id) || nodes.length >= MAX_NODES) continue
            
            visitedCases.add(c.case_id)
            nodes.push({
              id: c.case_id,
              type: 'case',
              label: c.case_number,
              data: c,
              level: 3,
              color: '#8b5cf6',
              size: 15
            })
            edges.push({
              source: person.person_id,
              target: c.case_id,
              type: 'found_in',
              label: 'พบใน',
              color: '#8b5cf6'
            })
          }
          
          setLoadingProgress({ current: nodes.length, total: MAX_NODES, level: 3 })
        } catch {}
      }
      
      // Calculate stats
      const personNodes = nodes.filter(n => n.type === 'person')
      const stats: NetworkStats = {
        totalCases: nodes.filter(n => n.type === 'case').length,
        totalPersons: personNodes.length,
        totalSamples: nodes.filter(n => n.type === 'sample').length,
        suspects: personNodes.filter(n => n.data?.role === 'Suspect' || n.data?.person_type === 'Suspect').length,
        arrested: personNodes.filter(n => n.data?.role === 'Arrested' || n.data?.person_type === 'Arrested').length,
        references: personNodes.filter(n => n.data?.role === 'Reference' || n.data?.person_type === 'Reference').length,
        depth: Math.max(...nodes.map(n => n.level))
      }
      
      setNetworkStats(stats)
      
      // Apply clustering if too many nodes
      if (nodes.length > CLUSTER_THRESHOLD) {
        // Group level 3 cases by connected person
        const level3Cases = nodes.filter(n => n.type === 'case' && n.level === 3)
        const clusters: Record<string, GraphNode[]> = {}
        
        level3Cases.forEach(caseNode => {
          const edge = edges.find(e => e.target === caseNode.id)
          if (edge) {
            if (!clusters[edge.source]) clusters[edge.source] = []
            clusters[edge.source].push(caseNode)
          }
        })
        
        // Replace with cluster nodes if > 3 cases
        Object.entries(clusters).forEach(([personId, cases]) => {
          if (cases.length > 3) {
            // Remove individual case nodes
            cases.forEach(c => {
              const idx = nodes.findIndex(n => n.id === c.id)
              if (idx > -1) nodes.splice(idx, 1)
              const edgeIdx = edges.findIndex(e => e.target === c.id)
              if (edgeIdx > -1) edges.splice(edgeIdx, 1)
            })
            
            // Add cluster node
            const clusterId = `cluster_${personId}`
            nodes.push({
              id: clusterId,
              type: 'cluster',
              label: `${cases.length} คดี`,
              data: cases,
              level: 3,
              color: '#6366f1',
              size: 25,
              clusterInfo: {
                caseCount: cases.length,
                personCount: 0,
                sampleCount: 0,
                items: cases
              }
            })
            edges.push({
              source: personId,
              target: clusterId,
              type: 'has_cases',
              color: '#6366f1'
            })
          }
        })
      }
      
      setGraphData({ nodes, edges })
      
    } catch (error) {
      console.error('Error loading network:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current || graphData.nodes.length === 0) return

    const initCytoscape = async () => {
      const cytoscape = (await import('cytoscape')).default
      const fcose = (await import('cytoscape-fcose')).default
      
      cytoscape.use(fcose)

      if (cyRef.current) {
        cyRef.current.destroy()
      }
      containerRef.current!.innerHTML = ''

      // Filter nodes based on current filter
      let filteredNodes = graphData.nodes
      let filteredEdges = graphData.edges
      
      if (filter !== 'all') {
        const personFilter = filter === 'suspect' ? 'Suspect' : 'Arrested'
        const allowedPersonIds = new Set(
          graphData.nodes
            .filter(n => n.type === 'person' && (n.data?.role === personFilter || n.data?.person_type === personFilter))
            .map(n => n.id)
        )
        
        // Include center node always
        const centerNode = graphData.nodes.find(n => n.isCenter)
        if (centerNode) allowedPersonIds.add(centerNode.id)
        
        // Get connected cases
        const allowedCaseIds = new Set<string>()
        filteredEdges.forEach(e => {
          if (allowedPersonIds.has(e.source)) allowedCaseIds.add(e.target)
          if (allowedPersonIds.has(e.target)) allowedCaseIds.add(e.source)
        })
        
        filteredNodes = graphData.nodes.filter(n => 
          allowedPersonIds.has(n.id) || 
          allowedCaseIds.has(n.id) ||
          n.type === 'sample' ||
          n.type === 'cluster'
        )
        
        const nodeIds = new Set(filteredNodes.map(n => n.id))
        filteredEdges = graphData.edges.filter(e => 
          nodeIds.has(e.source) && nodeIds.has(e.target)
        )
      }

      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...filteredNodes.map(n => ({
            data: {
              id: n.id,
              label: n.label,
              type: n.type,
              color: n.color,
              size: n.size,
              level: n.level,
              isCenter: n.isCenter,
              nodeData: n.data,
              clusterInfo: n.clusterInfo
            }
          })),
          ...filteredEdges.map((e, i) => ({
            data: {
              id: `edge-${i}`,
              source: e.source,
              target: e.target,
              type: e.type,
              label: e.label,
              color: e.color
            }
          }))
        ],
        style: [
          {
            selector: 'node',
            style: {
              'background-color': 'data(color)',
              'label': 'data(label)',
              'color': '#e0e1dd',
              'text-valign': 'bottom',
              'text-halign': 'center',
              'font-size': '9px',
              'text-margin-y': '5px',
              'width': 'data(size)',
              'height': 'data(size)',
              'border-width': 2,
              'border-color': 'data(color)',
              'text-max-width': '80px',
              'text-wrap': 'ellipsis'
            }
          },
          {
            selector: 'node[type="case"]',
            style: {
              'shape': 'round-rectangle',
              'width': 50,
              'height': 35
            }
          },
          {
            selector: 'node[type="person"]',
            style: {
              'shape': 'ellipse'
            }
          },
          {
            selector: 'node[type="sample"]',
            style: {
              'shape': 'diamond',
              'width': 25,
              'height': 25
            }
          },
          {
            selector: 'node[type="cluster"]',
            style: {
              'shape': 'round-rectangle',
              'width': 60,
              'height': 40,
              'border-style': 'dashed',
              'border-width': 3,
              'font-weight': 'bold'
            }
          },
          {
            selector: 'node[?isCenter]',
            style: {
              'border-width': 4,
              'border-color': '#ffffff',
              'width': 60,
              'height': 45,
              'font-size': '11px',
              'font-weight': 'bold'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 4,
              'border-color': '#ffd700',
              'background-opacity': 1
            }
          },
          {
            selector: 'edge',
            style: {
              'width': 2,
              'line-color': 'data(color)',
              'target-arrow-color': 'data(color)',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
              'opacity': 0.7
            }
          },
          {
            selector: 'edge[type="dna_match"]',
            style: {
              'width': 3,
              'line-style': 'solid',
              'line-color': '#ef233c',
              'target-arrow-color': '#ef233c'
            }
          },
          {
            selector: 'edge[type="found_in"]',
            style: {
              'line-style': 'dashed'
            }
          },
          {
            selector: 'edge[type="has_cases"]',
            style: {
              'line-style': 'dotted',
              'width': 3
            }
          }
        ],
        layout: {
          name: 'fcose',
          animate: true,
          animationDuration: 1500,
          randomize: false,
          fit: true,
          padding: 50,
          nodeDimensionsIncludeLabels: true,
          idealEdgeLength: (edge: any) => {
            const sourceLevel = edge.source().data('level') || 0
            const targetLevel = edge.target().data('level') || 0
            return 80 + Math.abs(sourceLevel - targetLevel) * 30
          },
          nodeRepulsion: 10000,
          gravity: 0.3,
          gravityRange: 3.8,
          nestingFactor: 0.1
        }
      })

      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        setSelectedNode({
          id: node.id(),
          type: node.data('type'),
          label: node.data('label'),
          data: node.data('nodeData'),
          level: node.data('level'),
          clusterInfo: node.data('clusterInfo')
        })
      })

      cy.on('tap', (evt: any) => {
        if (evt.target === cy) {
          setSelectedNode(null)
        }
      })

      cyRef.current = cy
    }

    initCytoscape()

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy()
      }
    }
  }, [graphData, filter])

  // Controls
  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.2)
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)
  const handleReset = () => cyRef.current?.fit()
  
  const handleTogglePhysics = () => {
    setIsPhysicsRunning(!isPhysicsRunning)
    if (cyRef.current) {
      if (isPhysicsRunning) {
        cyRef.current.nodes().lock()
      } else {
        cyRef.current.nodes().unlock()
        cyRef.current.layout({ name: 'fcose', animate: true }).run()
      }
    }
  }

  const selectEntity = (type: string, id: string) => {
    setSelectedEntity({ type, id })
    setSearchTerm('')
    setFilter('all')
    loadNetworkData(type, id)
  }

  const handleExport = () => {
    if (cyRef.current) {
      const png = cyRef.current.png({ scale: 2, bg: '#0d1b2a' })
      const link = document.createElement('a')
      link.href = png
      link.download = `network-graph-${Date.now()}.png`
      link.click()
    }
  }

  return (
    <div className="h-full flex bg-dark-300">
      {/* Left Panel */}
      <div className="w-80 bg-dark-200 border-r border-dark-100 flex flex-col">
        <div className="p-4 border-b border-dark-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Network className="w-5 h-5 text-primary-500" />
            Network Investigation
          </h2>
          <p className="text-xs text-dark-100 mt-1">ค้นหาขบวนการ 3 ชั้น</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-dark-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-100" />
            <input
              type="text"
              placeholder="ค้นหาคดี, บุคคล..."
              className="input w-full pl-10 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {searchTerm.length >= 2 && searchResults?.data ? (
            <div className="space-y-3">
              {searchResults.data.cases?.length > 0 && (
                <div>
                  <p className="text-xs text-dark-100 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> คดี
                  </p>
                  <div className="space-y-1">
                    {searchResults.data.cases.slice(0, 5).map((c: any) => (
                      <button
                        key={c.case_id}
                        onClick={() => selectEntity('case', c.case_id)}
                        className="w-full text-left p-2 bg-dark-300 rounded hover:bg-dark-100/50 transition-colors"
                      >
                        <p className="font-mono text-sm text-primary-500">{c.case_number}</p>
                        <p className="text-xs text-dark-100 truncate">{c.case_type}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.data.persons?.length > 0 && (
                <div>
                  <p className="text-xs text-dark-100 mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" /> บุคคล
                  </p>
                  <div className="space-y-1">
                    {searchResults.data.persons.slice(0, 5).map((p: any) => (
                      <button
                        key={p.person_id}
                        onClick={() => selectEntity('person', p.person_id)}
                        className="w-full text-left p-2 bg-dark-300 rounded hover:bg-dark-100/50 transition-colors"
                      >
                        <p className="font-medium text-sm">{p.full_name}</p>
                        <p className="text-xs font-mono text-dark-100">{p.id_number}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : networkStats ? (
            <div className="space-y-4">
              {/* Network Stats */}
              <div className="card bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="font-semibold text-red-400">พบขบวนการ!</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary-500">{networkStats.totalCases}</p>
                    <p className="text-xs text-dark-100">คดี</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-400">{networkStats.totalPersons}</p>
                    <p className="text-xs text-dark-100">บุคคล</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{networkStats.totalSamples}</p>
                    <p className="text-xs text-dark-100">วัตถุพยาน</p>
                  </div>
                </div>
              </div>

              {/* Person Breakdown */}
              <div className="card bg-dark-300">
                <p className="text-xs text-dark-100 mb-2">บุคคลในขบวนการ</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500"></span>
                      <span className="text-sm">Suspect</span>
                    </div>
                    <span className="font-bold text-red-400">{networkStats.suspects}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                      <span className="text-sm">Arrested</span>
                    </div>
                    <span className="font-bold text-orange-400">{networkStats.arrested}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-green-500"></span>
                      <span className="text-sm">Reference</span>
                    </div>
                    <span className="font-bold text-green-400">{networkStats.references}</span>
                  </div>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className="card bg-dark-300">
                <p className="text-xs text-dark-100 mb-2">กรองการแสดงผล</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      filter === 'all' ? 'bg-primary-500 text-dark-300' : 'bg-dark-100 hover:bg-dark-100/70'
                    }`}
                  >
                    <Eye className="w-3 h-3 inline mr-1" />
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setFilter('suspect')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      filter === 'suspect' ? 'bg-red-500 text-white' : 'bg-dark-100 hover:bg-dark-100/70'
                    }`}
                  >
                    <Shield className="w-3 h-3 inline mr-1" />
                    Suspect
                  </button>
                  <button
                    onClick={() => setFilter('arrested')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      filter === 'arrested' ? 'bg-orange-500 text-white' : 'bg-dark-100 hover:bg-dark-100/70'
                    }`}
                  >
                    <Users className="w-3 h-3 inline mr-1" />
                    Arrested
                  </button>
                </div>
              </div>

              {/* Legend */}
              <div className="card bg-dark-300 p-3">
                <p className="text-xs text-dark-100 mb-2">Legend - Entity Types</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CaseIcon size={18} color="#00d4ff" />
                    <span>คดีหลัก</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CaseIcon size={18} color="#a855f7" />
                    <span>คดีเชื่อมโยง</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SuspectIcon size={18} color="#ef233c" />
                    <span>Suspect</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrestedIcon size={18} color="#f77f00" />
                    <span>Arrested</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ReferenceIcon size={18} color="#2ec4b6" />
                    <span>Reference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DNAIcon size={18} color="#4895ef" />
                    <span>DNA Evidence</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SampleIcon size={18} color="#4895ef" />
                    <span>วัตถุพยาน</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <FingerprintIcon size={18} color="#a855f7" />
                    <span>Fingerprint</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DrugIcon size={18} color="#f72585" />
                    <span>Drug</span>
                  </div>
                </div>
              </div>

              {/* More Icons Legend */}
              <div className="card bg-dark-300 p-3">
                <p className="text-xs text-dark-100 mb-2">More Types</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <WeaponIcon size={16} color="#6c757d" />
                    <span>Weapon</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <VehicleIcon size={16} color="#495057" />
                    <span>Vehicle</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <PhoneIcon size={16} color="#ffc300" />
                    <span>Phone</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MoneyIcon size={16} color="#ffd60a" />
                    <span>Money</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <LocationIcon size={16} color="#8338ec" />
                    <span>Location</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <OrganizationIcon size={16} color="#7209b7" />
                    <span>Organization</span>
                  </div>
                </div>
              </div>

              {/* Depth Info */}
              <div className="card bg-dark-300 p-3">
                <p className="text-xs text-dark-100 mb-1">ความลึก</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map(level => (
                    <div
                      key={level}
                      className={`flex-1 h-2 rounded ${
                        level <= networkStats.depth ? 'bg-primary-500' : 'bg-dark-100'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-dark-100 mt-1">{networkStats.depth} ชั้น</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-dark-100">
              <Network className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ค้นหาคดีหรือบุคคล</p>
              <p className="text-xs mt-1">เพื่อสืบค้นขบวนการ</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-dark-300/90 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">กำลังสืบค้นขบวนการ...</p>
              <p className="text-sm text-dark-100 mt-2">
                Level {loadingProgress.level} / 3
              </p>
              <p className="text-xs text-dark-100 mt-1">
                พบ {loadingProgress.current} nodes
              </p>
              <div className="w-48 h-2 bg-dark-100 rounded-full mt-4 mx-auto overflow-hidden">
                <div 
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${(loadingProgress.level / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Graph Container */}
        <div 
          ref={containerRef} 
          className="w-full h-full"
          style={{ background: '#0d1b2a' }}
        />

        {/* No Data Message */}
        {!isLoading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-dark-100">
              <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">เลือกคดีหรือบุคคลเพื่อสืบค้นขบวนการ</p>
              <p className="text-sm mt-2">ระบบจะค้นหาความเชื่อมโยง 3 ชั้น</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <button onClick={handleZoomIn} className="p-3 bg-dark-200/90 rounded-lg hover:bg-dark-100 transition-colors shadow-lg" title="Zoom In">
            <ZoomIn className="w-5 h-5" />
          </button>
          <button onClick={handleZoomOut} className="p-3 bg-dark-200/90 rounded-lg hover:bg-dark-100 transition-colors shadow-lg" title="Zoom Out">
            <ZoomOut className="w-5 h-5" />
          </button>
          <button onClick={handleReset} className="p-3 bg-dark-200/90 rounded-lg hover:bg-dark-100 transition-colors shadow-lg" title="Reset View">
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleTogglePhysics}
            className={`p-3 rounded-lg transition-colors shadow-lg ${isPhysicsRunning ? 'bg-primary-500/20 text-primary-500' : 'bg-dark-200/90'}`}
            title={isPhysicsRunning ? 'Lock Nodes' : 'Unlock Nodes'}
          >
            {isPhysicsRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button onClick={handleExport} className="p-3 bg-dark-200/90 rounded-lg hover:bg-dark-100 transition-colors shadow-lg" title="Export PNG">
            <Download className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Indicator */}
        {graphData.nodes.length > 0 && (
          <div className="absolute top-4 left-4 px-4 py-2 bg-dark-200/90 rounded-lg shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <Network className="w-4 h-4 text-primary-500" />
              <span>Network Mode</span>
              <span className="text-dark-100 text-xs">
                • {graphData.nodes.length} nodes • {graphData.edges.length} edges
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Selected Node Details */}
      {selectedNode && (
        <div className="w-80 bg-dark-200 border-l border-dark-100 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">รายละเอียด</h3>
            <button onClick={() => setSelectedNode(null)} className="text-dark-100 hover:text-white">✕</button>
          </div>

          <div className="space-y-4">
            {/* Node Info */}
            <div className={`p-4 rounded-lg border ${
              selectedNode.type === 'case' ? 'bg-primary-500/10 border-primary-500/30' :
              selectedNode.type === 'person' ? 'bg-red-500/10 border-red-500/30' :
              selectedNode.type === 'cluster' ? 'bg-purple-500/10 border-purple-500/30' :
              'bg-blue-500/10 border-blue-500/30'
            }`}>
              <div className="mb-2">
                {selectedNode.type === 'case' ? (
                  <CaseIcon size={28} color="#00d4ff" />
                ) : selectedNode.type === 'person' ? (
                  (selectedNode.data?.role || selectedNode.data?.person_type) === 'Suspect' ? (
                    <SuspectIcon size={28} color="#ef233c" />
                  ) : (selectedNode.data?.role || selectedNode.data?.person_type) === 'Arrested' ? (
                    <ArrestedIcon size={28} color="#f77f00" />
                  ) : (
                    <ReferenceIcon size={28} color="#2ec4b6" />
                  )
                ) : selectedNode.type === 'cluster' ? (
                  <OrganizationIcon size={28} color="#a855f7" />
                ) : (
                  <SampleIcon size={28} color="#4895ef" />
                )}
              </div>
              <p className="font-semibold">{selectedNode.label}</p>
              <p className="text-xs text-dark-100 capitalize">{selectedNode.type}</p>
              {selectedNode.level !== undefined && (
                <p className="text-xs text-dark-100 mt-1">Level {selectedNode.level}</p>
              )}
            </div>

            {/* Cluster Details */}
            {selectedNode.type === 'cluster' && selectedNode.clusterInfo && (
              <div className="space-y-2">
                <p className="text-sm font-medium">รายการคดีใน Cluster</p>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {selectedNode.clusterInfo.items.map((item: any) => (
                    <button
                      key={item.id}
                      onClick={() => selectEntity('case', item.data?.case_id || item.id)}
                      className="w-full text-left p-2 bg-dark-300 rounded text-xs hover:bg-dark-100/50"
                    >
                      <p className="font-mono text-primary-500">{item.label || item.data?.case_number}</p>
                      <p className="text-dark-100 truncate">{item.data?.case_type}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Case/Person Details */}
            {selectedNode.data && selectedNode.type !== 'cluster' && (
              <div className="space-y-2 text-sm">
                {selectedNode.data.case_type && (
                  <div>
                    <p className="text-xs text-dark-100">ประเภทคดี</p>
                    <p>{selectedNode.data.case_type}</p>
                  </div>
                )}
                {selectedNode.data.province && (
                  <div>
                    <p className="text-xs text-dark-100">จังหวัด</p>
                    <p>{selectedNode.data.province}</p>
                  </div>
                )}
                {selectedNode.data.id_number && (
                  <div>
                    <p className="text-xs text-dark-100">เลขประจำตัว</p>
                    <p className="font-mono">{selectedNode.data.id_number}</p>
                  </div>
                )}
                {(selectedNode.data.role || selectedNode.data.person_type) && (
                  <div>
                    <p className="text-xs text-dark-100">บทบาท</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      (selectedNode.data.role || selectedNode.data.person_type) === 'Suspect' ? 'bg-red-500/20 text-red-400' :
                      (selectedNode.data.role || selectedNode.data.person_type) === 'Arrested' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {selectedNode.data.role || selectedNode.data.person_type}
                    </span>
                  </div>
                )}
                {selectedNode.data.sample_type && (
                  <div>
                    <p className="text-xs text-dark-100">ประเภทตัวอย่าง</p>
                    <p>{selectedNode.data.sample_type}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {selectedNode.type === 'case' && (
              <div className="flex gap-2">
                <button
                  onClick={() => selectEntity('case', selectedNode.id || selectedNode.data?.case_id)}
                  className="flex-1 btn-primary text-sm"
                >
                  ใช้เป็นจุดเริ่ม
                </button>
                <Link
                  to={`/cases/${selectedNode.id || selectedNode.data?.case_id}`}
                  className="flex-1 btn-secondary text-sm text-center"
                >
                  รายละเอียด
                </Link>
              </div>
            )}

            {selectedNode.type === 'person' && (
              <div className="flex gap-2">
                <button
                  onClick={() => selectEntity('person', selectedNode.id || selectedNode.data?.person_id)}
                  className="flex-1 btn-primary text-sm"
                >
                  ใช้เป็นจุดเริ่ม
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
