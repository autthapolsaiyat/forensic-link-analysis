import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router-dom'
import { Users, FileText, Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { graphApi, personsApi, type GraphNode, type GraphEdge } from '../services/api'

export default function GraphView() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedPerson, setSelectedPerson] = useState<string | null>(id || null)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [zoom, setZoom] = useState(1)

  // Fetch multi-case persons for the list
  const { data: persons } = useQuery({
    queryKey: ['multi-case-persons-graph'],
    queryFn: () => personsApi.getMultiCase(2, 100),
  })

  // Fetch graph data for selected person
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['graph-person', selectedPerson],
    queryFn: () => graphApi.getPerson(selectedPerson!),
    enabled: !!selectedPerson,
  })

  // Filter persons by search
  const filteredPersons = useMemo(() => {
    if (!persons) return []
    if (!searchTerm) return persons
    const term = searchTerm.toLowerCase()
    return persons.filter(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        p.id_number.includes(term)
    )
  }, [persons, searchTerm])

  // Get center person from graph data
  const centerPerson = graphData?.nodes.find((n) => n.type === 'person')
  const caseNodes = graphData?.nodes.filter((n) => n.type === 'case') || []

  return (
    <div className="h-full flex">
      {/* Left Panel - Person List */}
      <div className="w-72 bg-dark-200 border-r border-dark-100 flex flex-col">
        <div className="p-4 border-b border-dark-100">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            บุคคลหลายคดี
          </h2>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-100" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เลขประจำตัว..."
              className="input w-full pl-10 py-2 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredPersons.map((person) => (
            <button
              key={person.person_id}
              onClick={() => setSelectedPerson(person.person_id)}
              className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                selectedPerson === person.person_id
                  ? 'bg-primary-500/20 border border-primary-500/50'
                  : 'hover:bg-dark-100/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{person.full_name}</p>
                  <p className="text-xs text-dark-100 font-mono">{person.id_number}</p>
                </div>
                <span className="text-xl font-bold text-primary-500 ml-2">
                  {person.case_count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative bg-dark-300 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : !selectedPerson ? (
          <div className="flex items-center justify-center h-full text-dark-100">
            <div className="text-center">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>เลือกบุคคลจากรายการด้านซ้าย</p>
            </div>
          </div>
        ) : graphData ? (
          <PersonCentricGraph
            centerPerson={centerPerson}
            caseNodes={caseNodes}
            edges={graphData.edges}
            zoom={zoom}
            onSelectNode={setSelectedNode}
            selectedNode={selectedNode}
          />
        ) : null}

        {/* Zoom Controls */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
            className="w-10 h-10 bg-dark-200 rounded-lg flex items-center justify-center hover:bg-dark-100 transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
            className="w-10 h-10 bg-dark-200 rounded-lg flex items-center justify-center hover:bg-dark-100 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="w-10 h-10 bg-dark-200 rounded-lg flex items-center justify-center hover:bg-dark-100 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Panel */}
        {graphData?.stats && (
          <div className="absolute top-4 right-4 bg-dark-200 rounded-xl p-4 border border-dark-100">
            <h3 className="text-sm font-semibold text-primary-500 mb-3">สถิติ</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-8">
                <span className="text-dark-100">คดีทั้งหมด:</span>
                <span className="font-bold">{graphData.stats.totalCases}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-dark-100">คดีร้ายแรง:</span>
                <span className="font-bold text-severity-severe">{graphData.stats.severeCases}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-dark-100">คดีทั่วไป:</span>
                <span className="font-bold text-severity-normal">{graphData.stats.normalCases}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Selected Node Details */}
      {selectedNode && (
        <div className="w-80 bg-dark-200 border-l border-dark-100 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">รายละเอียด</h3>
          
          {selectedNode.type === 'case' && (
            <div className="space-y-4">
              <div className="bg-dark-300 rounded-lg p-4">
                <p className="text-xs text-dark-100 mb-1">เลขคดี</p>
                <p className="font-mono font-semibold">{selectedNode.label}</p>
              </div>
              
              {selectedNode.data.title && (
                <div className="bg-dark-300 rounded-lg p-4">
                  <p className="text-xs text-dark-100 mb-1">ประเภทคดี</p>
                  <p className="font-medium">{selectedNode.data.title as string}</p>
                </div>
              )}
              
              {selectedNode.data.province && (
                <div className="bg-dark-300 rounded-lg p-4">
                  <p className="text-xs text-dark-100 mb-1">จังหวัด</p>
                  <p>{selectedNode.data.province as string}</p>
                </div>
              )}
              
              {selectedNode.data.station && (
                <div className="bg-dark-300 rounded-lg p-4">
                  <p className="text-xs text-dark-100 mb-1">หน่วยงาน</p>
                  <p>{selectedNode.data.station as string}</p>
                </div>
              )}
              
              {selectedNode.data.date && (
                <div className="bg-dark-300 rounded-lg p-4">
                  <p className="text-xs text-dark-100 mb-1">วันที่</p>
                  <p>{new Date(selectedNode.data.date as string).toLocaleDateString('th-TH')}</p>
                </div>
              )}
              
              {selectedNode.data.role && (
                <div className="bg-dark-300 rounded-lg p-4">
                  <p className="text-xs text-dark-100 mb-1">บทบาท</p>
                  <p className={`font-semibold ${
                    selectedNode.data.role === 'Suspect' ? 'text-severity-severe' :
                    selectedNode.data.role === 'Arrested' ? 'text-severity-medium' :
                    'text-primary-500'
                  }`}>
                    {selectedNode.data.role as string}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface PersonCentricGraphProps {
  centerPerson: GraphNode | undefined
  caseNodes: GraphNode[]
  edges: GraphEdge[]
  zoom: number
  onSelectNode: (node: GraphNode) => void
  selectedNode: GraphNode | null
}

function PersonCentricGraph({ centerPerson, caseNodes, edges, zoom, onSelectNode, selectedNode }: PersonCentricGraphProps) {
  const width = 800
  const height = 600
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) * 0.35

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Connection Lines */}
      {caseNodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / caseNodes.length - Math.PI / 2
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        return (
          <g key={`line-${node.id}`}>
            <line
              x1={centerX}
              y1={centerY}
              x2={x}
              y2={y}
              stroke="#415a77"
              strokeWidth="2"
              strokeDasharray="8 4"
              className="animate-dash"
            />
            <text
              x={(centerX + x) / 2}
              y={(centerY + y) / 2 - 10}
              fill="#778da9"
              fontSize="11"
              textAnchor="middle"
            >
              DNA ตรงกัน
            </text>
          </g>
        )
      })}

      {/* Case Nodes */}
      {caseNodes.map((node, i) => {
        const angle = (2 * Math.PI * i) / caseNodes.length - Math.PI / 2
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        const severity = node.data.severity as string
        const color = severity === 'severe' ? '#ef233c' : '#4895ef'
        const isSelected = selectedNode?.id === node.id
        const w = 160
        const h = 80

        return (
          <g
            key={node.id}
            transform={`translate(${x - w / 2}, ${y - h / 2})`}
            style={{ cursor: 'pointer' }}
            onClick={() => onSelectNode(node)}
          >
            <rect
              width={w}
              height={h}
              rx="10"
              fill={color}
              filter={isSelected ? 'url(#glow)' : undefined}
              stroke={isSelected ? 'white' : 'none'}
              strokeWidth={isSelected ? 2 : 0}
            />
            <text x={w / 2} y="24" fill="white" fontSize="12" fontWeight="600" textAnchor="middle">
              {((node.data.title as string) || '').substring(0, 14)}
              {((node.data.title as string) || '').length > 14 ? '...' : ''}
            </text>
            <text x={w / 2} y="42" fill="rgba(255,255,255,0.8)" fontSize="11" textAnchor="middle">
              {node.label}
            </text>
            <text x={w / 2} y="60" fill="rgba(255,255,255,0.7)" fontSize="10" textAnchor="middle">
              {node.data.province as string}
            </text>
            <text x={w / 2} y={h + 18} fill="#778da9" fontSize="11" textAnchor="middle">
              คดีที่ {i + 1}
            </text>
          </g>
        )
      })}

      {/* Center Person Node */}
      {centerPerson && (
        <g transform={`translate(${centerX}, ${centerY})`}>
          <circle
            r="80"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
            opacity="0.3"
            className="animate-pulse"
          />
          <circle
            r="70"
            fill="#1b263b"
            stroke="#00d4ff"
            strokeWidth="3"
            filter="url(#glow)"
          />
          <text y="-12" fill="#00d4ff" fontSize="14" fontWeight="600" textAnchor="middle">
            {centerPerson.label}
          </text>
          <text y="8" fill="#778da9" fontSize="11" textAnchor="middle" fontFamily="JetBrains Mono">
            {centerPerson.data.idNumber as string}
          </text>
          <text y="28" fill="#e0e1dd" fontSize="12" textAnchor="middle">
            จำนวนคดี: {caseNodes.length}
          </text>
        </g>
      )}
    </svg>
  )
}
