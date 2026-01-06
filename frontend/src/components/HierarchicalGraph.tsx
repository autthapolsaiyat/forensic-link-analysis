// src/components/HierarchicalGraph.tsx
// Hierarchical Tree Layout with DNA Evidence Flow

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { 
  Maximize2, Minimize2, Printer, Eye, EyeOff, 
  RotateCcw, ZoomIn, ZoomOut, Filter, Save, CreditCard
} from 'lucide-react'

interface GraphNode {
  id: string
  type: 'case' | 'person' | 'sample' | 'dna' | 'dna-group'
  label: string
  role?: string
  level?: number
  isCenter?: boolean
  data?: any
  children?: GraphNode[]
  _children?: GraphNode[] // collapsed children
  x?: number
  y?: number
  sourceCase?: string // DNA มาจากคดีไหน
  targetCase?: string // DNA เชื่อมไปคดีไหน
}

interface SavedPosition {
  id: string
  x: number
  y: number
}

interface GraphEdge {
  source: string | GraphNode
  target: string | GraphNode
  type: string
  label?: string
}

interface HierarchicalGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
  width?: number
  height?: number
}

interface SelectedNodeInfo {
  node: GraphNode
  connectedNodes: GraphNode[]
}

// Format Thai date for panel
const formatThaiDatePanel = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    const thaiYear = date.getFullYear() + 543
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 
                    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${date.getDate()} ${months[date.getMonth()]} ${thaiYear}`
  } catch {
    return dateStr
  }
}

// Color Palette
const COLORS = {
  dark: {
    bg: '#0a0e14',
    cardBg: 'rgba(13, 21, 32, 0.95)',
    text: '#e0e1dd',
    textMuted: '#8892a0',
    border: 'rgba(0, 240, 255, 0.3)',
    case: { primary: '#00f0ff', secondary: '#0a1a1f' },
    caseLinked: { primary: '#a855f7', secondary: '#1a0a1f' },
    suspect: { primary: '#ff2d55', secondary: '#1f0a0f' },
    arrested: { primary: '#ff6b35', secondary: '#1f150a' },
    reference: { primary: '#39ff14', secondary: '#0a1f0f' },
    victim: { primary: '#a855f7', secondary: '#1a0a1f' },
    dna: { primary: '#ec4899', secondary: '#1f0a15' },
    noMatch: { primary: '#6b7280', secondary: '#1a1a1a' },
    line: { dna: '#ff2d55', found: '#00f0ff', person: '#a855f7' }
  },
  light: {
    bg: '#ffffff',
    cardBg: '#ffffff',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#d1d5db',
    case: { primary: '#0891b2', secondary: '#f0fdfa' },
    caseLinked: { primary: '#7c3aed', secondary: '#faf5ff' },
    suspect: { primary: '#dc2626', secondary: '#fef2f2' },
    arrested: { primary: '#ea580c', secondary: '#fff7ed' },
    reference: { primary: '#16a34a', secondary: '#f0fdf4' },
    victim: { primary: '#7c3aed', secondary: '#faf5ff' },
    dna: { primary: '#db2777', secondary: '#fdf2f8' },
    noMatch: { primary: '#9ca3af', secondary: '#f9fafb' },
    line: { dna: '#dc2626', found: '#0891b2', person: '#7c3aed' }
  }
}

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

// Mask ID number
const maskIdNumber = (id: string) => {
  if (!id || id.length < 5) return id || '-'
  return id.substring(0, 5) + '-XXX-XX-X'
}

// Get node colors
const getNodeColors = (node: GraphNode, isPrintMode: boolean) => {
  const palette = isPrintMode ? COLORS.light : COLORS.dark
  
  if (node.type === 'case') {
    return node.isCenter ? palette.case : palette.caseLinked
  }
  if (node.type === 'person') {
    const role = node.role || node.data?.person_type
    if (role === 'Suspect') return palette.suspect
    if (role === 'Arrested') return palette.arrested
    if (role === 'Victim') return palette.victim
    return palette.reference
  }
  if (node.type === 'sample' || node.type === 'dna' || node.type === 'dna-group') {
    const hasMatch = node.data?.match_count > 0 || node.data?.has_match
    return hasMatch ? palette.dna : palette.noMatch
  }
  return palette.case
}

// Check if node has DNA match
const hasMatch = (node: GraphNode) => {
  if (node.type !== 'sample' && node.type !== 'dna' && node.type !== 'dna-group') return true
  const data = node.data || {}
  // Has match if: match_count > 0 OR has_match is explicitly true
  if (data.match_count > 0) return true
  if (data.has_match === true) return true
  // Check if connected to persons (means it has match)
  if (data.connected_persons > 0) return true
  // Default: no match
  return false
}

// Check if node should show close button (no match OR can be hidden)
const canHideNode = (node: GraphNode) => {
  if (node.isCenter) return false // Never hide center
  if (node.type === 'sample' || node.type === 'dna') {
    return !hasMatch(node) // Can hide no-match DNA
  }
  return false
}

export default function HierarchicalGraph({ 
  nodes, 
  edges, 
  onNodeClick,
  width = 800,
  height = 600 
}: HierarchicalGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width, height })
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showNoMatch, setShowNoMatch] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showFullId, setShowFullId] = useState(false) // Toggle ID masking
  const [savedPositions, setSavedPositions] = useState<SavedPosition[]>([]) // Saved layout
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set()) // Individually hidden nodes
  const [layoutSaved, setLayoutSaved] = useState(false) // Show save confirmation
  
  // Info Panel state (inside component for fullscreen support)
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<SelectedNodeInfo | null>(null)
  const [showPanel, setShowPanel] = useState(false)
  
  // Draggable panel state
  const [panelPosition, setPanelPosition] = useState({ x: -1, y: 16 }) // -1 means auto right
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  
  // Evidence samples state
  const [evidenceSamples, setEvidenceSamples] = useState<any[]>([])
  const [loadingEvidence, setLoadingEvidence] = useState(false)

  const colors = isPrintMode ? COLORS.light : COLORS.dark

  // Find connected nodes for panel
  const findConnectedNodes = useCallback((nodeId: string) => {
    const connected: GraphNode[] = []
    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    
    edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id || edge.source
      const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id || edge.target
      
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
  }, [nodes, edges])

  // Load evidence samples for a case
  const loadEvidenceSamples = useCallback(async (caseId: string) => {
    setLoadingEvidence(true)
    try {
      const response = await fetch(`https://forensic-link-api.azurewebsites.net/api/v1/cases/${caseId}/samples`)
      const result = await response.json()
      setEvidenceSamples(result.data || [])
    } catch (e) {
      console.error('Failed to load evidence:', e)
      setEvidenceSamples([])
    } finally {
      setLoadingEvidence(false)
    }
  }, [])

  // Handle node click internally
  const handleInternalNodeClick = useCallback((node: GraphNode) => {
    const connected = findConnectedNodes(node.id)
    setSelectedNodeInfo({ node, connectedNodes: connected })
    setShowPanel(true)
    
    // Load evidence samples if it's a case
    if (node.type === 'case' && node.data?.case_id) {
      loadEvidenceSamples(node.data.case_id)
    } else if (node.type === 'dna' && node.sourceCase) {
      // For DNA, try to get case_id from connected case
      const sourceCase = connected.find(n => n.type === 'case')
      if (sourceCase?.data?.case_id) {
        loadEvidenceSamples(sourceCase.data.case_id)
      } else {
        setEvidenceSamples([])
      }
    } else {
      setEvidenceSamples([])
    }
    
    onNodeClick?.(node)
  }, [findConnectedNodes, onNodeClick, loadEvidenceSamples])

  // Panel drag handlers
  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    const rect = (e.target as HTMLElement).closest('.info-panel')?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }, [])

  const handlePanelMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newX = e.clientX - containerRect.left - dragOffset.x
    const newY = e.clientY - containerRect.top - dragOffset.y
    
    // Keep panel within bounds
    setPanelPosition({
      x: Math.max(0, Math.min(newX, containerRect.width - 320)),
      y: Math.max(0, Math.min(newY, containerRect.height - 200))
    })
  }, [isDragging, dragOffset])

  const handlePanelMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove drag event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handlePanelMouseMove)
      window.addEventListener('mouseup', handlePanelMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handlePanelMouseMove)
      window.removeEventListener('mouseup', handlePanelMouseUp)
    }
  }, [isDragging, handlePanelMouseMove, handlePanelMouseUp])

  // Format ID based on toggle
  const formatIdNumber = useCallback((id: string) => {
    if (!id || id.length < 5) return id || '-'
    if (showFullId) return id
    return id.substring(0, 5) + '-XXX-XX-X'
  }, [showFullId])

  // Hide individual node
  const hideNode = useCallback((nodeId: string) => {
    setHiddenNodes(prev => {
      const newSet = new Set(prev)
      newSet.add(nodeId)
      return newSet
    })
  }, [])

  // Save current layout positions
  const saveLayout = useCallback(() => {
    if (svgRef.current) {
      const nodeElements = d3.select(svgRef.current).selectAll('.node-group')
      const positions: SavedPosition[] = []
      nodeElements.each(function(d: any) {
        if (d && d.x !== undefined && d.y !== undefined) {
          positions.push({ id: d.data.id, x: d.x, y: d.y })
        }
      })
      setSavedPositions(positions)
      setLayoutSaved(true)
      setTimeout(() => setLayoutSaved(false), 2000)
    }
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  // Update dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    document.addEventListener('fullscreenchange', updateDimensions)
    return () => {
      window.removeEventListener('resize', updateDimensions)
      document.removeEventListener('fullscreenchange', updateDimensions)
    }
  }, [])

  // Build hierarchy from flat nodes and edges
  const buildHierarchy = useCallback(() => {
    if (nodes.length === 0) return null

    // Find center node
    const centerNode = nodes.find(n => n.isCenter) || nodes[0]
    
    // Create adjacency map
    const adjMap = new Map<string, Set<string>>()
    const nodeMap = new Map<string, GraphNode>()
    
    nodes.forEach(n => {
      nodeMap.set(n.id, { ...n, children: [] })
      adjMap.set(n.id, new Set())
    })
    
    edges.forEach(e => {
      const sourceId = typeof e.source === 'string' ? e.source : e.source.id
      const targetId = typeof e.target === 'string' ? e.target : e.target.id
      adjMap.get(sourceId)?.add(targetId)
      adjMap.get(targetId)?.add(sourceId)
    })

    // BFS to build tree
    const visited = new Set<string>()
    const root = nodeMap.get(centerNode.id)!
    const queue: GraphNode[] = [root]
    visited.add(centerNode.id)

    while (queue.length > 0) {
      const current = queue.shift()!
      const neighbors = adjMap.get(current.id) || new Set()
      
      neighbors.forEach(neighborId => {
        if (!visited.has(neighborId)) {
          visited.add(neighborId)
          const neighbor = nodeMap.get(neighborId)!
          
          // Filter no-match if global toggle is off
          if (!showNoMatch && !hasMatch(neighbor)) return
          
          // Filter individually hidden nodes
          if (hiddenNodes.has(neighborId)) return
          
          current.children = current.children || []
          current.children.push(neighbor)
          queue.push(neighbor)
        }
      })
    }

    return root
  }, [nodes, edges, showNoMatch, hiddenNodes])

  // Main D3 rendering
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    svg.selectAll('*').remove()
    svg.style('background', colors.bg)

    // Create hierarchy
    const root = buildHierarchy()
    if (!root) return

    const hierarchy = d3.hierarchy(root)
    
    // Tree layout
    const treeLayout = d3.tree<GraphNode>()
      .size([width - 300, height - 200])
      .separation((a, b) => (a.parent === b.parent ? 1.5 : 2))

    const treeData = treeLayout(hierarchy)

    // Apply saved positions if available
    if (savedPositions.length > 0) {
      treeData.descendants().forEach(d => {
        const saved = savedPositions.find(p => p.id === d.data.id)
        if (saved) {
          d.x = saved.x
          d.y = saved.y
        }
      })
    }

    // Main group with zoom/pan
    const g = svg.append('g')
      .attr('transform', `translate(150, 80)`)

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        setZoomLevel(event.transform.k)
      })

    svg.call(zoom)
    svg.call(zoom.transform, d3.zoomIdentity.translate(150, 80))

    // Draw links
    const links = g.append('g')
      .selectAll('path')
      .data(treeData.links())
      .join('path')
      .attr('d', d3.linkVertical<any, any>()
        .x(d => d.x)
        .y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', d => {
        const targetType = d.target.data.type
        if (targetType === 'person') return colors.line.dna
        if (targetType === 'sample' || targetType === 'dna') return colors.line.found
        return colors.line.person
      })
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => {
        const targetType = d.target.data.type
        return targetType === 'case' ? '8,4' : 'none'
      })
      .attr('opacity', 0.7)

    // Draw nodes
    const nodeGroups = g.append('g')
      .selectAll('g')
      .data(treeData.descendants())
      .join('g')
      .attr('class', 'node-group')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')

    // Card dimensions
    const cardWidth = 200
    const getCardHeight = (d: any) => {
      const node = d.data as GraphNode
      if (node.type === 'case') return 90
      if (node.type === 'person') return 85
      return 70
    }

    // Card backgrounds
    nodeGroups.append('rect')
      .attr('x', -cardWidth / 2)
      .attr('y', d => -getCardHeight(d) / 2)
      .attr('width', cardWidth)
      .attr('height', d => getCardHeight(d))
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => getNodeColors(d.data, isPrintMode).secondary)
      .attr('stroke', d => getNodeColors(d.data, isPrintMode).primary)
      .attr('stroke-width', d => d.data.isCenter ? 3 : 2)
      .attr('filter', isPrintMode ? 'none' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))')

    // Card header bar
    nodeGroups.append('rect')
      .attr('x', -cardWidth / 2)
      .attr('y', d => -getCardHeight(d) / 2)
      .attr('width', cardWidth)
      .attr('height', 28)
      .attr('rx', 12)
      .attr('ry', 12)
      .attr('fill', d => getNodeColors(d.data, isPrintMode).primary)
      .attr('opacity', 0.2)

    // Clip path for header
    nodeGroups.append('rect')
      .attr('x', -cardWidth / 2)
      .attr('y', d => -getCardHeight(d) / 2 + 24)
      .attr('width', cardWidth)
      .attr('height', 4)
      .attr('fill', d => getNodeColors(d.data, isPrintMode).secondary)

    // Header icon and type
    nodeGroups.append('text')
      .attr('x', -cardWidth / 2 + 12)
      .attr('y', d => -getCardHeight(d) / 2 + 18)
      .attr('font-size', '13px')
      .attr('fill', d => getNodeColors(d.data, isPrintMode).primary)
      .attr('font-weight', '600')
      .text(d => {
        const node = d.data as GraphNode
        if (node.type === 'case') return node.isCenter ? '📍 คดีหลัก' : '📋 คดีเชื่อมโยง'
        if (node.type === 'person') {
          const role = node.role || node.data?.person_type
          if (role === 'Suspect') return '🔴 ผู้ต้องสงสัย'
          if (role === 'Arrested') return '🟠 ผู้ถูกจับกุม'
          if (role === 'Victim') return '🟣 ผู้เสียหาย'
          return '🟢 อ้างอิง'
        }
        if (node.type === 'dna-group') {
          const count = node.data?.case_count || node.data?.person_count || 0
          return `🧬 DNA Evidence [${count}]`
        }
        if (node.type === 'sample' || node.type === 'dna') {
          return hasMatch(node) ? '🧬 DNA Match' : '🧬 No Match'
        }
        return '📍'
      })

    // Main content - Title
    nodeGroups.append('text')
      .attr('x', -cardWidth / 2 + 12)
      .attr('y', d => -getCardHeight(d) / 2 + 45)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', colors.text)
      .text(d => {
        const node = d.data as GraphNode
        // For DNA group, show description with count
        if (node.type === 'dna-group') {
          return node.data?.sample_description || node.label || 'DNA Evidence'
        }
        const label = node.data?.case_number || node.data?.full_name || 
                     node.data?.sample_description || node.label || node.id
        return label.length > 22 ? label.substring(0, 22) + '...' : label
      })

    // Detail line 1
    nodeGroups.append('text')
      .attr('class', 'id-text')
      .attr('x', -cardWidth / 2 + 12)
      .attr('y', d => -getCardHeight(d) / 2 + 60)
      .attr('font-size', '10px')
      .attr('fill', colors.textMuted)
      .text(d => {
        const node = d.data as GraphNode
        const data = node.data || {}
        if (node.type === 'case') {
          const type = data.case_type || data.case_category || ''
          const date = formatThaiDate(data.case_date)
          return `🔫 ${type.substring(0, 12)} | 📅 ${date}`
        }
        if (node.type === 'person') {
          return `🪪 ${formatIdNumber(data.id_number)}`
        }
        if (node.type === 'sample' || node.type === 'dna' || node.type === 'dna-group') {
          // Show source case for DNA nodes
          if (node.sourceCase) {
            return `📍 จาก: ${node.sourceCase}`
          }
          const matchCount = data.match_count || 0
          return matchCount > 0 ? `✅ เชื่อม ${matchCount} คดี` : '⏳ รอตรวจสอบ'
        }
        return ''
      })

    // Detail line 2
    nodeGroups.append('text')
      .attr('x', -cardWidth / 2 + 12)
      .attr('y', d => -getCardHeight(d) / 2 + 75)
      .attr('font-size', '10px')
      .attr('fill', colors.textMuted)
      .text(d => {
        const node = d.data as GraphNode
        const data = node.data || {}
        if (node.type === 'case') {
          const province = data.province || ''
          const station = data.police_station || data.analyst_name || ''
          return `📍 ${province.substring(0, 8)} | 🏛️ ${station.substring(0, 10)}`
        }
        if (node.type === 'person') {
          const caseCount = data.case_count || 0
          return caseCount > 0 ? `📊 พบใน ${caseCount} คดี` : ''
        }
        if (node.type === 'sample' || node.type === 'dna' || node.type === 'dna-group') {
          // Show target case for DNA nodes
          if (node.targetCase) {
            return `🔗 ไป: ${node.targetCase}`
          }
        }
        return ''
      })

    // Case number badge for cases
    nodeGroups.filter(d => d.data.type === 'case')
      .append('text')
      .attr('x', -cardWidth / 2 + 12)
      .attr('y', d => -getCardHeight(d) / 2 + 85)
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .attr('fill', d => getNodeColors(d.data, isPrintMode).primary)
      .attr('font-weight', '600')
      .text(d => d.data.data?.case_number || d.data.label || '')

    // Expand/collapse indicator
    nodeGroups.filter(d => d.children && d.children.length > 0)
      .append('circle')
      .attr('cx', 0)
      .attr('cy', d => getCardHeight(d) / 2 + 10)
      .attr('r', 10)
      .attr('fill', colors.cardBg)
      .attr('stroke', colors.border)
      .attr('stroke-width', 1)

    nodeGroups.filter(d => d.children && d.children.length > 0)
      .append('text')
      .attr('x', 0)
      .attr('y', d => getCardHeight(d) / 2 + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', colors.textMuted)
      .text(d => d.children?.length || 0)

    // Close button for no-match DNA nodes (not center node)
    // Show on ALL sample/dna nodes that don't have matches
    const noMatchNodes = nodeGroups.filter(d => {
      const node = d.data as GraphNode
      // Show close button on samples/dna that:
      // 1. Are not center node
      // 2. Have no match OR have match_count = 0
      if (node.isCenter) return false
      if (node.type === 'sample' || node.type === 'dna') {
        const data = node.data || {}
        // If match_count is 0 or undefined, show close button
        const matchCount = data.match_count || 0
        return matchCount === 0
      }
      return false
    })

    // Close button background (more visible)
    noMatchNodes.append('rect')
      .attr('class', 'close-btn-bg')
      .attr('x', cardWidth / 2 - 28)
      .attr('y', d => -getCardHeight(d) / 2 + 4)
      .attr('width', 22)
      .attr('height', 22)
      .attr('rx', 6)
      .attr('fill', isPrintMode ? '#fef2f2' : 'rgba(255, 45, 85, 0.3)')
      .attr('stroke', isPrintMode ? '#dc2626' : '#ff2d55')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation()
        hideNode(d.data.id)
      })

    noMatchNodes.append('text')
      .attr('class', 'close-btn-text')
      .attr('x', cardWidth / 2 - 17)
      .attr('y', d => -getCardHeight(d) / 2 + 20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('fill', isPrintMode ? '#dc2626' : '#ff2d55')
      .attr('pointer-events', 'none')
      .text('✕')

    // Interactions
    nodeGroups
      .on('mouseenter', function(event, d) {
        d3.select(this).select('rect')
          .transition().duration(200)
          .attr('stroke-width', 4)
        
        if (d.data.type === 'sample' || d.data.type === 'dna') {
          setHoveredNode(d.data)
          setTooltipPos({ x: event.pageX, y: event.pageY })
        }
      })
      .on('mouseleave', function() {
        d3.select(this).select('rect')
          .transition().duration(200)
          .attr('stroke-width', (d: any) => d.data.isCenter ? 3 : 2)
        setHoveredNode(null)
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        handleInternalNodeClick(d.data)
      })

    // Drag behavior
    const drag = d3.drag<SVGGElement, d3.HierarchyPointNode<GraphNode>>()
      .on('drag', function(event, d) {
        d.x = event.x
        d.y = event.y
        d3.select(this).attr('transform', `translate(${d.x},${d.y})`)
        
        // Update links
        links.attr('d', d3.linkVertical<any, any>()
          .x(d => d.x)
          .y(d => d.y))
      })

    nodeGroups.call(drag as any)

  }, [nodes, edges, dimensions, isPrintMode, showNoMatch, hiddenNodes, savedPositions, showFullId, colors, buildHierarchy, handleInternalNodeClick, hideNode, formatIdNumber])

  // Handle print
  const handlePrint = useCallback(() => {
    setIsPrintMode(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setIsPrintMode(false), 500)
    }, 100)
  }, [])

  return (
    <div 
      ref={containerRef} 
      className={`hierarchical-graph-container ${isPrintMode ? 'print-mode' : ''} ${isFullscreen ? 'fullscreen' : ''}`}
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        background: colors.bg,
        borderRadius: isFullscreen ? 0 : '12px',
        overflow: 'hidden'
      }}
    >
      <style>{`
        .hierarchical-graph-container {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .hierarchical-graph-container.fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999 !important;
          border-radius: 0 !important;
        }
        
        .graph-controls {
          position: absolute;
          top: 12px;
          right: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 100;
        }
        
        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: ${colors.cardBg};
          border: 1px solid ${colors.border};
          border-radius: 10px;
          color: ${isPrintMode ? '#374151' : '#00f0ff'};
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .control-btn:hover {
          background: ${isPrintMode ? '#f3f4f6' : 'rgba(0, 240, 255, 0.15)'};
          transform: scale(1.05);
        }
        
        .control-btn.active {
          background: ${isPrintMode ? '#0891b2' : 'rgba(0, 240, 255, 0.25)'};
          color: ${isPrintMode ? '#ffffff' : '#00f0ff'};
        }
        
        .control-btn.warning {
          color: ${isPrintMode ? '#dc2626' : '#ff2d55'};
        }
        
        .zoom-display {
          font-size: 10px;
          text-align: center;
          color: ${colors.textMuted};
          margin-top: -4px;
        }
        
        .dna-tooltip {
          position: fixed;
          background: ${colors.cardBg};
          border: 2px solid ${isPrintMode ? '#db2777' : '#ec4899'};
          border-radius: 12px;
          padding: 12px 16px;
          min-width: 220px;
          max-width: 300px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, ${isPrintMode ? '0.15' : '0.5'});
          z-index: 1000;
          pointer-events: none;
        }
        
        .dna-tooltip h4 {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: ${isPrintMode ? '#db2777' : '#ec4899'};
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .dna-tooltip ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        
        .dna-tooltip li {
          font-size: 11px;
          color: ${colors.text};
          padding: 4px 0;
          border-bottom: 1px solid ${colors.border};
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .dna-tooltip li:last-child {
          border-bottom: none;
        }
        
        .legend {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: ${colors.cardBg};
          border: 1px solid ${colors.border};
          border-radius: 12px;
          padding: 12px 16px;
          z-index: 100;
        }
        
        .legend h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          font-weight: 600;
          color: ${colors.text};
        }
        
        .legend-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: ${colors.textMuted};
        }
        
        .legend-line {
          width: 24px;
          height: 3px;
          border-radius: 2px;
        }
        
        @media print {
          .graph-controls, .legend {
            display: none !important;
          }
          .hierarchical-graph-container {
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Controls */}
      <div className="graph-controls">
        <button 
          className="control-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'ออกจากเต็มจอ' : 'เต็มจอ'}
        >
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
        
        <button 
          className={`control-btn ${showFullId ? 'active' : ''}`}
          onClick={() => setShowFullId(!showFullId)}
          title={showFullId ? 'ซ่อนเลขบัตร' : 'แสดงเลขบัตรเต็ม'}
        >
          <CreditCard size={20} />
        </button>
        
        <button 
          className={`control-btn ${layoutSaved ? 'success' : ''}`}
          onClick={saveLayout}
          title="บันทึกตำแหน่ง Layout"
          style={layoutSaved ? { background: 'rgba(57, 255, 20, 0.2)', borderColor: '#39ff14' } : {}}
        >
          {layoutSaved ? '✓' : <Save size={20} />}
        </button>
        
        <button 
          className={`control-btn ${!showNoMatch ? 'active' : ''}`}
          onClick={() => setShowNoMatch(!showNoMatch)}
          title={showNoMatch ? 'ซ่อน No Match ทั้งหมด' : 'แสดง No Match ทั้งหมด'}
        >
          {showNoMatch ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
        
        <button 
          className={`control-btn ${isPrintMode ? 'active' : ''}`}
          onClick={() => setIsPrintMode(!isPrintMode)}
          title={isPrintMode ? 'โหมดปกติ' : 'โหมดพิมพ์'}
        >
          <Printer size={20} />
        </button>
        
        <button 
          className="control-btn"
          onClick={handlePrint}
          title="พิมพ์"
        >
          📄
        </button>
        
        <button 
          className="control-btn"
          onClick={() => {
            setHiddenNodes(new Set())
            setSavedPositions([])
          }}
          title="รีเซ็ตทั้งหมด"
        >
          <RotateCcw size={20} />
        </button>
        
        {hiddenNodes.size > 0 && (
          <button 
            className="control-btn warning"
            onClick={() => setHiddenNodes(new Set())}
            title={`แสดงกล่องที่ซ่อน (${hiddenNodes.size})`}
          >
            <span style={{ fontSize: '12px' }}>+{hiddenNodes.size}</span>
          </button>
        )}
        
        <div className="zoom-display">{Math.round(zoomLevel * 100)}%</div>
      </div>

      {/* Legend */}
      <div className="legend">
        <h4>สัญลักษณ์</h4>
        <div className="legend-items">
          <div className="legend-item">
            <span style={{ color: colors.case.primary }}>■</span>
            <span>คดีหลัก</span>
          </div>
          <div className="legend-item">
            <span style={{ color: colors.caseLinked.primary }}>■</span>
            <span>คดีเชื่อมโยง</span>
          </div>
          <div className="legend-item">
            <span style={{ color: colors.dna.primary }}>■</span>
            <span>DNA/วัตถุพยาน</span>
          </div>
          <div className="legend-item">
            <span style={{ color: colors.suspect.primary }}>■</span>
            <span>ผู้ต้องสงสัย</span>
          </div>
          <div className="legend-item">
            <span style={{ color: colors.reference.primary }}>■</span>
            <span>อ้างอิง</span>
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ background: colors.line.dna }} />
            <span>DNA Match</span>
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ background: colors.line.found, opacity: 0.7 }} />
            <span>พบใน</span>
          </div>
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block' }}
      />

      {/* DNA Tooltip */}
      {hoveredNode && (hoveredNode.type === 'sample' || hoveredNode.type === 'dna') && (
        <div 
          className="dna-tooltip"
          style={{ 
            left: tooltipPos.x + 15, 
            top: tooltipPos.y - 10 
          }}
        >
          <h4>📋 รายการวัตถุพยาน</h4>
          <ul>
            <li>
              <span>🧬</span>
              <span>{hoveredNode.data?.sample_description || hoveredNode.label}</span>
            </li>
            {hoveredNode.data?.lab_number && (
              <li>
                <span>🏷️</span>
                <span>Lab: {hoveredNode.data.lab_number}</span>
              </li>
            )}
            {hoveredNode.data?.evidence_type && (
              <li>
                <span>🔬</span>
                <span>{hoveredNode.data.evidence_type}</span>
              </li>
            )}
            {hoveredNode.data?.match_count > 0 && (
              <li>
                <span>✅</span>
                <span>ตรงกัน {hoveredNode.data.match_count} ตัวอย่าง</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Info Panel - Draggable */}
      {showPanel && selectedNodeInfo && (
        <div 
          className="info-panel"
          style={{
          position: 'absolute',
          left: panelPosition.x === -1 ? 'auto' : `${panelPosition.x}px`,
          right: panelPosition.x === -1 ? '16px' : 'auto',
          top: `${panelPosition.y}px`,
          width: '320px',
          maxHeight: 'calc(100% - 32px)',
          background: isPrintMode ? '#ffffff' : 'rgba(13, 21, 32, 0.98)',
          border: `2px solid ${isPrintMode ? '#0891b2' : '#00f0ff'}`,
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 10px 40px rgba(0, 240, 255, 0.2)',
          zIndex: 200
        }}>
          {/* Panel Header - Draggable */}
          <div 
            onMouseDown={handlePanelMouseDown}
            style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${isPrintMode ? '#e5e7eb' : 'rgba(0, 240, 255, 0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isPrintMode ? '#f9fafb' : 'rgba(0, 240, 255, 0.1)',
            cursor: 'move',
            userSelect: 'none'
          }}>
            <span style={{ 
              fontWeight: 600, 
              color: isPrintMode ? '#1f2937' : '#00f0ff',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ cursor: 'grab' }}>⋮⋮</span>
              {selectedNodeInfo.node.type === 'case' ? '📋' : 
               selectedNodeInfo.node.type === 'person' ? '👤' : '🧬'} รายละเอียด
            </span>
            <button 
              onClick={() => setShowPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isPrintMode ? '#6b7280' : '#8892a0',
                fontSize: '18px',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Panel Content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            color: isPrintMode ? '#1f2937' : '#e0e1dd'
          }}>
            {/* Case Info */}
            {selectedNodeInfo.node.type === 'case' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>เลขคดี</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: isPrintMode ? '#0891b2' : '#00f0ff' }}>
                    {selectedNodeInfo.node.data?.case_number || selectedNodeInfo.node.label}
                  </div>
                </div>
                {selectedNodeInfo.node.data?.case_type && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>ประเภทคดี</div>
                    <div style={{ fontSize: '13px' }}>{selectedNodeInfo.node.data.case_type}</div>
                  </div>
                )}
                {selectedNodeInfo.node.data?.case_date && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>📅 วันที่</div>
                    <div style={{ fontSize: '13px' }}>{formatThaiDatePanel(selectedNodeInfo.node.data.case_date)}</div>
                  </div>
                )}
                {selectedNodeInfo.node.data?.province && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>📍 จังหวัด</div>
                    <div style={{ fontSize: '13px' }}>{selectedNodeInfo.node.data.province}</div>
                  </div>
                )}
                {selectedNodeInfo.node.data?.police_station && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>🏛️ สถานี</div>
                    <div style={{ fontSize: '13px' }}>{selectedNodeInfo.node.data.police_station}</div>
                  </div>
                )}
                
                {/* Evidence Samples */}
                <div style={{ 
                  marginTop: '16px', 
                  paddingTop: '16px', 
                  borderTop: `1px solid ${isPrintMode ? '#e5e7eb' : 'rgba(0, 240, 255, 0.2)'}` 
                }}>
                  <div style={{ 
                    fontSize: '11px', 
                    color: isPrintMode ? '#6b7280' : '#8892a0', 
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🧬 วัตถุพยาน DNA ({loadingEvidence ? '...' : evidenceSamples.length})
                  </div>
                  {loadingEvidence ? (
                    <div style={{ fontSize: '12px', color: isPrintMode ? '#9ca3af' : '#6b7280' }}>กำลังโหลด...</div>
                  ) : evidenceSamples.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                      {evidenceSamples.slice(0, 10).map((sample: any, idx: number) => (
                        <div 
                          key={idx}
                          style={{
                            background: isPrintMode ? '#fdf2f8' : 'rgba(236, 72, 153, 0.1)',
                            border: `1px solid ${isPrintMode ? '#fbcfe8' : 'rgba(236, 72, 153, 0.3)'}`,
                            borderRadius: '6px',
                            padding: '8px 10px',
                            fontSize: '11px'
                          }}
                        >
                          <div style={{ 
                            fontWeight: 600, 
                            color: isPrintMode ? '#db2777' : '#ec4899',
                            marginBottom: '2px'
                          }}>
                            {sample.sample_description || sample.evidence_type || 'วัตถุพยาน'}
                          </div>
                          <div style={{ color: isPrintMode ? '#6b7280' : '#8892a0', fontSize: '10px' }}>
                            {sample.evidence_type && <span>ประเภท: {sample.evidence_type}</span>}
                            {sample.lab_number && <span> | Lab: {sample.lab_number}</span>}
                          </div>
                          {sample.has_match && (
                            <div style={{ color: isPrintMode ? '#16a34a' : '#39ff14', fontSize: '10px', marginTop: '2px' }}>
                              ✅ มี DNA Match
                            </div>
                          )}
                        </div>
                      ))}
                      {evidenceSamples.length > 10 && (
                        <div style={{ fontSize: '10px', color: isPrintMode ? '#9ca3af' : '#6b7280', textAlign: 'center' }}>
                          ...และอีก {evidenceSamples.length - 10} รายการ
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: isPrintMode ? '#9ca3af' : '#6b7280' }}>ไม่พบวัตถุพยาน</div>
                  )}
                </div>
              </>
            )}

            {/* Person Info */}
            {selectedNodeInfo.node.type === 'person' && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>ชื่อ-นามสกุล</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: isPrintMode ? '#16a34a' : '#39ff14' }}>
                    {selectedNodeInfo.node.data?.full_name || selectedNodeInfo.node.label}
                  </div>
                </div>
                {selectedNodeInfo.node.data?.id_number && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>เลขประจำตัว</div>
                    <div style={{ fontSize: '13px', fontFamily: 'monospace' }}>{selectedNodeInfo.node.data.id_number}</div>
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>ประเภท</div>
                  <span style={{
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: selectedNodeInfo.node.role === 'Suspect' ? 'rgba(255, 45, 85, 0.2)' :
                               selectedNodeInfo.node.role === 'Arrested' ? 'rgba(255, 107, 53, 0.2)' : 'rgba(57, 255, 20, 0.2)',
                    color: selectedNodeInfo.node.role === 'Suspect' ? '#ff2d55' :
                           selectedNodeInfo.node.role === 'Arrested' ? '#ff6b35' : '#39ff14'
                  }}>
                    {selectedNodeInfo.node.role === 'Suspect' ? 'ผู้ต้องสงสัย' :
                     selectedNodeInfo.node.role === 'Arrested' ? 'ผู้ถูกจับกุม' : 'อ้างอิง'}
                  </span>
                </div>
                {selectedNodeInfo.node.data?.case_count && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>📊 จำนวนคดี</div>
                    <div style={{ fontSize: '13px' }}>พบใน {selectedNodeInfo.node.data.case_count} คดี</div>
                  </div>
                )}
              </>
            )}

            {/* DNA Info */}
            {(selectedNodeInfo.node.type === 'dna' || selectedNodeInfo.node.type === 'dna-group' || selectedNodeInfo.node.type === 'sample') && (
              <>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>DNA Evidence</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: isPrintMode ? '#db2777' : '#ec4899' }}>
                    {selectedNodeInfo.node.label}
                  </div>
                </div>
                {selectedNodeInfo.node.sourceCase && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>📍 จากคดี</div>
                    <div style={{ fontSize: '13px', color: isPrintMode ? '#0891b2' : '#00f0ff' }}>{selectedNodeInfo.node.sourceCase}</div>
                  </div>
                )}
                {selectedNodeInfo.node.targetCase && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>🔗 เชื่อมไปคดี</div>
                    <div style={{ fontSize: '13px', color: isPrintMode ? '#7c3aed' : '#a855f7' }}>{selectedNodeInfo.node.targetCase}</div>
                  </div>
                )}
                {selectedNodeInfo.node.data?.sample_description && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', color: isPrintMode ? '#6b7280' : '#8892a0', marginBottom: '4px' }}>รายละเอียด</div>
                    <div style={{ fontSize: '13px' }}>{selectedNodeInfo.node.data.sample_description}</div>
                  </div>
                )}
              </>
            )}

            {/* Connected Nodes */}
            {selectedNodeInfo.connectedNodes.length > 0 && (
              <div style={{ 
                marginTop: '16px', 
                paddingTop: '16px', 
                borderTop: `1px solid ${isPrintMode ? '#e5e7eb' : 'rgba(0, 240, 255, 0.2)'}` 
              }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: isPrintMode ? '#6b7280' : '#8892a0', 
                  marginBottom: '8px' 
                }}>
                  🔗 เชื่อมโยงกับ ({selectedNodeInfo.connectedNodes.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {selectedNodeInfo.connectedNodes.map((node, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleInternalNodeClick(node)}
                      style={{
                        background: isPrintMode ? '#f9fafb' : 'rgba(255, 255, 255, 0.05)',
                        border: `1px solid ${isPrintMode ? '#e5e7eb' : 'rgba(255, 255, 255, 0.1)'}`,
                        borderRadius: '8px',
                        padding: '8px 12px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        color: isPrintMode ? '#1f2937' : '#e0e1dd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                      }}
                    >
                      <span>{node.type === 'case' ? '📋' : node.type === 'person' ? '👤' : '🧬'}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {node.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div style={{
            padding: '8px 16px',
            borderTop: `1px solid ${isPrintMode ? '#e5e7eb' : 'rgba(0, 240, 255, 0.2)'}`,
            textAlign: 'center',
            fontSize: '11px',
            color: isPrintMode ? '#9ca3af' : '#6b7280'
          }}>
            คลิกที่ node อื่นเพื่อดูรายละเอียด
          </div>
        </div>
      )}
    </div>
  )
}
