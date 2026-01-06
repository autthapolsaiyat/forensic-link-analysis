// src/pages/HierarchicalNetworkPage.tsx
// Hierarchical Tree View - DNA flows from Cases with Info Panel

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Search, Loader2, TreeDeciduous, 
  ChevronRight, FileText, User, Dna, AlertCircle,
  X, MapPin, Calendar, Building, Users, Link2
} from 'lucide-react'
import { personsApi, casesApi, searchApi } from '../services/api'
import HierarchicalGraph from '../components/HierarchicalGraph'

interface GraphNode {
  id: string
  type: 'case' | 'person' | 'sample' | 'dna' | 'dna-group'
  label: string
  role?: string
  level?: number
  isCenter?: boolean
  data?: any
  sourceCase?: string // DNA มาจากคดีไหน
  targetCase?: string // DNA เชื่อมไปคดีไหน
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
}

interface SelectedNodeInfo {
  node: GraphNode
  connectedNodes: GraphNode[]
}

const MAX_DEPTH = 5
const MAX_CASES_PER_PERSON = 10
const MAX_PERSONS_PER_CASE = 8

// Format Thai date
const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const thaiYear = date.getFullYear() + 543
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${date.getDate()} ${months[date.getMonth()]} ${thaiYear % 100}`
  } catch {
    return dateStr
  }
}

export default function HierarchicalNetworkPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  
  const pathType = window.location.pathname.includes('/hierarchy/person/') ? 'person' : 'case'
  const typeParam = searchParams.get('type') || pathType
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')
  const [stats, setStats] = useState({ depth: 0, persons: 0, cases: 0, dnaLinks: 0 })
  
  // Info Panel state
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<SelectedNodeInfo | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  const { data: searchResults } = useQuery({
    queryKey: ['hierarchy-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm),
    enabled: searchTerm.length >= 2,
  })

  // Find connected nodes for info panel
  const findConnectedNodes = useCallback((nodeId: string, nodes: GraphNode[], edges: GraphEdge[]) => {
    const connected: GraphNode[] = []
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    
    edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target
      
      if (sourceId === nodeId) {
        const targetNode = nodeMap.get(targetId)
        if (targetNode) connected.push(targetNode)
      }
      if (targetId === nodeId) {
        const sourceNode = nodeMap.get(sourceId)
        if (sourceNode) connected.push(sourceNode)
      }
    })
    
    return connected
  }, [])

  // Handle node click - show info panel
  const handleNodeClick = useCallback((node: GraphNode) => {
    const connected = findConnectedNodes(node.id, graphData.nodes, graphData.edges)
    setSelectedNodeInfo({ node, connectedNodes: connected })
    setShowPanel(true)
  }, [graphData, findConnectedNodes])

  // =====================================================
  // NEW STRUCTURE: Person → Cases → DNA → Linked Cases
  // =====================================================
  const loadPersonNetworkNew = useCallback(async (personId: string) => {
    setIsLoading(true)
    setLoadingStatus('กำลังโหลดข้อมูลบุคคล...')
    
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const visitedPersons = new Set<string>()
    const visitedCases = new Set<string>()
    let totalDnaLinks = 0
    let maxDepth = 0

    // Queue: [personId, depth, fromCaseId]
    const queue: Array<{ personId: string; depth: number; fromCaseId?: string }> = []

    try {
      // Center Person
      const personData = await personsApi.getById(personId)
      if (!personData) throw new Error('Person not found')

      const centerNode: GraphNode = {
        id: `person-${personId}`,
        type: 'person',
        label: personData.full_name || 'Unknown',
        role: personData.person_type,
        isCenter: true,
        level: 0,
        data: personData
      }
      nodes.push(centerNode)
      visitedPersons.add(personId)
      queue.push({ personId, depth: 0 })

      while (queue.length > 0) {
        const { personId: currentPersonId, depth } = queue.shift()!
        
        if (depth > MAX_DEPTH) continue
        maxDepth = Math.max(maxDepth, depth)

        setLoadingStatus(`ระดับ ${depth + 1}: ค้นหาคดีของบุคคล...`)

        // Get cases for this person
        let personCases: any[] = []
        try {
          personCases = await personsApi.getCases(currentPersonId)
        } catch (e) {
          continue
        }

        for (const caseItem of (personCases || []).slice(0, MAX_CASES_PER_PERSON)) {
          const caseId = caseItem.case_id
          if (visitedCases.has(caseId)) continue
          visitedCases.add(caseId)

          // Create case node
          const caseNode: GraphNode = {
            id: `case-${caseId}`,
            type: 'case',
            label: caseItem.case_number || caseId,
            level: depth * 3 + 1,
            data: caseItem
          }
          nodes.push(caseNode)
          
          // Connect person to case
          edges.push({
            source: `person-${currentPersonId}`,
            target: caseNode.id,
            type: 'FOUND_IN',
            label: 'พบใน'
          })

          // Get DNA links from this case
          setLoadingStatus(`ค้นหา DNA Match จาก ${caseItem.case_number}...`)
          try {
            const links = await casesApi.getLinks(caseId)
            const dnaLinks = (links || []).filter((l: any) => l.link_type === 'DNA_MATCH')

            for (const link of dnaLinks.slice(0, 5)) {
              const linkedCaseId = link.case1_id === caseId ? link.case2_id : link.case1_id
              if (visitedCases.has(linkedCaseId)) continue
              visitedCases.add(linkedCaseId)

              totalDnaLinks++

              // Create DNA node (between source case and target case)
              const dnaNode: GraphNode = {
                id: `dna-${link.link_id}`,
                type: 'dna',
                label: 'DNA Match',
                level: depth * 3 + 2,
                sourceCase: caseItem.case_number,
                targetCase: link.case1_id === caseId ? link.case2_number : link.case1_number,
                data: {
                  has_match: true,
                  match_count: 1,
                  source_case: caseItem.case_number,
                  target_case: link.case1_id === caseId ? link.case2_number : link.case1_number,
                  sample_description: `DNA จาก ${caseItem.case_number}`
                }
              }
              nodes.push(dnaNode)
              
              edges.push({
                source: caseNode.id,
                target: dnaNode.id,
                type: 'HAS_DNA',
                label: 'DNA'
              })

              // Create linked case node
              const linkedCaseData = {
                case_id: linkedCaseId,
                case_number: link.case1_id === caseId ? link.case2_number : link.case1_number,
                case_type: link.case1_id === caseId ? link.case2_type : link.case1_type,
                province: link.case1_id === caseId ? link.case2_province : link.case1_province
              }

              const linkedCaseNode: GraphNode = {
                id: `case-${linkedCaseId}`,
                type: 'case',
                label: linkedCaseData.case_number,
                level: depth * 3 + 3,
                data: linkedCaseData
              }
              nodes.push(linkedCaseNode)
              
              edges.push({
                source: dnaNode.id,
                target: linkedCaseNode.id,
                type: 'DNA_MATCH',
                label: 'ตรงกัน'
              })

              // Find persons in linked case (for next level)
              if (depth < MAX_DEPTH - 1) {
                try {
                  const linkedPersons = await casesApi.getPersons(linkedCaseId)
                  
                  for (const otherPerson of (linkedPersons || []).slice(0, MAX_PERSONS_PER_CASE)) {
                    const otherPersonId = otherPerson.person_id || otherPerson.id
                    if (visitedPersons.has(otherPersonId)) continue
                    visitedPersons.add(otherPersonId)

                    const otherPersonNode: GraphNode = {
                      id: `person-${otherPersonId}`,
                      type: 'person',
                      label: otherPerson.full_name || 'Unknown',
                      role: otherPerson.person_type,
                      level: depth * 3 + 4,
                      data: otherPerson
                    }
                    nodes.push(otherPersonNode)
                    
                    edges.push({
                      source: linkedCaseNode.id,
                      target: otherPersonNode.id,
                      type: 'HAS_PERSON',
                      label: 'บุคคล'
                    })

                    // If multi-case person, add to queue
                    if (otherPerson.case_count > 1) {
                      queue.push({
                        personId: otherPersonId,
                        depth: depth + 1,
                        fromCaseId: linkedCaseId
                      })
                    }
                  }
                } catch (e) {
                  console.warn('Failed to load linked case persons')
                }
              }
            }
          } catch (e) {
            console.warn('Failed to load case links')
          }

          // Also get other persons in same case
          if (depth < MAX_DEPTH) {
            try {
              const casePersons = await casesApi.getPersons(caseId)
              
              for (const otherPerson of (casePersons || []).slice(0, 3)) {
                const otherPersonId = otherPerson.person_id || otherPerson.id
                if (visitedPersons.has(otherPersonId)) continue
                if (otherPerson.case_count <= 1) continue // Only multi-case
                visitedPersons.add(otherPersonId)

                const otherPersonNode: GraphNode = {
                  id: `person-${otherPersonId}`,
                  type: 'person',
                  label: otherPerson.full_name || 'Unknown',
                  role: otherPerson.person_type,
                  level: depth * 3 + 2,
                  data: otherPerson
                }
                nodes.push(otherPersonNode)
                
                edges.push({
                  source: caseNode.id,
                  target: otherPersonNode.id,
                  type: 'HAS_PERSON',
                  label: 'บุคคลร่วม'
                })

                // Add to queue for exploration
                queue.push({
                  personId: otherPersonId,
                  depth: depth + 1
                })
              }
            } catch (e) {}
          }
        }
      }

      setStats({
        depth: maxDepth,
        persons: visitedPersons.size,
        cases: visitedCases.size,
        dnaLinks: totalDnaLinks
      })

      setGraphData({ nodes, edges })
      setLoadingStatus('')
    } catch (error) {
      console.error('Failed to load network:', error)
      setLoadingStatus('เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load from URL
  useEffect(() => {
    if (id) {
      const cleanId = id.startsWith('PFSC10_') ? id.replace('PFSC10_', '') : id
      setSelectedEntity({ type: typeParam, id: cleanId })
      loadPersonNetworkNew(cleanId)
    }
  }, [id, typeParam, loadPersonNetworkNew])

  const handleSearchClick = (type: string, resultId: string) => {
    setSearchTerm('')
    setSelectedEntity({ type, id: resultId })
    setShowPanel(false)
    loadPersonNetworkNew(resultId)
  }

  return (
    <div className="p-6 h-[calc(100vh-64px)] flex gap-4">
      {/* Main Graph Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <TreeDeciduous className="text-green-400 w-6 h-6" />
              <h1 className="text-xl font-bold text-white">Hierarchical View</h1>
            </div>
            {selectedEntity && (
              <div className="flex items-center gap-2 text-sm text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full">
                <User className="w-4 h-4" />
                <span>บุคคล: {selectedEntity.id}</span>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาบุคคล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-300 border border-dark-100 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            
            {searchResults && searchTerm.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-dark-200 border border-dark-100 rounded-lg shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                {searchResults.data?.persons?.slice(0, 8).map((p: any) => (
                  <button
                    key={p.person_id}
                    onClick={() => handleSearchClick('person', p.person_id)}
                    className="w-full px-4 py-2 text-left hover:bg-dark-300 flex items-center gap-3 border-b border-dark-100"
                  >
                    <User className="text-green-400 w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{p.full_name}</div>
                      <div className="text-xs text-slate-400">{p.case_count} คดี</div>
                    </div>
                    <ChevronRight className="text-slate-500 w-4 h-4" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          {graphData.nodes.length > 0 && (
            <div className="flex items-center gap-2 text-xs">
              <div className="px-2 py-1 bg-cyan-500/20 rounded text-cyan-400 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {stats.cases} คดี
              </div>
              <div className="px-2 py-1 bg-pink-500/20 rounded text-pink-400 flex items-center gap-1">
                <Dna className="w-3 h-3" />
                {stats.dnaLinks} DNA
              </div>
              <div className="px-2 py-1 bg-green-500/20 rounded text-green-400 flex items-center gap-1">
                <User className="w-3 h-3" />
                {stats.persons} คน
              </div>
              <div className="px-2 py-1 bg-purple-500/20 rounded text-purple-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {stats.depth} ระดับ
              </div>
            </div>
          )}
        </div>

        {/* Graph Container */}
        <div className="flex-1 bg-dark-300 rounded-xl border border-dark-100 overflow-hidden">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-cyan-400 font-medium">{loadingStatus}</p>
              </div>
            </div>
          ) : graphData.nodes.length > 0 ? (
            <HierarchicalGraph
              nodes={graphData.nodes}
              edges={graphData.edges}
              onNodeClick={handleNodeClick}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <TreeDeciduous className="w-16 h-16 text-cyan-400/30 mx-auto mb-4" />
                <h2 className="text-lg text-white font-semibold mb-2">Hierarchical View</h2>
                <p className="text-slate-400 text-sm">ค้นหาบุคคลเพื่อแสดงความเชื่อมโยง</p>
                <div className="mt-4 text-xs text-slate-500">
                  <p>บุคคล → คดี → DNA → คดีเชื่อมโยง → บุคคลอื่น</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Panel (Right Side) */}
      {showPanel && selectedNodeInfo && (
        <div className="w-80 bg-dark-200 rounded-xl border border-dark-100 flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="p-4 border-b border-dark-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedNodeInfo.node.type === 'case' && <FileText className="w-5 h-5 text-cyan-400" />}
              {selectedNodeInfo.node.type === 'person' && <User className="w-5 h-5 text-green-400" />}
              {(selectedNodeInfo.node.type === 'dna' || selectedNodeInfo.node.type === 'dna-group') && <Dna className="w-5 h-5 text-pink-400" />}
              <span className="font-semibold text-white">รายละเอียด</span>
            </div>
            <button 
              onClick={() => setShowPanel(false)}
              className="p-1 hover:bg-dark-300 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Node Info */}
            {selectedNodeInfo.node.type === 'case' && (
              <>
                <div>
                  <p className="text-xs text-slate-400 mb-1">เลขคดี</p>
                  <p className="text-white font-semibold">{selectedNodeInfo.node.data?.case_number || selectedNodeInfo.node.label}</p>
                </div>
                {selectedNodeInfo.node.data?.case_type && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">ประเภทคดี</p>
                    <p className="text-cyan-400">{selectedNodeInfo.node.data.case_type}</p>
                  </div>
                )}
                {selectedNodeInfo.node.data?.case_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm">{formatThaiDate(selectedNodeInfo.node.data.case_date)}</span>
                  </div>
                )}
                {selectedNodeInfo.node.data?.province && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm">{selectedNodeInfo.node.data.province}</span>
                  </div>
                )}
                {selectedNodeInfo.node.data?.police_station && (
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm">{selectedNodeInfo.node.data.police_station}</span>
                  </div>
                )}
              </>
            )}

            {selectedNodeInfo.node.type === 'person' && (
              <>
                <div>
                  <p className="text-xs text-slate-400 mb-1">ชื่อ-นามสกุล</p>
                  <p className="text-white font-semibold">{selectedNodeInfo.node.data?.full_name || selectedNodeInfo.node.label}</p>
                </div>
                {selectedNodeInfo.node.data?.id_number && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">เลขประจำตัว</p>
                    <p className="text-white font-mono text-sm">{selectedNodeInfo.node.data.id_number}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 mb-1">ประเภท</p>
                  <span className={`text-sm px-2 py-1 rounded ${
                    selectedNodeInfo.node.role === 'Suspect' ? 'bg-red-500/20 text-red-400' :
                    selectedNodeInfo.node.role === 'Arrested' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {selectedNodeInfo.node.role === 'Suspect' ? 'ผู้ต้องสงสัย' :
                     selectedNodeInfo.node.role === 'Arrested' ? 'ผู้ถูกจับกุม' : 'อ้างอิง'}
                  </span>
                </div>
                {selectedNodeInfo.node.data?.case_count && (
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span className="text-white text-sm">พบใน {selectedNodeInfo.node.data.case_count} คดี</span>
                  </div>
                )}
              </>
            )}

            {(selectedNodeInfo.node.type === 'dna' || selectedNodeInfo.node.type === 'dna-group') && (
              <>
                <div>
                  <p className="text-xs text-slate-400 mb-1">DNA Evidence</p>
                  <p className="text-pink-400 font-semibold">{selectedNodeInfo.node.label}</p>
                </div>
                {selectedNodeInfo.node.sourceCase && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">จากคดี</p>
                    <p className="text-cyan-400">{selectedNodeInfo.node.sourceCase}</p>
                  </div>
                )}
                {selectedNodeInfo.node.targetCase && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">เชื่อมไปคดี</p>
                    <p className="text-purple-400">{selectedNodeInfo.node.targetCase}</p>
                  </div>
                )}
                {selectedNodeInfo.node.data?.sample_description && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">รายละเอียด</p>
                    <p className="text-white text-sm">{selectedNodeInfo.node.data.sample_description}</p>
                  </div>
                )}
              </>
            )}

            {/* Connected Nodes */}
            {selectedNodeInfo.connectedNodes.length > 0 && (
              <div className="pt-4 border-t border-dark-100">
                <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <Link2 className="w-3 h-3" />
                  เชื่อมโยงกับ ({selectedNodeInfo.connectedNodes.length})
                </p>
                <div className="space-y-2">
                  {selectedNodeInfo.connectedNodes.map((node, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleNodeClick(node)}
                      className="w-full text-left p-2 bg-dark-300 rounded-lg hover:bg-dark-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {node.type === 'case' && <FileText className="w-4 h-4 text-cyan-400" />}
                        {node.type === 'person' && <User className="w-4 h-4 text-green-400" />}
                        {(node.type === 'dna' || node.type === 'dna-group') && <Dna className="w-4 h-4 text-pink-400" />}
                        <span className="text-white text-sm truncate">{node.label}</span>
                      </div>
                      {node.type === 'case' && node.data?.case_type && (
                        <p className="text-xs text-slate-400 mt-1 pl-6">{node.data.case_type}</p>
                      )}
                      {node.type === 'person' && node.role && (
                        <p className="text-xs text-slate-400 mt-1 pl-6">{node.role}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-3 border-t border-dark-100 text-center">
            <p className="text-xs text-slate-500">คลิกที่ node อื่นเพื่อดูรายละเอียด</p>
          </div>
        </div>
      )}
    </div>
  )
}
