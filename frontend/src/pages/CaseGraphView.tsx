// src/pages/CaseGraphView.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import {
  Search, ZoomIn, ZoomOut, RotateCcw, Package, User,
  FileText, ArrowRight
} from 'lucide-react'
import { casesApi, searchApi, personsApi } from '../services/api'

interface Sample {
  sample_id: string
  lab_number: string
  sample_type: string
  sample_source: string
  dna_profile?: string
  matches?: any[]
}

interface CaseData {
  case_id: string
  case_number: string
  case_type: string
  province: string
  case_date: string
  scene_address?: string
}

export default function CaseGraphView() {
  const { id } = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCase, setSelectedCase] = useState<string | null>(id || null)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [zoom, setZoom] = useState(1)

  // Search cases
  const { data: searchResults } = useQuery({
    queryKey: ['case-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm, 'cases'),
    enabled: searchTerm.length >= 2,
  })

  // Get case details
  const { data: caseData } = useQuery({
    queryKey: ['case-detail', selectedCase],
    queryFn: () => casesApi.getById(selectedCase!),
    enabled: !!selectedCase,
  })

  // Get samples for case
  const { data: samples } = useQuery({
    queryKey: ['case-samples', selectedCase],
    queryFn: () => casesApi.getSamples(selectedCase!),
    enabled: !!selectedCase,
  })

  // Get persons for case
  const { data: persons } = useQuery({
    queryKey: ['case-persons', selectedCase],
    queryFn: () => casesApi.getPersons(selectedCase!),
    enabled: !!selectedCase,
  })

  // Get linked cases for each person (extended graph)
  const { data: linkedCasesMap } = useQuery({
    queryKey: ['linked-cases', selectedCase, persons],
    queryFn: async () => {
      if (!persons || persons.length === 0) return {}
      const map: Record<string, any[]> = {}
      for (const person of persons) {
        if (person.person_id) {
          try {
            const cases = await personsApi.getCases(person.person_id)
            // Filter out current case
            map[person.person_id] = cases.filter((c: any) => c.case_id !== selectedCase)
          } catch {
            map[person.person_id] = []
          }
        }
      }
      return map
    },
    enabled: !!persons && persons.length > 0,
  })

  // Helper: Generate FIDS No
  const generateFidsNo = (caseNumber: string, sampleCount: number = 0): string => {
    if (!caseNumber) return '-'
    const parts = caseNumber.split('-')
    if (parts.length < 3) return caseNumber
    const center = parts[0]
    const yearPart = parts[1]
    const runningNum = parts[2]
    const year = yearPart.replace(/[^0-9]/g, '').substring(0, 2)
    const sampleStr = String(sampleCount).padStart(4, '0')
    const runningStr = runningNum.padStart(5, '0')
    return `${center}-DNA-${year}-${runningStr}-${sampleStr}`
  }

  // Calculate positions for extended graph
  const calculateLayout = () => {
    const sampleList = samples || []
    const personList = persons || []
    const linkedCases = linkedCasesMap || {}
    
    const centerX = 500
    const centerY = 350
    const sampleRadius = 120
    const personRadius = 220
    const linkedCaseRadius = 350

    const nodes: any[] = []
    const edges: any[] = []

    // Case node (center)
    const caseNode = {
      id: selectedCase,
      type: 'case',
      x: centerX,
      y: centerY,
      data: caseData,
      isCenter: true
    }
    nodes.push(caseNode)

    // Sample nodes (inner ring)
    sampleList.forEach((sample: Sample, i: number) => {
      const angle = (2 * Math.PI * i) / Math.max(sampleList.length, 1) - Math.PI / 2
      const node = {
        id: sample.sample_id,
        type: 'sample',
        x: centerX + sampleRadius * Math.cos(angle),
        y: centerY + sampleRadius * Math.sin(angle),
        data: sample
      }
      nodes.push(node)
      edges.push({
        source: caseNode,
        target: node,
        type: 'has_sample'
      })
    })

    // Person nodes (middle ring)
    personList.forEach((person: any, i: number) => {
      const angle = (2 * Math.PI * i) / Math.max(personList.length, 1) - Math.PI / 2
      const personNode = {
        id: person.person_id,
        type: 'person',
        x: centerX + personRadius * Math.cos(angle),
        y: centerY + personRadius * Math.sin(angle),
        data: person
      }
      nodes.push(personNode)

      // Connect samples to persons
      const sampleIndex = i % Math.max(sampleList.length, 1)
      if (sampleList[sampleIndex]) {
        edges.push({
          source: nodes.find(n => n.id === sampleList[sampleIndex].sample_id),
          target: personNode,
          type: 'dna_match'
        })
      }

      // Add linked cases for this person (outer ring)
      const personLinkedCases = linkedCases[person.person_id] || []
      personLinkedCases.forEach((linkedCase: any, j: number) => {
        // Calculate position around the person
        const linkedAngle = angle + ((j - (personLinkedCases.length - 1) / 2) * 0.3)
        const linkedCaseNode = {
          id: `linked_${linkedCase.case_id}`,
          type: 'linked_case',
          x: centerX + linkedCaseRadius * Math.cos(linkedAngle),
          y: centerY + linkedCaseRadius * Math.sin(linkedAngle),
          data: linkedCase
        }
        
        // Check if node already exists
        if (!nodes.find(n => n.id === linkedCaseNode.id)) {
          nodes.push(linkedCaseNode)
        }
        
        edges.push({
          source: personNode,
          target: nodes.find(n => n.id === linkedCaseNode.id) || linkedCaseNode,
          type: 'person_in_case'
        })
      })
    })

    // Calculate stats
    const totalLinkedCases = Object.values(linkedCases).flat().length
    
    return {
      nodes,
      edges,
      stats: {
        samples: sampleList.length,
        persons: personList.length,
        linkedCases: totalLinkedCases,
        dnaMatches: edges.filter((e: any) => e.type === 'dna_match').length
      }
    }
  }

  const graph = selectedCase ? calculateLayout() : { nodes: [], edges: [], stats: { samples: 0, persons: 0, linkedCases: 0, dnaMatches: 0 } }

  return (
    <div className="h-full flex">
      {/* Left Panel - Case Search */}
      <div className="w-80 bg-dark-200 border-r border-dark-100 flex flex-col">
        <div className="p-4 border-b border-dark-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Case-Centric Graph
          </h2>
          <p className="text-xs text-dark-100 mt-1">เหตุ → วัตถุพยาน → DNA Match</p>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-100" />
            <input
              type="text"
              placeholder="ค้นหาเลขคดี..."
              className="input w-full pl-10 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Search Results or Selected Case Info */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {searchTerm.length >= 2 && searchResults?.data?.cases?.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-dark-100 mb-2">ผลการค้นหา:</p>
              {searchResults.data.cases.slice(0, 20).map((c: CaseData) => (
                <button
                  key={c.case_id}
                  onClick={() => {
                    setSelectedCase(c.case_id)
                    setSearchTerm('')
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedCase === c.case_id
                      ? 'bg-primary-500/20 border border-primary-500/50'
                      : 'bg-dark-300 hover:bg-dark-100/50'
                  }`}
                >
                  <p className="font-mono text-sm">{c.case_number}</p>
                  <p className="text-xs text-dark-100 truncate">{c.case_type}</p>
                  <p className="text-xs text-dark-100">{c.province}</p>
                </button>
              ))}
            </div>
          ) : selectedCase && caseData ? (
            <div className="space-y-4">
              {/* Selected Case Info */}
              <div className="card bg-dark-300">
                <p className="text-xs text-dark-100 mb-1">คดีที่เลือก</p>
                <p className="font-mono text-primary-500 font-semibold">
                  {generateFidsNo(caseData.case_number, samples?.length || 0)}
                </p>
                <p className="text-sm mt-2">{caseData.case_type}</p>
                <p className="text-xs text-dark-100">{caseData.province}</p>
                <p className="text-xs text-dark-100 mt-2">
                  {caseData.case_date ? new Date(caseData.case_date).toLocaleDateString('th-TH') : '-'}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="card bg-dark-300 p-3 text-center">
                  <Package className="w-5 h-5 mx-auto text-blue-400 mb-1" />
                  <p className="text-xl font-bold">{samples?.length || 0}</p>
                  <p className="text-xs text-dark-100">วัตถุพยาน</p>
                </div>
                <div className="card bg-dark-300 p-3 text-center">
                  <User className="w-5 h-5 mx-auto text-green-400 mb-1" />
                  <p className="text-xl font-bold">{persons?.length || 0}</p>
                  <p className="text-xs text-dark-100">บุคคล</p>
                </div>
              </div>

              {/* Sample List */}
              {samples && samples.length > 0 && (
                <div>
                  <p className="text-xs text-dark-100 mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    วัตถุพยาน ({samples.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {samples.map((s: Sample) => (
                      <button
                        key={s.sample_id}
                        onClick={() => setSelectedNode({ type: 'sample', data: s })}
                        className="w-full text-left p-2 bg-dark-300 rounded text-xs hover:bg-dark-100/50"
                      >
                        <p className="font-mono">{s.lab_number}</p>
                        <p className="text-dark-100 truncate">{s.sample_type}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Person List */}
              {persons && persons.length > 0 && (
                <div>
                  <p className="text-xs text-dark-100 mb-2 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    บุคคลที่เกี่ยวข้อง ({persons.length})
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {persons.map((p: any) => (
                      <button
                        key={p.person_id}
                        onClick={() => setSelectedNode({ type: 'person', data: p })}
                        className="w-full text-left p-2 bg-dark-300 rounded text-xs hover:bg-dark-100/50"
                      >
                        <p className="font-medium">{p.full_name}</p>
                        <p className="text-dark-100 font-mono">{p.id_number}</p>
                        <span className={`text-xs px-1 rounded ${
                          p.role === 'Suspect' ? 'bg-red-500/20 text-red-400' :
                          p.role === 'Arrested' ? 'bg-orange-500/20 text-orange-400' :
                          'bg-primary-500/20 text-primary-500'
                        }`}>
                          {p.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-dark-100 py-4 text-sm">
              พิมพ์เลขคดีเพื่อค้นหา
            </p>
          )}
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative bg-dark-300 overflow-hidden">
        {selectedCase ? (
          <>
            {/* SVG Graph */}
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 1000 700"
              style={{ transform: `scale(${zoom})` }}
              className="transition-transform"
            >
              <defs>
                {/* Glow filters */}
                <filter id="glow-case" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glow-sample" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glow-person" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glow-linked" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Edges */}
              {graph.edges.map((edge: any, i: number) => (
                <g key={i}>
                  <line
                    x1={edge.source?.x || 0}
                    y1={edge.source?.y || 0}
                    x2={edge.target?.x || 0}
                    y2={edge.target?.y || 0}
                    stroke={
                      edge.type === 'dna_match' ? '#ef233c' : 
                      edge.type === 'has_sample' ? '#00d4ff' : 
                      edge.type === 'person_in_case' ? '#a855f7' :
                      '#415a77'
                    }
                    strokeWidth={edge.type === 'dna_match' ? 3 : edge.type === 'person_in_case' ? 2 : 2}
                    strokeDasharray={edge.type === 'person_in_case' ? '8,4' : 'none'}
                    opacity={0.7}
                  />
                  {/* Edge label */}
                  {edge.type === 'dna_match' && (
                    <text
                      x={(edge.source?.x + edge.target?.x) / 2}
                      y={(edge.source?.y + edge.target?.y) / 2 - 5}
                      fill="#ef233c"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      DNA ตรง
                    </text>
                  )}
                  {edge.type === 'person_in_case' && (
                    <text
                      x={(edge.source?.x + edge.target?.x) / 2}
                      y={(edge.source?.y + edge.target?.y) / 2 - 5}
                      fill="#a855f7"
                      fontSize="9"
                      textAnchor="middle"
                    >
                      พบใน
                    </text>
                  )}
                </g>
              ))}

              {/* Nodes */}
              {graph.nodes.map((node: any) => (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNode({ type: node.type, data: node.data })}
                  style={{ cursor: 'pointer' }}
                >
                  {node.type === 'case' && (
                    <>
                      {/* Main Case node - Rectangle with glow */}
                      <rect
                        x="-70"
                        y="-40"
                        width="140"
                        height="80"
                        rx="8"
                        fill="#0d1b2a"
                        stroke="#00d4ff"
                        strokeWidth="3"
                        filter="url(#glow-case)"
                      />
                      <text y="-15" textAnchor="middle" fill="#00d4ff" fontSize="11" fontWeight="bold">
                        {node.data?.case_number || 'คดี'}
                      </text>
                      <text y="3" textAnchor="middle" fill="#e0e1dd" fontSize="10">
                        {node.data?.case_type?.substring(0, 18) || ''}
                      </text>
                      <text y="20" textAnchor="middle" fill="#778da9" fontSize="9">
                        {node.data?.province || ''}
                      </text>
                    </>
                  )}

                  {node.type === 'sample' && (
                    <>
                      {/* Sample node */}
                      <rect
                        x="-50"
                        y="-25"
                        width="100"
                        height="50"
                        rx="6"
                        fill="#1b263b"
                        stroke="#4895ef"
                        strokeWidth="2"
                        filter="url(#glow-sample)"
                      />
                      <text y="-5" textAnchor="middle" fill="#4895ef" fontSize="9" fontWeight="bold">
                        {node.data?.lab_number?.substring(0, 14) || 'วัตถุพยาน'}
                      </text>
                      <text y="10" textAnchor="middle" fill="#778da9" fontSize="8">
                        {node.data?.sample_type?.substring(0, 14) || ''}
                      </text>
                    </>
                  )}

                  {node.type === 'person' && (
                    <>
                      {/* Person node - Circle */}
                      <circle
                        r="40"
                        fill="#1b263b"
                        stroke={
                          node.data?.role === 'Suspect' ? '#ef233c' :
                          node.data?.role === 'Arrested' ? '#f77f00' :
                          '#2ec4b6'
                        }
                        strokeWidth="3"
                        filter="url(#glow-person)"
                      />
                      <text y="-10" textAnchor="middle" fill="#e0e1dd" fontSize="9" fontWeight="bold">
                        {node.data?.full_name?.substring(0, 12) || 'บุคคล'}
                      </text>
                      <text y="5" textAnchor="middle" fill="#778da9" fontSize="7">
                        {node.data?.id_number?.substring(0, 13) || ''}
                      </text>
                      <text y="20" textAnchor="middle" fontSize="8"
                        fill={
                          node.data?.role === 'Suspect' ? '#ef233c' :
                          node.data?.role === 'Arrested' ? '#f77f00' :
                          '#2ec4b6'
                        }
                      >
                        {node.data?.role || ''}
                      </text>
                    </>
                  )}

                  {node.type === 'linked_case' && (
                    <>
                      {/* Linked Case node - Smaller rectangle */}
                      <rect
                        x="-55"
                        y="-30"
                        width="110"
                        height="60"
                        rx="6"
                        fill="#1b263b"
                        stroke="#a855f7"
                        strokeWidth="2"
                        filter="url(#glow-linked)"
                      />
                      <text y="-10" textAnchor="middle" fill="#a855f7" fontSize="9" fontWeight="bold">
                        {node.data?.case_number || 'คดีเชื่อมโยง'}
                      </text>
                      <text y="5" textAnchor="middle" fill="#e0e1dd" fontSize="8">
                        {node.data?.case_type?.substring(0, 15) || ''}
                      </text>
                      <text y="18" textAnchor="middle" fill="#778da9" fontSize="8">
                        {node.data?.province || ''}
                      </text>
                    </>
                  )}
                </g>
              ))}

              {/* Legend */}
              <g transform="translate(20, 580)">
                <rect x="0" y="0" width="300" height="100" rx="8" fill="#0d1b2a" opacity="0.95" />
                <text x="10" y="20" fill="#e0e1dd" fontSize="11" fontWeight="bold">Legend:</text>
                
                <rect x="10" y="32" width="24" height="14" rx="3" fill="#0d1b2a" stroke="#00d4ff" strokeWidth="2" />
                <text x="40" y="43" fill="#778da9" fontSize="9">คดีหลัก (Main Case)</text>
                
                <rect x="150" y="32" width="24" height="14" rx="3" fill="#1b263b" stroke="#4895ef" strokeWidth="2" />
                <text x="180" y="43" fill="#778da9" fontSize="9">วัตถุพยาน</text>
                
                <circle cx="22" cy="62" r="10" fill="#1b263b" stroke="#ef233c" strokeWidth="2" />
                <text x="40" y="65" fill="#778da9" fontSize="9">บุคคล (Suspect)</text>
                
                <rect x="150" y="52" width="24" height="14" rx="3" fill="#1b263b" stroke="#a855f7" strokeWidth="2" />
                <text x="180" y="63" fill="#778da9" fontSize="9">คดีเชื่อมโยง</text>
                
                <line x1="10" y1="82" x2="30" y2="82" stroke="#ef233c" strokeWidth="2" />
                <text x="35" y="85" fill="#778da9" fontSize="9">DNA ตรง</text>
                
                <line x1="110" y1="82" x2="130" y2="82" stroke="#a855f7" strokeWidth="2" strokeDasharray="5,3" />
                <text x="135" y="85" fill="#778da9" fontSize="9">พบในคดี</text>
              </g>
            </svg>

            {/* Zoom Controls */}
            <div className="absolute bottom-4 left-4 flex flex-col gap-2">
              <button
                onClick={() => setZoom(z => Math.min(z + 0.2, 2))}
                className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
                className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Panel */}
            <div className="absolute top-4 right-4 card bg-dark-200/90 p-4">
              <h4 className="font-semibold mb-2">สถิติ</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-dark-100">วัตถุพยาน:</span>
                  <span className="font-bold text-blue-400">{graph.stats.samples}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-dark-100">บุคคล:</span>
                  <span className="font-bold text-green-400">{graph.stats.persons}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-dark-100">DNA Match:</span>
                  <span className="font-bold text-red-400">{graph.stats.dnaMatches}</span>
                </div>
                <div className="flex justify-between gap-4 pt-2 border-t border-dark-100">
                  <span className="text-dark-100">คดีเชื่อมโยง:</span>
                  <span className="font-bold text-purple-400">{graph.stats.linkedCases}</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-dark-100">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">เลือกคดีเพื่อดู Graph</p>
              <p className="text-sm mt-2">ค้นหาจากช่องด้านซ้าย</p>
            </div>
          </div>
        )}
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

          {selectedNode.type === 'sample' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                <Package className="w-6 h-6 text-blue-400 mb-2" />
                <p className="text-xs text-dark-100">Lab Number</p>
                <p className="font-mono font-semibold">{selectedNode.data.lab_number}</p>
              </div>
              <div>
                <p className="text-xs text-dark-100">ประเภท</p>
                <p className="font-medium">{selectedNode.data.sample_type || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-100">แหล่งที่มา</p>
                <p className="font-medium">{selectedNode.data.sample_source || '-'}</p>
              </div>
              {selectedNode.data.dna_profile && (
                <div>
                  <p className="text-xs text-dark-100">DNA Profile</p>
                  <p className="font-mono text-xs bg-dark-300 p-2 rounded overflow-x-auto">
                    {selectedNode.data.dna_profile}
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'person' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${
                selectedNode.data.role === 'Suspect' ? 'bg-red-500/10 border-red-500/30' :
                selectedNode.data.role === 'Arrested' ? 'bg-orange-500/10 border-orange-500/30' :
                'bg-green-500/10 border-green-500/30'
              }`}>
                <User className={`w-6 h-6 mb-2 ${
                  selectedNode.data.role === 'Suspect' ? 'text-red-400' :
                  selectedNode.data.role === 'Arrested' ? 'text-orange-400' :
                  'text-green-400'
                }`} />
                <p className="font-semibold">{selectedNode.data.full_name}</p>
                <p className="font-mono text-sm text-dark-100">{selectedNode.data.id_number}</p>
              </div>
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
              {selectedNode.data.total_cases > 1 && (
                <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <p className="text-xs text-dark-100">พบในหลายคดี</p>
                  <p className="text-xl font-bold text-purple-400">{selectedNode.data.total_cases} คดี</p>
                  <Link
                    to={`/graph/person/${selectedNode.data.person_id}`}
                    className="text-xs text-primary-500 hover:underline flex items-center gap-1 mt-2"
                  >
                    ดู Person Graph <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          )}

          {selectedNode.type === 'linked_case' && (
            <div className="space-y-3">
              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                <FileText className="w-6 h-6 text-purple-400 mb-2" />
                <p className="text-xs text-dark-100">คดีเชื่อมโยง</p>
                <p className="font-mono font-semibold text-purple-400">{selectedNode.data.case_number}</p>
              </div>
              <div>
                <p className="text-xs text-dark-100">ประเภทคดี</p>
                <p className="font-medium">{selectedNode.data.case_type || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-100">จังหวัด</p>
                <p className="font-medium">{selectedNode.data.province || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-dark-100">วันที่</p>
                <p className="font-medium">
                  {selectedNode.data.case_date 
                    ? new Date(selectedNode.data.case_date).toLocaleDateString('th-TH') 
                    : '-'}
                </p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setSelectedCase(selectedNode.data.case_id)
                    setSelectedNode(null)
                  }}
                  className="flex-1 btn-primary text-sm"
                >
                  ดู Graph คดีนี้
                </button>
                <Link
                  to={`/cases/${selectedNode.data.case_id}`}
                  className="flex-1 btn-secondary text-sm text-center"
                >
                  รายละเอียด
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
