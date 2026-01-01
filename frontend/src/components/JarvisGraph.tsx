// src/components/JarvisGraph.tsx
// JARVIS-style Holographic Network Graph using D3.js

import { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'

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

// JARVIS Color Palette
const COLORS = {
  cyan: '#00f0ff',
  cyanDim: '#00a8b3',
  cyanGlow: 'rgba(0, 240, 255, 0.6)',
  gold: '#ffd700',
  red: '#ff2d55',
  orange: '#ff6b35',
  green: '#39ff14',
  purple: '#a855f7',
  blue: '#4895ef',
  bg: '#0a0e14',
}

// Get node color based on type and role
const getNodeColor = (node: GraphNode) => {
  if (node.type === 'case') {
    return node.isCenter ? COLORS.cyan : COLORS.purple
  }
  if (node.type === 'person') {
    if (node.role === 'Suspect') return COLORS.red
    if (node.role === 'Arrested') return COLORS.orange
    return COLORS.green
  }
  if (node.type === 'sample') return COLORS.blue
  if (node.type === 'cluster') return COLORS.purple
  return COLORS.cyan
}

// Get node size based on type
const getNodeSize = (node: GraphNode) => {
  if (node.isCenter) return 45
  if (node.type === 'case') return 35
  if (node.type === 'person') return 32
  if (node.type === 'sample') return 25
  if (node.type === 'cluster') return 40
  return 30
}

export default function JarvisGraph({ 
  nodes, 
  edges, 
  onNodeClick,
  width = 800,
  height = 600 
}: JarvisGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width, height })
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)

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

  // Main D3 rendering
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    // Clear previous content
    svg.selectAll('*').remove()

    // Create defs for filters and gradients
    const defs = svg.append('defs')

    // Glow filter
    const glowFilter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')
    
    glowFilter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur')
    
    const glowMerge = glowFilter.append('feMerge')
    glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
    glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Strong glow filter for center node
    const strongGlow = defs.append('filter')
      .attr('id', 'strongGlow')
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%')
    
    strongGlow.append('feGaussianBlur')
      .attr('stdDeviation', '8')
      .attr('result', 'coloredBlur')
    
    const strongMerge = strongGlow.append('feMerge')
    strongMerge.append('feMergeNode').attr('in', 'coloredBlur')
    strongMerge.append('feMergeNode').attr('in', 'coloredBlur')
    strongMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Radar sweep gradient
    const radarGradient = defs.append('radialGradient')
      .attr('id', 'radarGradient')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%')
    
    radarGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', COLORS.cyan)
      .attr('stop-opacity', '0.1')
    
    radarGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', COLORS.cyan)
      .attr('stop-opacity', '0')

    // Edge gradient
    const edgeGradient = defs.append('linearGradient')
      .attr('id', 'edgeGradient')
      .attr('gradientUnits', 'userSpaceOnUse')
    
    edgeGradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', COLORS.cyan)
      .attr('stop-opacity', '0.8')
    
    edgeGradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', COLORS.purple)
      .attr('stop-opacity', '0.8')

    // Arrow markers
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', COLORS.cyan)
      .attr('fill-opacity', 0.6)

    // Main container group with zoom
    const g = svg.append('g')

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Background radar circles
    const radarGroup = g.append('g').attr('class', 'radar')
    
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) / 2 - 50

    // Concentric circles
    ;[0.25, 0.5, 0.75, 1].forEach((ratio, i) => {
      radarGroup.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', maxRadius * ratio)
        .attr('fill', 'none')
        .attr('stroke', COLORS.cyan)
        .attr('stroke-opacity', 0.1 - i * 0.02)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', i === 3 ? '5,5' : 'none')
    })

    // Radar sweep
    const sweepArc = d3.arc<any>()
      .innerRadius(0)
      .outerRadius(maxRadius)
      .startAngle(0)
      .endAngle(Math.PI / 6)

    const radarSweep = radarGroup.append('path')
      .attr('d', sweepArc as any)
      .attr('transform', `translate(${centerX}, ${centerY})`)
      .attr('fill', 'url(#radarGradient)')
      .attr('opacity', 0.5)

    // Animate radar sweep
    const animateSweep = () => {
      radarSweep
        .transition()
        .duration(4000)
        .ease(d3.easeLinear)
        .attrTween('transform', () => {
          return (t: number) => `translate(${centerX}, ${centerY}) rotate(${t * 360})`
        })
        .on('end', animateSweep)
    }
    animateSweep()

    // Cross lines
    radarGroup.append('line')
      .attr('x1', centerX - maxRadius)
      .attr('y1', centerY)
      .attr('x2', centerX + maxRadius)
      .attr('y2', centerY)
      .attr('stroke', COLORS.cyan)
      .attr('stroke-opacity', 0.08)
      .attr('stroke-width', 1)

    radarGroup.append('line')
      .attr('x1', centerX)
      .attr('y1', centerY - maxRadius)
      .attr('x2', centerX)
      .attr('y2', centerY + maxRadius)
      .attr('stroke', COLORS.cyan)
      .attr('stroke-opacity', 0.08)
      .attr('stroke-width', 1)

    // Prepare data for simulation
    const nodeData: GraphNode[] = nodes.map(n => ({ ...n }))
    const edgeData: GraphEdge[] = edges.map(e => ({ ...e }))

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodeData)
      .force('link', d3.forceLink<GraphNode, GraphEdge>(edgeData)
        .id(d => d.id)
        .distance(120)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(50))

    simulationRef.current = simulation

    // Edge group
    const edgeGroup = g.append('g').attr('class', 'edges')

    // Create edges with animated particles
    const edgeLines = edgeGroup.selectAll('line')
      .data(edgeData)
      .enter()
      .append('line')
      .attr('stroke', d => {
        if (d.type === 'dna_match') return COLORS.red
        if (d.type === 'found_in') return COLORS.purple
        return COLORS.cyan
      })
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', d => d.type === 'dna_match' ? 2.5 : 1.5)
      .attr('stroke-dasharray', d => d.type === 'found_in' ? '8,4' : 'none')
      .attr('marker-end', 'url(#arrowhead)')
      .attr('filter', 'url(#glow)')

    // Animated particles on edges
    const particleGroup = g.append('g').attr('class', 'particles')

    edgeData.forEach((edge, i) => {
      const particle = particleGroup.append('circle')
        .attr('r', 3)
        .attr('fill', COLORS.cyan)
        .attr('filter', 'url(#glow)')
        .attr('opacity', 0)

      const animateParticle = () => {
        const source = edge.source as GraphNode
        const target = edge.target as GraphNode
        
        if (!source.x || !source.y || !target.x || !target.y) return

        particle
          .attr('cx', source.x)
          .attr('cy', source.y)
          .attr('opacity', 0.8)
          .transition()
          .duration(1500 + Math.random() * 1000)
          .ease(d3.easeLinear)
          .attr('cx', target.x)
          .attr('cy', target.y)
          .attr('opacity', 0)
          .on('end', () => {
            setTimeout(animateParticle, Math.random() * 3000)
          })
      }

      setTimeout(animateParticle, Math.random() * 2000)
    })

    // Node group
    const nodeGroup = g.append('g').attr('class', 'nodes')

    // Create node groups
    const nodeElements = nodeGroup.selectAll('g.node')
      .data(nodeData)
      .enter()
      .append('g')
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
        })
      )
      .on('click', (event, d) => {
        event.stopPropagation()
        onNodeClick?.(d)
      })

    // Outer ring (for center node or special nodes)
    nodeElements.filter(d => d.isCenter)
      .append('circle')
      .attr('r', d => getNodeSize(d) + 15)
      .attr('fill', 'none')
      .attr('stroke', COLORS.cyan)
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .each(function() {
        const circle = d3.select(this)
        const animate = () => {
          circle
            .transition()
            .duration(10000)
            .ease(d3.easeLinear)
            .attrTween('stroke-dashoffset', () => (t: number) => String(t * 100))
            .on('end', animate)
        }
        animate()
      })

    // Second outer ring for center
    nodeElements.filter(d => d.isCenter)
      .append('circle')
      .attr('r', d => getNodeSize(d) + 25)
      .attr('fill', 'none')
      .attr('stroke', COLORS.cyan)
      .attr('stroke-opacity', 0.15)
      .attr('stroke-width', 1)

    // Pulsing background glow
    nodeElements.append('circle')
      .attr('class', 'pulse-ring')
      .attr('r', d => getNodeSize(d) + 5)
      .attr('fill', d => getNodeColor(d))
      .attr('fill-opacity', 0.15)
      .attr('filter', 'url(#glow)')

    // Main node circle
    nodeElements.append('circle')
      .attr('class', 'node-main')
      .attr('r', d => getNodeSize(d))
      .attr('fill', COLORS.bg)
      .attr('stroke', d => getNodeColor(d))
      .attr('stroke-width', 2.5)
      .attr('filter', d => d.isCenter ? 'url(#strongGlow)' : 'url(#glow)')

    // Inner filled circle
    nodeElements.append('circle')
      .attr('r', d => getNodeSize(d) - 8)
      .attr('fill', d => getNodeColor(d))
      .attr('fill-opacity', 0.2)

    // Icon based on type
    nodeElements.each(function(d) {
      const group = d3.select(this)
      const color = getNodeColor(d)
      const size = getNodeSize(d) * 0.5

      if (d.type === 'case') {
        // Folder icon
        group.append('path')
          .attr('d', `M${-size} ${-size/2} L${-size/2} ${-size} L${size} ${-size} L${size} ${size} L${-size} ${size} Z`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('filter', 'url(#glow)')
        
        group.append('line')
          .attr('x1', -size * 0.6)
          .attr('y1', 0)
          .attr('x2', size * 0.6)
          .attr('y2', 0)
          .attr('stroke', color)
          .attr('stroke-width', 1)
        
        group.append('line')
          .attr('x1', -size * 0.6)
          .attr('y1', size * 0.4)
          .attr('x2', size * 0.3)
          .attr('y2', size * 0.4)
          .attr('stroke', color)
          .attr('stroke-width', 1)
      } else if (d.type === 'person') {
        // Person icon
        group.append('circle')
          .attr('cy', -size * 0.3)
          .attr('r', size * 0.35)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
        
        group.append('path')
          .attr('d', `M${-size * 0.6} ${size * 0.6} Q${-size * 0.6} ${size * 0.1} 0 ${size * 0.1} Q${size * 0.6} ${size * 0.1} ${size * 0.6} ${size * 0.6}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)

        // Role indicator
        if (d.role === 'Suspect') {
          group.append('text')
            .attr('x', size * 0.8)
            .attr('y', -size * 0.5)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', COLORS.red)
            .text('!')
        } else if (d.role === 'Arrested') {
          group.append('circle')
            .attr('cx', size * 0.8)
            .attr('cy', -size * 0.5)
            .attr('r', 4)
            .attr('fill', COLORS.orange)
        }
      } else if (d.type === 'sample' || d.type === 'dna') {
        // DNA Double Helix icon
        const h = size * 0.9
        
        // Left strand
        group.append('path')
          .attr('d', `M${-size * 0.4} ${-h} 
                      Q${size * 0.3} ${-h * 0.5} ${-size * 0.4} 0 
                      Q${size * 0.3} ${h * 0.5} ${-size * 0.4} ${h}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('filter', 'url(#glow)')
        
        // Right strand
        group.append('path')
          .attr('d', `M${size * 0.4} ${-h} 
                      Q${-size * 0.3} ${-h * 0.5} ${size * 0.4} 0 
                      Q${-size * 0.3} ${h * 0.5} ${size * 0.4} ${h}`)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 2)
          .attr('filter', 'url(#glow)')
        
        // Connecting bars (base pairs)
        const bars = [-0.6, -0.2, 0.2, 0.6]
        bars.forEach(y => {
          group.append('line')
            .attr('x1', -size * 0.25)
            .attr('y1', h * y)
            .attr('x2', size * 0.25)
            .attr('y2', h * y)
            .attr('stroke', color)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 1.5)
        })
      }
    })

    // Labels
    nodeElements.append('text')
      .attr('class', 'node-label')
      .attr('y', d => getNodeSize(d) + 18)
      .attr('text-anchor', 'middle')
      .attr('fill', '#e0e1dd')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .style('text-shadow', `0 0 10px ${COLORS.bg}`)
      .text(d => {
        const label = d.label || d.id
        return label.length > 15 ? label.substring(0, 15) + '...' : label
      })

    // Pulse animation for nodes
    const pulseAnimation = () => {
      nodeElements.selectAll('.pulse-ring')
        .transition()
        .duration(2000)
        .attr('r', (d: any) => getNodeSize(d) + 10)
        .attr('fill-opacity', 0.05)
        .transition()
        .duration(2000)
        .attr('r', (d: any) => getNodeSize(d) + 5)
        .attr('fill-opacity', 0.15)
        .on('end', pulseAnimation)
    }
    pulseAnimation()

    // Update positions on simulation tick
    simulation.on('tick', () => {
      edgeLines
        .attr('x1', d => (d.source as GraphNode).x || 0)
        .attr('y1', d => (d.source as GraphNode).y || 0)
        .attr('x2', d => (d.target as GraphNode).x || 0)
        .attr('y2', d => (d.target as GraphNode).y || 0)

      nodeElements
        .attr('transform', d => `translate(${d.x || 0}, ${d.y || 0})`)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [nodes, edges, dimensions, onNodeClick])

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="bg-transparent"
      />
      
      {/* HUD Corner Decorations */}
      <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-cyan-400/40" />
      <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-cyan-400/40" />
      <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-cyan-400/40" />
      <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-cyan-400/40" />
      
      {/* Status indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-xs text-cyan-400/60">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span>SCANNING</span>
      </div>
    </div>
  )
}
