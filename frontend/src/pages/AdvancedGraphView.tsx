// src/pages/AdvancedGraphView.tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search, Box, Grid3X3, ZoomIn, ZoomOut, RotateCcw,
  Download, Play, Pause, Layers, Target
} from 'lucide-react'
import { personsApi, casesApi, searchApi } from '../services/api'
import {
  CaseIcon, SuspectIcon, ArrestedIcon, ReferenceIcon,
  SampleIcon, DNAIcon
} from '../components/ForensicIcons'

// Types
interface GraphNode {
  id: string
  type: 'case' | 'person' | 'sample' | 'linked_case'
  label: string
  data: any
  x?: number
  y?: number
  z?: number
  color?: string
  size?: number
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
  color?: string
}

export default function AdvancedGraphView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const graphRef = useRef<any>(null)
  const cyRef = useRef<any>(null)
  
  const [mode, setMode] = useState<'2d' | '3d'>('3d')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })

  // Search
  const { data: searchResults } = useQuery({
    queryKey: ['adv-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm, 'all'),
    enabled: searchTerm.length >= 2,
  })

  // Load person data
  const { data: personData } = useQuery({
    queryKey: ['person-graph', selectedEntity?.id],
    queryFn: async () => {
      if (!selectedEntity || selectedEntity.type !== 'person') return null
      const [person, cases] = await Promise.all([
        personsApi.getById(selectedEntity.id),
        personsApi.getCases(selectedEntity.id)
      ])
      return { person, cases }
    },
    enabled: !!selectedEntity && selectedEntity.type === 'person',
  })

  // Load case data
  const { data: caseFullData } = useQuery({
    queryKey: ['case-full-graph', selectedEntity?.id],
    queryFn: async () => {
      if (!selectedEntity || selectedEntity.type !== 'case') return null
      const [caseInfo, samples, persons] = await Promise.all([
        casesApi.getById(selectedEntity.id),
        casesApi.getSamples(selectedEntity.id),
        casesApi.getPersons(selectedEntity.id)
      ])
      
      // Get linked cases for each person
      const linkedCasesMap: Record<string, any[]> = {}
      for (const person of persons || []) {
        if (person.person_id) {
          try {
            const cases = await personsApi.getCases(person.person_id)
            linkedCasesMap[person.person_id] = cases.filter((c: any) => c.case_id !== selectedEntity.id)
          } catch {
            linkedCasesMap[person.person_id] = []
          }
        }
      }
      
      return { caseInfo, samples, persons, linkedCasesMap }
    },
    enabled: !!selectedEntity && selectedEntity.type === 'case',
  })

  // Build graph data
  useEffect(() => {
    if (selectedEntity?.type === 'person' && personData) {
      const nodes: GraphNode[] = []
      const edges: GraphEdge[] = []

      // Person node (center)
      nodes.push({
        id: personData.person.person_id,
        type: 'person',
        label: personData.person.full_name,
        data: personData.person,
        color: '#ef233c',
        size: 20
      })

      // Case nodes
      personData.cases?.forEach((c: any) => {
        nodes.push({
          id: c.case_id,
          type: 'case',
          label: c.case_number,
          data: c,
          color: '#00d4ff',
          size: 15
        })
        edges.push({
          source: personData.person.person_id,
          target: c.case_id,
          type: 'involved_in',
          label: c.role || 'Related',
          color: '#4895ef'
        })
      })

      setGraphData({ nodes, edges })
    } else if (selectedEntity?.type === 'case' && caseFullData) {
      const nodes: GraphNode[] = []
      const edges: GraphEdge[] = []

      // Main case node (center)
      nodes.push({
        id: caseFullData.caseInfo.case_id,
        type: 'case',
        label: caseFullData.caseInfo.case_number,
        data: caseFullData.caseInfo,
        color: '#00d4ff',
        size: 25
      })

      // Sample nodes
      caseFullData.samples?.forEach((s: any) => {
        nodes.push({
          id: s.sample_id,
          type: 'sample',
          label: s.lab_number,
          data: s,
          color: '#4895ef',
          size: 12
        })
        edges.push({
          source: caseFullData.caseInfo.case_id,
          target: s.sample_id,
          type: 'has_sample',
          color: '#00d4ff'
        })
      })

      // Person nodes
      caseFullData.persons?.forEach((p: any) => {
        nodes.push({
          id: p.person_id,
          type: 'person',
          label: p.full_name,
          data: p,
          color: p.role === 'Suspect' ? '#ef233c' : p.role === 'Arrested' ? '#f77f00' : '#2ec4b6',
          size: 18
        })
        
        // Connect to sample
        if (caseFullData.samples?.length > 0) {
          edges.push({
            source: caseFullData.samples[0].sample_id,
            target: p.person_id,
            type: 'dna_match',
            label: 'DNA',
            color: '#ef233c'
          })
        }

        // Linked cases
        const linkedCases = caseFullData.linkedCasesMap[p.person_id] || []
        linkedCases.forEach((lc: any) => {
          if (!nodes.find(n => n.id === lc.case_id)) {
            nodes.push({
              id: lc.case_id,
              type: 'linked_case',
              label: lc.case_number,
              data: lc,
              color: '#a855f7',
              size: 14
            })
          }
          edges.push({
            source: p.person_id,
            target: lc.case_id,
            type: 'found_in',
            label: 'พบใน',
            color: '#a855f7'
          })
        })
      })

      setGraphData({ nodes, edges })
    }
  }, [selectedEntity, personData, caseFullData])

  // Initialize 3D Graph
  useEffect(() => {
    if (mode !== '3d' || !containerRef.current || graphData.nodes.length === 0) return

    const initGraph = async () => {
      const ForceGraph3D = (await import('3d-force-graph')).default
      const SpriteText = (await import('three-spritetext')).default

      // Clear previous
      if (graphRef.current) {
        graphRef.current._destructor?.()
        containerRef.current!.innerHTML = ''
      }

      const graph = ForceGraph3D()(containerRef.current!)
        .backgroundColor('#0d1b2a')
        .graphData({
          nodes: graphData.nodes.map(n => ({ ...n })),
          links: graphData.edges.map(e => ({
            source: e.source,
            target: e.target,
            type: e.type,
            color: e.color
          }))
        })
        .nodeLabel((node: any) => `${node.label}\n${node.data?.province || node.data?.id_number || ''}`)
        .nodeColor((node: any) => node.color || '#ffffff')
        .nodeVal((node: any) => node.size || 10)
        .nodeThreeObject((node: any) => {
          const sprite = new SpriteText(node.label)
          sprite.color = node.color || '#ffffff'
          sprite.textHeight = 4
          sprite.position.y = 12
          return sprite
        })
        .nodeThreeObjectExtend(true)
        .linkColor((link: any) => link.color || '#415a77')
        .linkWidth(2)
        .linkOpacity(0.6)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(2)
        .linkDirectionalParticleSpeed(0.005)
        .onNodeClick((node: any) => {
          setSelectedNode(node)
          // Focus on node
          const distance = 200
          const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z)
          graph.cameraPosition(
            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
            node,
            1000
          )
        })
        .onNodeDragEnd((node: any) => {
          node.fx = node.x
          node.fy = node.y
          node.fz = node.z
        })

      graphRef.current = graph

      // Camera position
      graph.cameraPosition({ x: 0, y: 0, z: 500 })
    }

    initGraph()

    return () => {
      if (graphRef.current) {
        graphRef.current._destructor?.()
      }
    }
  }, [mode, graphData])

  // Initialize 2D Cytoscape Graph
  useEffect(() => {
    if (mode !== '2d' || !containerRef.current || graphData.nodes.length === 0) return

    const initCytoscape = async () => {
      const cytoscape = (await import('cytoscape')).default
      const fcose = (await import('cytoscape-fcose')).default
      
      cytoscape.use(fcose)

      // Clear previous
      if (cyRef.current) {
        cyRef.current.destroy()
      }
      containerRef.current!.innerHTML = ''

      const cy = cytoscape({
        container: containerRef.current,
        elements: [
          ...graphData.nodes.map(n => ({
            data: {
              id: n.id,
              label: n.label,
              type: n.type,
              color: n.color,
              nodeData: n.data
            }
          })),
          ...graphData.edges.map((e, i) => ({
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
              'font-size': '10px',
              'text-margin-y': '5px',
              'width': 40,
              'height': 40,
              'border-width': 3,
              'border-color': 'data(color)'
            }
          },
          {
            selector: 'node[type="case"]',
            style: {
              'shape': 'round-rectangle',
              'width': 60,
              'height': 40
            }
          },
          {
            selector: 'node[type="person"]',
            style: {
              'shape': 'ellipse',
              'width': 50,
              'height': 50
            }
          },
          {
            selector: 'node[type="sample"]',
            style: {
              'shape': 'diamond',
              'width': 35,
              'height': 35
            }
          },
          {
            selector: 'node[type="linked_case"]',
            style: {
              'shape': 'round-rectangle',
              'width': 55,
              'height': 35,
              'border-style': 'dashed'
            }
          },
          {
            selector: 'node:selected',
            style: {
              'border-width': 5,
              'border-color': '#ffffff',
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
              'label': 'data(label)',
              'font-size': '8px',
              'color': '#778da9',
              'text-rotation': 'autorotate',
              'text-margin-y': -10
            }
          },
          {
            selector: 'edge[type="dna_match"]',
            style: {
              'width': 3,
              'line-style': 'solid'
            }
          },
          {
            selector: 'edge[type="found_in"]',
            style: {
              'line-style': 'dashed'
            }
          }
        ],
        layout: {
          name: 'fcose',
          animate: true,
          animationDuration: 1000,
          randomize: true,
          fit: true,
          padding: 50,
          nodeDimensionsIncludeLabels: true,
          idealEdgeLength: 150,
          nodeRepulsion: 8000,
          gravity: 0.25
        }
      })

      cy.on('tap', 'node', (evt: any) => {
        const node = evt.target
        setSelectedNode({
          id: node.id(),
          type: node.data('type'),
          label: node.data('label'),
          data: node.data('nodeData')
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
  }, [mode, graphData])

  // Controls
  const handleZoomIn = () => {
    if (mode === '3d' && graphRef.current) {
      const { x, y, z } = graphRef.current.cameraPosition()
      graphRef.current.cameraPosition({ x: x * 0.8, y: y * 0.8, z: z * 0.8 })
    } else if (mode === '2d' && cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2)
    }
  }

  const handleZoomOut = () => {
    if (mode === '3d' && graphRef.current) {
      const { x, y, z } = graphRef.current.cameraPosition()
      graphRef.current.cameraPosition({ x: x * 1.2, y: y * 1.2, z: z * 1.2 })
    } else if (mode === '2d' && cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8)
    }
  }

  const handleReset = () => {
    if (mode === '3d' && graphRef.current) {
      graphRef.current.cameraPosition({ x: 0, y: 0, z: 500 }, null, 1000)
    } else if (mode === '2d' && cyRef.current) {
      cyRef.current.fit()
    }
  }

  const handleTogglePhysics = () => {
    setIsPhysicsRunning(!isPhysicsRunning)
    if (mode === '3d' && graphRef.current) {
      if (isPhysicsRunning) {
        graphRef.current.pauseAnimation()
      } else {
        graphRef.current.resumeAnimation()
      }
    }
  }

  const selectEntity = (type: string, id: string) => {
    setSelectedEntity({ type, id })
    setSearchTerm('')
  }

  return (
    <div className="h-full flex bg-dark-300">
      {/* Left Panel */}
      <div className="w-80 bg-dark-200 border-r border-dark-100 flex flex-col">
        <div className="p-4 border-b border-dark-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            Advanced Graph
          </h2>
          <p className="text-xs text-dark-100 mt-1">Interactive Force-Directed Graph</p>
        </div>

        {/* Mode Toggle */}
        <div className="p-4 border-b border-dark-100">
          <div className="flex rounded-lg overflow-hidden">
            <button
              onClick={() => setMode('2d')}
              className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                mode === '2d' ? 'bg-primary-500 text-dark-300' : 'bg-dark-300 text-dark-100 hover:text-white'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              2D
            </button>
            <button
              onClick={() => setMode('3d')}
              className={`flex-1 py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
                mode === '3d' ? 'bg-primary-500 text-dark-300' : 'bg-dark-300 text-dark-100 hover:text-white'
              }`}
            >
              <Box className="w-4 h-4" />
              3D
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
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
              {/* Cases */}
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

              {/* Persons */}
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
          ) : selectedEntity ? (
            <div className="space-y-4">
              <div className="card bg-dark-300">
                <p className="text-xs text-dark-100">เลือกแล้ว</p>
                <p className="font-semibold text-primary-500">
                  {selectedEntity.type === 'case' ? caseFullData?.caseInfo?.case_number : personData?.person?.full_name}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="card bg-dark-300 p-3 text-center">
                  <p className="text-2xl font-bold text-primary-500">{graphData.nodes.length}</p>
                  <p className="text-xs text-dark-100">Nodes</p>
                </div>
                <div className="card bg-dark-300 p-3 text-center">
                  <p className="text-2xl font-bold text-purple-400">{graphData.edges.length}</p>
                  <p className="text-xs text-dark-100">Edges</p>
                </div>
              </div>

              {/* Legend */}
              <div className="card bg-dark-300 p-3">
                <p className="text-xs text-dark-100 mb-2">Legend</p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CaseIcon size={16} color="#00d4ff" />
                    <span>คดี</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SuspectIcon size={16} color="#ef233c" />
                    <span>Suspect</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrestedIcon size={16} color="#f77f00" />
                    <span>Arrested</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ReferenceIcon size={16} color="#2ec4b6" />
                    <span>Reference</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <SampleIcon size={16} color="#4895ef" />
                    <span>วัตถุพยาน</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CaseIcon size={16} color="#a855f7" />
                    <span>คดีเชื่อมโยง</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-dark-100">
              <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">ค้นหาคดีหรือบุคคล</p>
              <p className="text-xs mt-1">เพื่อแสดง Graph</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative">
        {/* Graph Container */}
        <div 
          ref={containerRef} 
          className="w-full h-full"
          style={{ background: mode === '3d' ? 'transparent' : '#0d1b2a' }}
        />

        {/* No Data Message */}
        {graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-dark-100">
              <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">เลือกคดีหรือบุคคลเพื่อแสดง Graph</p>
              <p className="text-sm mt-2">ค้นหาจากช่องด้านซ้าย</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="p-3 bg-dark-200/90 rounded-lg hover:bg-dark-100 transition-colors shadow-lg"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-3 bg-dark-200/90 rounded-lg hover:bg-dark-100 transition-colors shadow-lg"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={handleReset}
            className="p-3 bg-dark-200/90 rounded-lg hover:bg-dark-100 transition-colors shadow-lg"
            title="Reset View"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={handleTogglePhysics}
            className={`p-3 rounded-lg transition-colors shadow-lg ${
              isPhysicsRunning ? 'bg-primary-500/20 text-primary-500' : 'bg-dark-200/90'
            }`}
            title={isPhysicsRunning ? 'Pause Physics' : 'Resume Physics'}
          >
            {isPhysicsRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>

        {/* Mode Indicator */}
        <div className="absolute top-4 left-4 px-4 py-2 bg-dark-200/90 rounded-lg shadow-lg">
          <div className="flex items-center gap-2 text-sm">
            {mode === '3d' ? (
              <>
                <Box className="w-4 h-4 text-primary-500" />
                <span>3D Mode</span>
                <span className="text-dark-100 text-xs">• Drag to rotate • Scroll to zoom</span>
              </>
            ) : (
              <>
                <Grid3X3 className="w-4 h-4 text-primary-500" />
                <span>2D Mode</span>
                <span className="text-dark-100 text-xs">• Drag nodes • Scroll to zoom</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Selected Node Details */}
      {selectedNode && (
        <div className="w-80 bg-dark-200 border-l border-dark-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">รายละเอียด</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-dark-100 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className={`p-4 rounded-lg border ${
              selectedNode.type === 'case' ? 'bg-primary-500/10 border-primary-500/30' :
              selectedNode.type === 'person' ? 'bg-red-500/10 border-red-500/30' :
              selectedNode.type === 'sample' ? 'bg-blue-500/10 border-blue-500/30' :
              'bg-purple-500/10 border-purple-500/30'
            }`}>
              <div className="mb-2">
                {selectedNode.type === 'case' || selectedNode.type === 'linked_case' ? (
                  <CaseIcon size={28} color={selectedNode.type === 'case' ? '#00d4ff' : '#a855f7'} />
                ) : selectedNode.type === 'person' ? (
                  selectedNode.data?.role === 'Suspect' ? (
                    <SuspectIcon size={28} color="#ef233c" />
                  ) : selectedNode.data?.role === 'Arrested' ? (
                    <ArrestedIcon size={28} color="#f77f00" />
                  ) : (
                    <ReferenceIcon size={28} color="#2ec4b6" />
                  )
                ) : (
                  <SampleIcon size={28} color="#4895ef" />
                )}
              </div>
              <p className="font-semibold">{selectedNode.label}</p>
              <p className="text-xs text-dark-100 capitalize">{selectedNode.type}</p>
            </div>

            {selectedNode.data && (
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
                {selectedNode.data.role && (
                  <div>
                    <p className="text-xs text-dark-100">บทบาท</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      selectedNode.data.role === 'Suspect' ? 'bg-red-500/20 text-red-400' :
                      selectedNode.data.role === 'Arrested' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {selectedNode.data.role}
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

            {(selectedNode.type === 'case' || selectedNode.type === 'linked_case') && (
              <div className="flex gap-2">
                <button
                  onClick={() => selectEntity('case', selectedNode.id || selectedNode.data?.case_id)}
                  className="flex-1 btn-primary text-sm"
                >
                  ดู Graph
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
                  ดู Graph
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
