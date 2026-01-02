// src/components/JarvisGraphEnhanced.tsx
// Enhanced JARVIS Network Graph with Tooltips and Print Mode

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { Printer, Pin, PinOff, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface GraphNode {
  id: string
  type: 'case' | 'person' | 'sample' | 'cluster'
  label: string
  role?: string
  level?: number
  isCenter?: boolean
  data?: any
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphEdge {
  source: string | GraphNode
  target: string | GraphNode
  type: string
  label?: string
}

interface JarvisGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (node: GraphNode) => void
  width?: number
  height?: number
}

interface TooltipData {
  node: GraphNode
  x: number
  y: number
  pinned: boolean
}

// Color Palette - supports both dark and light mode
const COLORS = {
  dark: {
    cyan: '#00f0ff',
    cyanDim: '#00a8b3',
    gold: '#ffd700',
    red: '#ff2d55',
    orange: '#ff6b35',
    green: '#39ff14',
    purple: '#a855f7',
    blue: '#4895ef',
    bg: '#0a0e14',
    text: '#e0e1dd',
    textMuted: '#8892a0',
    border: 'rgba(0, 240, 255, 0.3)',
    cardBg: 'rgba(13, 21, 32, 0.95)',
  },
  light: {
    cyan: '#0891b2',
    cyanDim: '#06748c',
    gold: '#b8860b',
    red: '#dc2626',
    orange: '#ea580c',
    green: '#16a34a',
    purple: '#7c3aed',
    blue: '#2563eb',
    bg: '#ffffff',
    text: '#1f2937',
    textMuted: '#6b7280',
    border: '#d1d5db',
    cardBg: '#ffffff',
  }
}

// Get node color based on type and role
const getNodeColor = (node: GraphNode, isPrintMode: boolean) => {
  const colors = isPrintMode ? COLORS.light : COLORS.dark
  if (node.type === 'case') {
    return node.isCenter ? colors.cyan : colors.purple
  }
  if (node.type === 'person') {
    if (node.role === 'Suspect') return colors.red
    if (node.role === 'Arrested') return colors.orange
    return colors.green
  }
  if (node.type === 'sample') return colors.blue
  return colors.cyan
}

// Get node size based on type
const getNodeSize = (node: GraphNode) => {
  if (node.isCenter) return 45
  if (node.type === 'case') return 35
  if (node.type === 'person') return 32
  if (node.type === 'sample') return 28
  return 30
}

// Format date to Thai
const formatThaiDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('th-TH', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

// Mask ID number
const maskIdNumber = (id: string) => {
  if (!id || id.length < 5) return id || '-'
  return id.substring(0, 5) + '-XXXX-XX-X'
}

// Tooltip Component
const NodeTooltip = ({ 
  data, 
  onClose, 
  onPin,
  isPrintMode 
}: { 
  data: TooltipData
  onClose: () => void
  onPin: () => void
  isPrintMode: boolean
}) => {
  const colors = isPrintMode ? COLORS.light : COLORS.dark
  const { node, x, y, pinned } = data
  const nodeData = node.data || {}

  const renderCaseTooltip = () => (
    <>
      <div className="tooltip-header" style={{ borderColor: getNodeColor(node, isPrintMode) }}>
        <span className="tooltip-icon">📍</span>
        <span className="tooltip-type">{node.isCenter ? 'คดีหลัก' : 'คดีเชื่อมโยง'}</span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-row">
          <span className="row-icon">🔫</span>
          <span className="row-value">{nodeData.case_type || nodeData.caseType || nodeData.case_category || 'ไม่ระบุประเภท'}</span>
        </div>
        <div className="tooltip-row">
          <span className="row-icon">📍</span>
          <span className="row-value address">{nodeData.scene_address || nodeData.province || nodeData.sceneAddress || 'ไม่ระบุสถานที่'}</span>
        </div>
        <div className="tooltip-row">
          <span className="row-icon">📅</span>
          <span className="row-value">{formatThaiDate(nodeData.case_date || nodeData.caseDate || nodeData.created_at)}</span>
        </div>
        <div className="tooltip-row">
          <span className="row-icon">🏛️</span>
          <span className="row-value">{nodeData.police_station || nodeData.policeStation || nodeData.analyst_name || 'ไม่ระบุ สภ.'}</span>
        </div>
        <div className="tooltip-row case-number">
          <span className="row-icon">📋</span>
          <span className="row-value">{nodeData.case_number || node.label || node.id.replace('case-', '')}</span>
        </div>
        {nodeData.sample_count > 0 && (
          <div className="tooltip-row">
            <span className="row-icon">🧪</span>
            <span className="row-value">ตัวอย่าง {nodeData.sample_count} รายการ</span>
          </div>
        )}
        {nodeData.link_count > 0 && (
          <div className="tooltip-row">
            <span className="row-icon">🔗</span>
            <span className="row-value">เชื่อมโยง {nodeData.link_count} คดี</span>
          </div>
        )}
      </div>
    </>
  )

  const renderPersonTooltip = () => (
    <>
      <div className="tooltip-header" style={{ borderColor: getNodeColor(node, isPrintMode) }}>
        <span className="tooltip-icon">👤</span>
        <span className="tooltip-type">
          {node.role === 'Suspect' || nodeData.person_type === 'Suspect' ? 'ผู้ต้องสงสัย' : 
           node.role === 'Arrested' || nodeData.person_type === 'Arrested' ? 'ผู้ถูกจับกุม' : 
           node.role === 'Victim' || nodeData.person_type === 'Victim' ? 'ผู้เสียหาย' : 'บุคคลอ้างอิง'}
        </span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-row name">
          <span className="row-value">{nodeData.full_name || node.label || 'ไม่ระบุชื่อ'}</span>
        </div>
        <div className="tooltip-row">
          <span className="row-icon">🪪</span>
          <span className="row-value">{maskIdNumber(nodeData.id_number || nodeData.idNumber)}</span>
        </div>
        {(nodeData.case_count > 0 || nodeData.case_numbers) && (
          <div className="tooltip-row">
            <span className="row-icon">📊</span>
            <span className="row-value">พบใน {nodeData.case_count || nodeData.case_numbers?.split(',').length || 0} คดี</span>
          </div>
        )}
        <div className="tooltip-row status">
          <span className={`status-badge ${(node.role || nodeData.person_type || 'reference').toLowerCase()}`}>
            {node.role === 'Suspect' || nodeData.person_type === 'Suspect' ? '🔴 ผู้ต้องสงสัย' : 
             node.role === 'Arrested' || nodeData.person_type === 'Arrested' ? '🟠 ผู้ถูกจับกุม' : 
             node.role === 'Victim' || nodeData.person_type === 'Victim' ? '🟣 ผู้เสียหาย' : '🟢 อ้างอิง'}
          </span>
        </div>
      </div>
    </>
  )

  const renderSampleTooltip = () => (
    <>
      <div className="tooltip-header" style={{ borderColor: getNodeColor(node, isPrintMode) }}>
        <span className="tooltip-icon">🧬</span>
        <span className="tooltip-type">DNA / วัตถุพยาน</span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-row">
          <span className="row-value sample-desc">{nodeData.sample_description || nodeData.lab_number || node.label}</span>
        </div>
        {(nodeData.sample_type || nodeData.evidence_type) && (
          <div className="tooltip-row">
            <span className="row-icon">🔬</span>
            <span className="row-value">{nodeData.sample_type || nodeData.evidence_type}</span>
          </div>
        )}
        {nodeData.has_dna_profile && (
          <div className="tooltip-row">
            <span className="row-icon">✅</span>
            <span className="row-value">มี DNA Profile</span>
          </div>
        )}
        {nodeData.match_count > 0 && (
          <div className="tooltip-row">
            <span className="row-icon">🔗</span>
            <span className="row-value">ตรงกัน {nodeData.match_count} ตัวอย่าง</span>
          </div>
        )}
      </div>
    </>
  )

  return (
    <div 
      className={`node-tooltip ${isPrintMode ? 'print-mode' : ''} ${pinned ? 'pinned' : ''}`}
      style={{
        left: x + 15,
        top: y - 10,
        backgroundColor: colors.cardBg,
        borderColor: colors.border,
        color: colors.text,
      }}
    >
      <div className="tooltip-actions">
        <button onClick={onPin} title={pinned ? 'Unpin' : 'Pin'}>
          {pinned ? <PinOff size={14} /> : <Pin size={14} />}
        </button>
        <button onClick={onClose} title="Close">×</button>
      </div>
      
      {node.type === 'case' && renderCaseTooltip()}
      {node.type === 'person' && renderPersonTooltip()}
      {node.type === 'sample' && renderSampleTooltip()}
    </div>
  )
}

// Main Component
export default function JarvisGraphEnhanced({ 
  nodes, 
  edges, 
  onNodeClick,
  width = 800,
  height = 600 
}: JarvisGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width, height })
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [showTooltips, setShowTooltips] = useState(true)
  const [tooltips, setTooltips] = useState<TooltipData[]>([])
  const [hoveredNode, setHoveredNode] = useState<TooltipData | null>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)

  const colors = isPrintMode ? COLORS.light : COLORS.dark

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect()
        setDimensions({ width, height })
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Handle node hover
  const handleNodeHover = useCallback((node: GraphNode, event: MouseEvent) => {
    if (!showTooltips) return
    const isPinned = tooltips.some(t => t.node.id === node.id && t.pinned)
    if (!isPinned) {
      setHoveredNode({
        node,
        x: event.clientX,
        y: event.clientY,
        pinned: false
      })
    }
  }, [showTooltips, tooltips])

  // Handle node leave
  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null)
  }, [])

  // Handle node click - pin tooltip
  const handleNodeClick = useCallback((node: GraphNode, event: MouseEvent) => {
    const existingIndex = tooltips.findIndex(t => t.node.id === node.id)
    if (existingIndex >= 0) {
      // Toggle pin
      setTooltips(prev => prev.map((t, i) => 
        i === existingIndex ? { ...t, pinned: !t.pinned } : t
      ))
    } else {
      // Add new pinned tooltip
      setTooltips(prev => [...prev, {
        node,
        x: event.clientX,
        y: event.clientY,
        pinned: true
      }])
    }
    setHoveredNode(null)
    onNodeClick?.(node)
  }, [tooltips, onNodeClick])

  // Close tooltip
  const closeTooltip = useCallback((nodeId: string) => {
    setTooltips(prev => prev.filter(t => t.node.id !== nodeId))
  }, [])

  // Toggle pin
  const togglePin = useCallback((nodeId: string) => {
    setTooltips(prev => prev.map(t => 
      t.node.id === nodeId ? { ...t, pinned: !t.pinned } : t
    ))
  }, [])

  // Print function
  const handlePrint = useCallback(() => {
    setIsPrintMode(true)
    setTimeout(() => {
      window.print()
      setTimeout(() => setIsPrintMode(false), 500)
    }, 100)
  }, [])

  // Main D3 rendering
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    svg.selectAll('*').remove()

    const defs = svg.append('defs')

    // Glow filter (only for dark mode)
    if (!isPrintMode) {
      const glowFilter = defs.append('filter')
        .attr('id', 'glow')
        .attr('x', '-50%').attr('y', '-50%')
        .attr('width', '200%').attr('height', '200%')
      glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
      const glowMerge = glowFilter.append('feMerge')
      glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
      glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')
    }

    // Main container group with zoom
    const g = svg.append('g')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))

    svg.call(zoom)

    // Background
    svg.style('background', isPrintMode ? '#ffffff' : colors.bg)

    const centerX = width / 2
    const centerY = height / 2

    // Grid lines for print mode
    if (isPrintMode) {
      const gridGroup = g.append('g').attr('class', 'grid')
      for (let i = 0; i < width; i += 50) {
        gridGroup.append('line')
          .attr('x1', i).attr('y1', 0).attr('x2', i).attr('y2', height)
          .attr('stroke', '#e5e7eb').attr('stroke-width', 0.5)
      }
      for (let i = 0; i < height; i += 50) {
        gridGroup.append('line')
          .attr('x1', 0).attr('y1', i).attr('x2', width).attr('y2', i)
          .attr('stroke', '#e5e7eb').attr('stroke-width', 0.5)
      }
    } else {
      // Radar circles for dark mode
      const radarGroup = g.append('g').attr('class', 'radar')
      const maxRadius = Math.min(width, height) / 2 - 50
      ;[0.25, 0.5, 0.75, 1].forEach((ratio, i) => {
        radarGroup.append('circle')
          .attr('cx', centerX).attr('cy', centerY)
          .attr('r', maxRadius * ratio)
          .attr('fill', 'none')
          .attr('stroke', colors.cyan)
          .attr('stroke-opacity', 0.1 - i * 0.02)
          .attr('stroke-width', 1)
      })
    }

    // Create simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes as GraphNode[])
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edges as GraphEdge[])
        .id(d => d.id)
        .distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(50))

    simulationRef.current = simulation

    // Draw edges
    const link = g.append('g')
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('stroke', (d: any) => d.type === 'DNA_MATCH' ? (isPrintMode ? '#dc2626' : '#ff2d55') : colors.cyan)
      .attr('stroke-opacity', isPrintMode ? 0.8 : 0.5)
      .attr('stroke-width', (d: any) => d.type === 'DNA_MATCH' ? 2.5 : 1.5)
      .attr('stroke-dasharray', (d: any) => d.type === 'FOUND_IN' ? '5,5' : 'none')

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }))

    // Node circles
    node.append('circle')
      .attr('r', d => getNodeSize(d))
      .attr('fill', isPrintMode ? '#ffffff' : 'rgba(10, 14, 20, 0.8)')
      .attr('stroke', d => getNodeColor(d, isPrintMode))
      .attr('stroke-width', d => d.isCenter ? 4 : 2.5)
      .attr('filter', isPrintMode ? 'none' : 'url(#glow)')

    // Node icons
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => d.isCenter ? '20px' : '16px')
      .text(d => {
        if (d.type === 'case') return d.isCenter ? '📍' : '📋'
        if (d.type === 'person') {
          if (d.role === 'Suspect') return '🔴'
          if (d.role === 'Arrested') return '🟠'
          if (d.role === 'Victim') return '🟣'
          return '🟢'
        }
        if (d.type === 'sample') return '🧬'
        return '📍'
      })

    // Node labels
    node.append('text')
      .attr('dy', d => getNodeSize(d) + 15)
      .attr('text-anchor', 'middle')
      .attr('fill', colors.text)
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text(d => {
        const label = d.label || d.id
        return label.length > 18 ? label.substring(0, 18) + '...' : label
      })

    // Event handlers
    node.on('mouseenter', function(event, d) {
      handleNodeHover(d, event)
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('stroke-width', 4)
    })
    .on('mouseleave', function() {
      handleNodeLeave()
      d3.select(this).select('circle')
        .transition().duration(200)
        .attr('stroke-width', (d: any) => d.isCenter ? 4 : 2.5)
    })
    .on('click', (event, d) => {
      event.stopPropagation()
      handleNodeClick(d, event)
    })

    // Simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, dimensions, isPrintMode, colors, handleNodeHover, handleNodeLeave, handleNodeClick])

  return (
    <div 
      ref={containerRef} 
      className={`jarvis-graph-container ${isPrintMode ? 'print-mode' : ''}`}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <style>{`
        .jarvis-graph-container {
          background: ${colors.bg};
          border-radius: 12px;
          overflow: hidden;
        }
        
        .jarvis-graph-container.print-mode {
          background: #ffffff;
        }
        
        .graph-controls {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 100;
        }
        
        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: ${isPrintMode ? '#f3f4f6' : 'rgba(0, 240, 255, 0.1)'};
          border: 1px solid ${isPrintMode ? '#d1d5db' : 'rgba(0, 240, 255, 0.3)'};
          border-radius: 8px;
          color: ${isPrintMode ? '#374151' : '#00f0ff'};
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .control-btn:hover {
          background: ${isPrintMode ? '#e5e7eb' : 'rgba(0, 240, 255, 0.2)'};
        }
        
        .control-btn.active {
          background: ${isPrintMode ? '#0891b2' : 'rgba(0, 240, 255, 0.3)'};
          color: ${isPrintMode ? '#ffffff' : '#00f0ff'};
        }
        
        .node-tooltip {
          position: fixed;
          min-width: 220px;
          max-width: 300px;
          background: ${colors.cardBg};
          border: 1px solid ${colors.border};
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, ${isPrintMode ? '0.1' : '0.5'});
          z-index: 1000;
          overflow: hidden;
          font-size: 13px;
        }
        
        .node-tooltip.print-mode {
          background: #ffffff;
          border: 2px solid #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .node-tooltip.pinned {
          border-width: 2px;
        }
        
        .tooltip-actions {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          gap: 4px;
        }
        
        .tooltip-actions button {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: ${colors.textMuted};
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .tooltip-actions button:hover {
          background: ${isPrintMode ? '#f3f4f6' : 'rgba(255,255,255,0.1)'};
          color: ${colors.text};
        }
        
        .tooltip-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 15px;
          border-bottom: 2px solid;
          background: ${isPrintMode ? '#f9fafb' : 'rgba(0, 240, 255, 0.05)'};
        }
        
        .tooltip-icon {
          font-size: 18px;
        }
        
        .tooltip-type {
          font-weight: 600;
          color: ${colors.text};
        }
        
        .tooltip-body {
          padding: 12px 15px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .tooltip-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        
        .row-icon {
          font-size: 14px;
          flex-shrink: 0;
          width: 20px;
        }
        
        .row-value {
          color: ${colors.text};
          line-height: 1.4;
        }
        
        .row-value.address {
          font-size: 12px;
          color: ${colors.textMuted};
        }
        
        .row-value.sample-desc {
          font-size: 12px;
        }
        
        .tooltip-row.name .row-value {
          font-size: 15px;
          font-weight: 600;
        }
        
        .tooltip-row.case-number {
          padding-top: 8px;
          border-top: 1px solid ${colors.border};
          margin-top: 4px;
        }
        
        .tooltip-row.case-number .row-value {
          font-family: monospace;
          color: ${isPrintMode ? '#0891b2' : '#00f0ff'};
          font-weight: 600;
        }
        
        .tooltip-row.status {
          margin-top: 4px;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .status-badge.suspect {
          background: ${isPrintMode ? '#fef2f2' : 'rgba(255, 45, 85, 0.15)'};
          color: ${isPrintMode ? '#dc2626' : '#ff2d55'};
        }
        
        .status-badge.arrested {
          background: ${isPrintMode ? '#fff7ed' : 'rgba(255, 107, 53, 0.15)'};
          color: ${isPrintMode ? '#ea580c' : '#ff6b35'};
        }
        
        .status-badge.victim {
          background: ${isPrintMode ? '#faf5ff' : 'rgba(168, 85, 247, 0.15)'};
          color: ${isPrintMode ? '#7c3aed' : '#a855f7'};
        }
        
        .status-badge.reference {
          background: ${isPrintMode ? '#f0fdf4' : 'rgba(57, 255, 20, 0.15)'};
          color: ${isPrintMode ? '#16a34a' : '#39ff14'};
        }
        
        /* Legend */
        .graph-legend {
          position: absolute;
          bottom: 10px;
          left: 10px;
          background: ${colors.cardBg};
          border: 1px solid ${colors.border};
          border-radius: 10px;
          padding: 12px 15px;
          font-size: 12px;
          z-index: 100;
        }
        
        .legend-title {
          font-weight: 600;
          color: ${colors.text};
          margin-bottom: 8px;
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
          color: ${colors.textMuted};
        }
        
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid;
        }
        
        .legend-line {
          width: 20px;
          height: 2px;
        }
        
        /* Print styles */
        @media print {
          .graph-controls, .graph-legend {
            display: none !important;
          }
          
          .jarvis-graph-container {
            background: #ffffff !important;
          }
          
          .node-tooltip {
            position: absolute !important;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Controls */}
      <div className="graph-controls">
        <button 
          className={`control-btn ${showTooltips ? 'active' : ''}`}
          onClick={() => setShowTooltips(!showTooltips)}
          title={showTooltips ? 'ซ่อน Tooltips' : 'แสดง Tooltips'}
        >
          {showTooltips ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button 
          className={`control-btn ${isPrintMode ? 'active' : ''}`}
          onClick={() => setIsPrintMode(!isPrintMode)}
          title={isPrintMode ? 'โหมดปกติ' : 'โหมดพิมพ์'}
        >
          <Printer size={18} />
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
            setTooltips([])
            setHoveredNode(null)
          }}
          title="ล้าง Tooltips"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-title">สัญลักษณ์</div>
        <div className="legend-items">
          <div className="legend-item">
            <span style={{ fontSize: '14px' }}>📍</span>
            <span>คดีหลัก</span>
          </div>
          <div className="legend-item">
            <span style={{ fontSize: '14px' }}>📋</span>
            <span>คดีเชื่อมโยง</span>
          </div>
          <div className="legend-item">
            <span style={{ fontSize: '14px' }}>🔴</span>
            <span>ผู้ต้องสงสัย</span>
          </div>
          <div className="legend-item">
            <span style={{ fontSize: '14px' }}>🟠</span>
            <span>ผู้ถูกจับกุม</span>
          </div>
          <div className="legend-item">
            <span style={{ fontSize: '14px' }}>🟢</span>
            <span>อ้างอิง</span>
          </div>
          <div className="legend-item">
            <span style={{ fontSize: '14px' }}>🧬</span>
            <span>DNA/วัตถุพยาน</span>
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ background: isPrintMode ? '#dc2626' : '#ff2d55' }} />
            <span>DNA Match</span>
          </div>
          <div className="legend-item">
            <div className="legend-line" style={{ background: colors.cyan, opacity: 0.5 }} />
            <span>Found In</span>
          </div>
        </div>
      </div>

      {/* SVG Graph */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{ display: 'block' }}
      />

      {/* Hovered Tooltip */}
      {hoveredNode && showTooltips && (
        <NodeTooltip
          data={hoveredNode}
          onClose={() => setHoveredNode(null)}
          onPin={() => {
            setTooltips(prev => [...prev, { ...hoveredNode, pinned: true }])
            setHoveredNode(null)
          }}
          isPrintMode={isPrintMode}
        />
      )}

      {/* Pinned Tooltips */}
      {tooltips.map(tooltip => (
        <NodeTooltip
          key={tooltip.node.id}
          data={tooltip}
          onClose={() => closeTooltip(tooltip.node.id)}
          onPin={() => togglePin(tooltip.node.id)}
          isPrintMode={isPrintMode}
        />
      ))}
    </div>
  )
}
