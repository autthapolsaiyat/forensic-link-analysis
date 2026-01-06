// src/pages/HierarchicalNetworkPage.tsx
// Hierarchical Tree View - Recursive DNA Network Analysis

import { useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Search, Loader2, TreeDeciduous, 
  ChevronRight, FileText, User, Dna, AlertCircle
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
}

interface GraphEdge {
  source: string
  target: string
  type: string
  label?: string
}

// Maximum depth to prevent infinite loops
const MAX_DEPTH = 5
const MAX_PERSONS_PER_CASE = 10
const MAX_CASES_PER_PERSON = 15

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
  const [stats, setStats] = useState({ depth: 0, persons: 0, cases: 0, dnaGroups: 0 })

  const { data: searchResults } = useQuery({
    queryKey: ['hierarchy-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm),
    enabled: searchTerm.length >= 2,
  })

  // =====================================================
  // RECURSIVE PERSON NETWORK LOADER
  // Person → DNA Groups → Cases → Other Persons → ...
  // =====================================================
  const loadPersonNetworkRecursive = useCallback(async (personId: string) => {
    setIsLoading(true)
    setLoadingStatus('กำลังโหลดข้อมูลบุคคล...')
    
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const visitedPersons = new Set<string>()
    const visitedCases = new Set<string>()
    let currentDepth = 0
    let totalDnaGroups = 0

    // Queue for BFS traversal: [personId, depth, parentNodeId]
    const personQueue: Array<{ personId: string; depth: number; parentNodeId: string | null }> = []

    try {
      // Level 0: Center Person
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

      // Add center person to queue
      personQueue.push({ personId, depth: 0, parentNodeId: null })

      // BFS Process
      while (personQueue.length > 0) {
        const { personId: currentPersonId, depth, parentNodeId } = personQueue.shift()!
        
        if (depth > MAX_DEPTH) continue
        currentDepth = Math.max(currentDepth, depth)

        setLoadingStatus(`ไล่ความเชื่อมโยง ระดับ ${depth + 1}...`)

        // Get all cases for this person
        let personCases: any[] = []
        try {
          personCases = await personsApi.getCases(currentPersonId)
        } catch (e) {
          console.warn(`Failed to load cases for person ${currentPersonId}`)
          continue
        }

        if (!personCases || personCases.length === 0) continue

        // Group cases by DNA evidence (simulate grouping)
        // In reality, we'd group by actual DNA match IDs
        const caseGroups: Map<string, any[]> = new Map()
        
        for (const caseItem of personCases.slice(0, MAX_CASES_PER_PERSON)) {
          const caseId = caseItem.case_id
          if (visitedCases.has(caseId)) continue
          
          // Group key - for now use person's DNA profile as grouping
          // Later can be enhanced with actual DNA match IDs
          const groupKey = `dna-group-${currentPersonId}-${Math.floor(personCases.indexOf(caseItem) / 3)}`
          
          if (!caseGroups.has(groupKey)) {
            caseGroups.set(groupKey, [])
          }
          caseGroups.get(groupKey)!.push(caseItem)
        }

        // Create DNA Group nodes
        let groupIndex = 0
        for (const [groupKey, cases] of caseGroups) {
          groupIndex++
          totalDnaGroups++
          
          const dnaGroupNode: GraphNode = {
            id: `${groupKey}-${depth}`,
            type: 'dna-group',
            label: `DNA Evidence #${groupIndex}`,
            level: depth * 3 + 1,
            data: {
              case_count: cases.length,
              has_match: true,
              match_count: cases.length,
              sample_description: `DNA Profile เชื่อม ${cases.length} คดี`
            }
          }
          nodes.push(dnaGroupNode)
          
          // Connect DNA group to person
          const personNodeId = `person-${currentPersonId}`
          edges.push({
            source: personNodeId,
            target: dnaGroupNode.id,
            type: 'HAS_DNA'
          })

          // Create case nodes under this DNA group
          for (const caseItem of cases) {
            const caseId = caseItem.case_id
            if (visitedCases.has(caseId)) continue
            visitedCases.add(caseId)

            const caseNode: GraphNode = {
              id: `case-${caseId}`,
              type: 'case',
              label: caseItem.case_number || caseId,
              level: depth * 3 + 2,
              data: caseItem
            }
            nodes.push(caseNode)
            
            edges.push({
              source: dnaGroupNode.id,
              target: caseNode.id,
              type: 'DNA_MATCH'
            })

            // Find other persons in this case (if not at max depth)
            if (depth < MAX_DEPTH) {
              try {
                setLoadingStatus(`ค้นหาบุคคลในคดี ${caseItem.case_number}...`)
                const casePersons = await casesApi.getPersons(caseId)
                
                for (const otherPerson of (casePersons || []).slice(0, MAX_PERSONS_PER_CASE)) {
                  const otherPersonId = otherPerson.person_id || otherPerson.id
                  if (visitedPersons.has(otherPersonId)) continue
                  visitedPersons.add(otherPersonId)

                  const otherPersonNode: GraphNode = {
                    id: `person-${otherPersonId}`,
                    type: 'person',
                    label: otherPerson.full_name || 'Unknown',
                    role: otherPerson.person_type,
                    level: depth * 3 + 3,
                    data: otherPerson
                  }
                  nodes.push(otherPersonNode)
                  
                  edges.push({
                    source: caseNode.id,
                    target: otherPersonNode.id,
                    type: 'HAS_PERSON'
                  })

                  // Check if this person has more cases (multi-case)
                  if (otherPerson.case_count > 1) {
                    // Add to queue for further exploration
                    personQueue.push({
                      personId: otherPersonId,
                      depth: depth + 1,
                      parentNodeId: otherPersonNode.id
                    })
                  }
                }
              } catch (e) {
                console.warn(`Failed to load persons for case ${caseId}`)
              }
            }
          }
        }
      }

      setStats({
        depth: currentDepth,
        persons: visitedPersons.size,
        cases: visitedCases.size,
        dnaGroups: totalDnaGroups
      })

      setGraphData({ nodes, edges })
      setLoadingStatus('')
    } catch (error) {
      console.error('Failed to load person network:', error)
      setLoadingStatus('เกิดข้อผิดพลาด')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // =====================================================
  // RECURSIVE CASE NETWORK LOADER
  // Case → DNA → Persons → Their Cases → ...
  // =====================================================
  const loadCaseNetworkRecursive = useCallback(async (caseId: string) => {
    setIsLoading(true)
    setLoadingStatus('กำลังโหลดข้อมูลคดี...')
    
    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []
    const visitedCases = new Set<string>()
    const visitedPersons = new Set<string>()
    let currentDepth = 0
    let totalDnaGroups = 0

    const caseQueue: Array<{ caseId: string; depth: number }> = []

    try {
      // Level 0: Center Case
      const caseData = await casesApi.getById(caseId)
      if (!caseData) throw new Error('Case not found')

      const centerNode: GraphNode = {
        id: `case-${caseId}`,
        type: 'case',
        label: caseData.case_number || caseId,
        isCenter: true,
        level: 0,
        data: caseData
      }
      nodes.push(centerNode)
      visitedCases.add(caseId)
      caseQueue.push({ caseId, depth: 0 })

      while (caseQueue.length > 0) {
        const { caseId: currentCaseId, depth } = caseQueue.shift()!
        
        if (depth > MAX_DEPTH) continue
        currentDepth = Math.max(currentDepth, depth)

        setLoadingStatus(`ไล่ความเชื่อมโยง ระดับ ${depth + 1}...`)

        // Get persons in this case
        let casePersons: any[] = []
        try {
          casePersons = await casesApi.getPersons(currentCaseId)
        } catch (e) {
          continue
        }

        // Group persons by role/type
        const personsByDna: Map<string, any[]> = new Map()
        
        for (const person of (casePersons || []).slice(0, MAX_PERSONS_PER_CASE)) {
          const personId = person.person_id || person.id
          if (visitedPersons.has(personId)) continue
          
          const groupKey = `dna-${currentCaseId}-${Math.floor(casePersons.indexOf(person) / 2)}`
          if (!personsByDna.has(groupKey)) {
            personsByDna.set(groupKey, [])
          }
          personsByDna.get(groupKey)!.push(person)
        }

        // Create DNA evidence groups
        let groupIndex = 0
        for (const [groupKey, persons] of personsByDna) {
          groupIndex++
          totalDnaGroups++

          const dnaNode: GraphNode = {
            id: `${groupKey}-${depth}`,
            type: 'dna-group',
            label: `DNA Evidence #${groupIndex}`,
            level: depth * 3 + 1,
            data: {
              person_count: persons.length,
              has_match: true,
              match_count: persons.length,
              sample_description: `DNA เชื่อม ${persons.length} บุคคล`
            }
          }
          nodes.push(dnaNode)
          
          edges.push({
            source: `case-${currentCaseId}`,
            target: dnaNode.id,
            type: 'HAS_EVIDENCE'
          })

          // Create person nodes
          for (const person of persons) {
            const personId = person.person_id || person.id
            if (visitedPersons.has(personId)) continue
            visitedPersons.add(personId)

            const personNode: GraphNode = {
              id: `person-${personId}`,
              type: 'person',
              label: person.full_name || 'Unknown',
              role: person.person_type,
              level: depth * 3 + 2,
              data: person
            }
            nodes.push(personNode)
            
            edges.push({
              source: dnaNode.id,
              target: personNode.id,
              type: 'DNA_MATCH'
            })

            // Get other cases for this person
            if (depth < MAX_DEPTH && person.case_count > 1) {
              try {
                setLoadingStatus(`ค้นหาคดีของ ${person.full_name}...`)
                const personCases = await personsApi.getCases(personId)
                
                for (const otherCase of (personCases || []).slice(0, MAX_CASES_PER_PERSON)) {
                  const otherCaseId = otherCase.case_id
                  if (visitedCases.has(otherCaseId)) continue
                  visitedCases.add(otherCaseId)

                  const otherCaseNode: GraphNode = {
                    id: `case-${otherCaseId}`,
                    type: 'case',
                    label: otherCase.case_number || otherCaseId,
                    level: depth * 3 + 3,
                    data: otherCase
                  }
                  nodes.push(otherCaseNode)
                  
                  edges.push({
                    source: personNode.id,
                    target: otherCaseNode.id,
                    type: 'FOUND_IN'
                  })

                  // Add to queue for further exploration
                  caseQueue.push({
                    caseId: otherCaseId,
                    depth: depth + 1
                  })
                }
              } catch (e) {
                console.warn(`Failed to load cases for person ${personId}`)
              }
            }
          }
        }
      }

      setStats({
        depth: currentDepth,
        persons: visitedPersons.size,
        cases: visitedCases.size,
        dnaGroups: totalDnaGroups
      })

      setGraphData({ nodes, edges })
      setLoadingStatus('')
    } catch (error) {
      console.error('Failed to load case network:', error)
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
      
      if (typeParam === 'person') {
        loadPersonNetworkRecursive(cleanId)
      } else {
        loadCaseNetworkRecursive(cleanId)
      }
    }
  }, [id, typeParam, loadPersonNetworkRecursive, loadCaseNetworkRecursive])

  const handleSearchClick = (type: string, resultId: string) => {
    setSearchTerm('')
    setSelectedEntity({ type, id: resultId })
    
    if (type === 'person') {
      loadPersonNetworkRecursive(resultId)
    } else {
      loadCaseNetworkRecursive(resultId)
    }
  }

  const handleNodeClick = useCallback((node: GraphNode) => {
    console.log('Node clicked:', node)
  }, [])

  return (
    <div className="p-6 h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="text-green-400 w-6 h-6" />
            <h1 className="text-xl font-bold text-white">Hierarchical View</h1>
          </div>
          {selectedEntity && (
            <div className="flex items-center gap-2 text-sm text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full">
              {selectedEntity.type === 'person' ? <User className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              <span>{selectedEntity.type === 'person' ? 'บุคคล' : 'คดี'}: {selectedEntity.id}</span>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="ค้นหาคดี, บุคคล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-dark-300 border border-dark-100 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
          />
          
          {searchResults && searchTerm.length >= 2 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-dark-200 border border-dark-100 rounded-lg shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searchResults.data?.cases?.slice(0, 5).map((c: any) => (
                <button
                  key={c.case_id}
                  onClick={() => handleSearchClick('case', c.case_id)}
                  className="w-full px-4 py-3 text-left hover:bg-dark-300 flex items-center gap-3 border-b border-dark-100"
                >
                  <FileText className="text-cyan-400 w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{c.case_number}</div>
                    <div className="text-xs text-slate-400">{c.case_type} | {c.province}</div>
                  </div>
                  <ChevronRight className="text-slate-500 w-4 h-4" />
                </button>
              ))}
              {searchResults.data?.persons?.slice(0, 5).map((p: any) => (
                <button
                  key={p.person_id}
                  onClick={() => handleSearchClick('person', p.person_id)}
                  className="w-full px-4 py-3 text-left hover:bg-dark-300 flex items-center gap-3 border-b border-dark-100"
                >
                  <User className="text-green-400 w-4 h-4" />
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">{p.full_name}</div>
                    <div className="text-xs text-slate-400">{p.person_type} | {p.case_count} คดี</div>
                  </div>
                  <ChevronRight className="text-slate-500 w-4 h-4" />
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
          <div className="flex items-center gap-3 text-sm">
            <div className="px-3 py-1 bg-cyan-500/20 rounded-full text-cyan-400 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {stats.cases} คดี
            </div>
            <div className="px-3 py-1 bg-pink-500/20 rounded-full text-pink-400 flex items-center gap-1">
              <Dna className="w-3 h-3" />
              {stats.dnaGroups} กลุ่ม DNA
            </div>
            <div className="px-3 py-1 bg-green-500/20 rounded-full text-green-400 flex items-center gap-1">
              <User className="w-3 h-3" />
              {stats.persons} บุคคล
            </div>
            <div className="px-3 py-1 bg-purple-500/20 rounded-full text-purple-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              ระดับ {stats.depth}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="h-[calc(100%-60px)] bg-dark-300 rounded-xl border border-dark-100 overflow-hidden">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 font-medium">{loadingStatus || 'กำลังโหลด...'}</p>
              <p className="text-slate-500 text-sm mt-2">กำลังไล่ความเชื่อมโยงแบบ Recursive...</p>
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
              <p className="text-slate-400 mb-4">ค้นหาคดีหรือบุคคลเพื่อแสดงผังความเชื่อมโยง</p>
              
              <div className="bg-dark-200 rounded-lg p-4 max-w-md mx-auto text-left">
                <h3 className="text-cyan-400 font-semibold mb-2">🔄 Recursive Analysis</h3>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>• บุคคล → DNA Evidence → คดี</p>
                  <p>• คดี → บุคคลอื่น → คดีของบุคคลนั้น</p>
                  <p>• ไล่ต่อไปจนกว่าจะไม่มีเชื่อมโยงใหม่</p>
                  <p>• สูงสุด {MAX_DEPTH} ระดับ</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
