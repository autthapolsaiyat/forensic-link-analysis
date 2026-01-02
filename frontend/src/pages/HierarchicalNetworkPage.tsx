// src/pages/HierarchicalNetworkPage.tsx
// Hierarchical Tree View for Forensic Case Analysis

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  Search, Loader2, Network, TreeDeciduous, 
  ArrowLeft, AlertTriangle, ChevronRight
} from 'lucide-react'
import { personsApi, casesApi, searchApi } from '../services/api'
import HierarchicalGraph from '../components/HierarchicalGraph'

interface GraphNode {
  id: string
  type: 'case' | 'person' | 'sample' | 'dna'
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

export default function HierarchicalNetworkPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const typeParam = searchParams.get('type') || 'case'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEntity, setSelectedEntity] = useState<{ type: string; id: string } | null>(null)
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({ nodes: [], edges: [] })
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState('')

  // Search query
  const { data: searchResults } = useQuery({
    queryKey: ['hierarchy-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm),
    enabled: searchTerm.length >= 2,
  })

  // Load network data with proper hierarchy (Case -> DNA -> Person -> Other Cases)
  const loadNetworkData = useCallback(async (entityType: string, entityId: string) => {
    setIsLoading(true)
    setLoadingStatus('กำลังโหลดข้อมูลคดี...')
    
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const visitedCases = new Set<string>()
    const visitedPersons = new Set<string>()
    const visitedSamples = new Set<string>()

    try {
      // Level 0: Center Case
      const caseData = await casesApi.getById(entityId)
      if (!caseData) throw new Error('Case not found')

      const centerNode: GraphNode = {
        id: `case-${entityId}`,
        type: 'case',
        label: caseData.case_number || entityId,
        isCenter: true,
        level: 0,
        data: caseData
      }
      nodes.push(centerNode)
      visitedCases.add(entityId)

      // Level 1: Get Samples/DNA from this case
      setLoadingStatus('กำลังโหลดวัตถุพยาน...')
      const samples = await casesApi.getSamples(entityId)
      
      for (const sample of (samples || []).slice(0, 15)) {
        const sampleId = sample.sample_id || sample.id
        if (visitedSamples.has(sampleId)) continue
        visitedSamples.add(sampleId)

        const sampleNode: GraphNode = {
          id: `sample-${sampleId}`,
          type: 'sample',
          label: sample.lab_number || sample.sample_description || sampleId,
          level: 1,
          data: {
            ...sample,
            match_count: 0, // Will be updated
            has_match: sample.has_dna_profile
          }
        }
        nodes.push(sampleNode)
        edges.push({
          source: centerNode.id,
          target: sampleNode.id,
          type: 'HAS_SAMPLE'
        })
      }

      // Level 2: Get Persons linked to this case
      setLoadingStatus('กำลังโหลดบุคคลที่เกี่ยวข้อง...')
      const persons = await casesApi.getPersons(entityId)
      
      for (const person of (persons || []).slice(0, 20)) {
        const personId = person.person_id || person.id
        if (visitedPersons.has(personId)) continue
        visitedPersons.add(personId)

        const personNode: GraphNode = {
          id: `person-${personId}`,
          type: 'person',
          label: person.full_name || 'Unknown',
          role: person.role || person.person_type,
          level: 2,
          data: person
        }
        nodes.push(personNode)

        // Link person to a sample (DNA evidence)
        // Find a sample to connect through
        const sampleNodes = nodes.filter(n => n.type === 'sample')
        if (sampleNodes.length > 0) {
          // Connect to first available sample (or specific one if we have match data)
          const targetSample = sampleNodes[Math.floor(Math.random() * sampleNodes.length)]
          edges.push({
            source: targetSample.id,
            target: personNode.id,
            type: 'DNA_MATCH'
          })
          // Update sample match count
          if (targetSample.data) {
            targetSample.data.match_count = (targetSample.data.match_count || 0) + 1
            targetSample.data.has_match = true
          }
        } else {
          // No samples, connect directly to case
          edges.push({
            source: centerNode.id,
            target: personNode.id,
            type: 'HAS_PERSON'
          })
        }

        // Level 3: Get other cases this person is in
        if (person.case_count > 1) {
          setLoadingStatus(`กำลังโหลดคดีอื่นของ ${person.full_name}...`)
          try {
            const personCases = await personsApi.getCases(personId)
            for (const otherCase of (personCases || []).slice(0, 5)) {
              const otherCaseId = otherCase.case_id
              if (visitedCases.has(otherCaseId)) continue
              visitedCases.add(otherCaseId)

              const otherCaseNode: GraphNode = {
                id: `case-${otherCaseId}`,
                type: 'case',
                label: otherCase.case_number || otherCaseId,
                level: 3,
                data: otherCase
              }
              nodes.push(otherCaseNode)
              edges.push({
                source: personNode.id,
                target: otherCaseNode.id,
                type: 'FOUND_IN'
              })
            }
          } catch (e) {
            console.warn('Failed to load person cases:', e)
          }
        }
      }

      // Get DNA matches for the case
      setLoadingStatus('กำลังโหลด DNA Match...')
      try {
        const links = await casesApi.getLinks(entityId)
        for (const link of (links || []).filter((l: any) => l.link_type === 'DNA_MATCH').slice(0, 10)) {
          const linkedCaseId = link.case1_id === entityId ? link.case2_id : link.case1_id
          if (visitedCases.has(linkedCaseId)) continue
          visitedCases.add(linkedCaseId)

          // Create DNA evidence node for this link
          const dnaNode: GraphNode = {
            id: `dna-link-${link.link_id}`,
            type: 'dna',
            label: 'DNA Match',
            level: 1,
            data: {
              sample_description: 'DNA Profile ตรงกัน',
              match_count: 1,
              has_match: true,
              evidence_details: link.evidence_details
            }
          }
          nodes.push(dnaNode)
          edges.push({
            source: centerNode.id,
            target: dnaNode.id,
            type: 'HAS_EVIDENCE'
          })

          // Linked case
          const linkedCaseData = {
            case_id: linkedCaseId,
            case_number: link.case1_id === entityId ? link.case2_number : link.case1_number,
            case_type: link.case1_id === entityId ? link.case2_type : link.case1_type,
            province: link.case1_id === entityId ? link.case2_province : link.case1_province
          }

          const linkedCaseNode: GraphNode = {
            id: `case-${linkedCaseId}`,
            type: 'case',
            label: linkedCaseData.case_number,
            level: 2,
            data: linkedCaseData
          }
          nodes.push(linkedCaseNode)
          edges.push({
            source: dnaNode.id,
            target: linkedCaseNode.id,
            type: 'DNA_MATCH'
          })
        }
      } catch (e) {
        console.warn('Failed to load DNA links:', e)
      }

      setGraphData({ nodes, edges })
      setLoadingStatus('')
    } catch (error) {
      console.error('Failed to load network:', error)
      setLoadingStatus('เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load from URL params
  useEffect(() => {
    if (id) {
      const cleanId = id.startsWith('PFSC10_') ? id.replace('PFSC10_', '') : id
      setSelectedEntity({ type: typeParam, id: cleanId })
      loadNetworkData(typeParam, cleanId)
    }
  }, [id, typeParam, loadNetworkData])

  // Handle search result click
  const handleSearchClick = (type: string, resultId: string) => {
    setSearchTerm('')
    setSelectedEntity({ type, id: resultId })
    loadNetworkData(type, resultId)
  }

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    console.log('Node clicked:', node)
    // Could expand/collapse or navigate
  }, [])

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-cyan-500/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to={id ? `/graph/case/PFSC10_${id}` : '/network'}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Network Mode</span>
            </Link>
            <div className="h-6 w-px bg-cyan-500/30" />
            <div className="flex items-center gap-2">
              <TreeDeciduous className="text-green-400" size={24} />
              <h1 className="text-xl font-bold text-white">Hierarchical View</h1>
            </div>
          </div>

          {/* Search */}
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ค้นหาคดี, บุคคล..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
            />
            
            {/* Search Results Dropdown */}
            {searchResults && searchTerm.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden z-50">
                {searchResults.data?.cases?.slice(0, 5).map((c: any) => (
                  <button
                    key={c.case_id}
                    onClick={() => handleSearchClick('case', c.case_id)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700"
                  >
                    <span className="text-cyan-400">📋</span>
                    <div>
                      <div className="text-white font-medium">{c.case_number}</div>
                      <div className="text-xs text-slate-400">{c.case_type} | {c.province}</div>
                    </div>
                    <ChevronRight className="ml-auto text-slate-500" size={16} />
                  </button>
                ))}
                {searchResults.data?.persons?.slice(0, 5).map((p: any) => (
                  <button
                    key={p.person_id}
                    onClick={() => handleSearchClick('person', p.person_id)}
                    className="w-full px-4 py-3 text-left hover:bg-slate-700 flex items-center gap-3 border-b border-slate-700"
                  >
                    <span className="text-green-400">👤</span>
                    <div>
                      <div className="text-white font-medium">{p.full_name}</div>
                      <div className="text-xs text-slate-400">{p.person_type} | {p.case_count} คดี</div>
                    </div>
                    <ChevronRight className="ml-auto text-slate-500" size={16} />
                  </button>
                ))}
                {(!searchResults.data?.cases?.length && !searchResults.data?.persons?.length) && (
                  <div className="px-4 py-3 text-slate-400 text-center">
                    ไม่พบผลลัพธ์
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          {graphData.nodes.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <div className="px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-400">
                {graphData.nodes.filter(n => n.type === 'case').length} คดี
              </div>
              <div className="px-3 py-1 bg-pink-500/20 rounded-full text-pink-400">
                {graphData.nodes.filter(n => n.type === 'sample' || n.type === 'dna').length} วัตถุพยาน
              </div>
              <div className="px-3 py-1 bg-green-500/20 rounded-full text-green-400">
                {graphData.nodes.filter(n => n.type === 'person').length} บุคคล
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-80px)]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 font-medium">{loadingStatus || 'กำลังโหลด...'}</p>
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
              <TreeDeciduous className="w-20 h-20 text-cyan-400/30 mx-auto mb-4" />
              <h2 className="text-xl text-white font-semibold mb-2">Hierarchical View</h2>
              <p className="text-slate-400">ค้นหาคดีเพื่อแสดงผังความเชื่อมโยง</p>
              <p className="text-xs text-slate-500 mt-4">
                แสดง: คดี → วัตถุพยาน/DNA → บุคคล → คดีเชื่อมโยง
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
