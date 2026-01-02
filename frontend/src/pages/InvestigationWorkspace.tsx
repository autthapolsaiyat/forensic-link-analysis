// src/pages/InvestigationWorkspace.tsx
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Search, Plus, X, Link2, GitBranch, Users, FileText,
  Bookmark, BookmarkCheck, StickyNote, Download, Share2,
  ChevronRight, Calendar, MapPin, FlaskConical, AlertTriangle,
  Maximize2, Minimize2, Layers
} from 'lucide-react'
import { searchApi, casesApi, graphApi } from '../services/api'

interface WorkspaceCase {
  case_id: string
  case_number: string
  case_type: string
  province: string
  case_date: string
  sample_count?: number
  link_count?: number
  persons?: any[]
  links?: any[]
}

interface Note {
  id: string
  text: string
  created_at: Date
  case_id?: string
}

export default function InvestigationWorkspace() {
  const [selectedCases, setSelectedCases] = useState<WorkspaceCase[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [bookmarks, setBookmarks] = useState<string[]>([])
  const [showSearch, setShowSearch] = useState(true)
  const [compareMode, setCompareMode] = useState(false)

  // Search cases
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['workspace-search', searchTerm],
    queryFn: () => searchApi.search(searchTerm, 'cases'),
    enabled: searchTerm.length >= 2,
  })

  // Add case to workspace
  const addCase = useCallback(async (caseData: any) => {
    if (selectedCases.find(c => c.case_id === caseData.case_id)) return
    
    // Fetch additional details
    const [persons, links] = await Promise.all([
      casesApi.getPersons(caseData.case_id).catch(() => []),
      casesApi.getLinks(caseData.case_id).catch(() => []),
    ])

    setSelectedCases(prev => [...prev, {
      ...caseData,
      persons,
      links,
    }])
    setSearchTerm('')
  }, [selectedCases])

  // Remove case from workspace
  const removeCase = useCallback((caseId: string) => {
    setSelectedCases(prev => prev.filter(c => c.case_id !== caseId))
  }, [])

  // Add note
  const addNote = useCallback(() => {
    if (!newNote.trim()) return
    setNotes(prev => [...prev, {
      id: Date.now().toString(),
      text: newNote,
      created_at: new Date(),
    }])
    setNewNote('')
  }, [newNote])

  // Toggle bookmark
  const toggleBookmark = useCallback((caseId: string) => {
    setBookmarks(prev => 
      prev.includes(caseId) 
        ? prev.filter(id => id !== caseId)
        : [...prev, caseId]
    )
  }, [])

  // Find common links between selected cases
  const commonLinks = selectedCases.length >= 2
    ? selectedCases.reduce((acc, case1, i) => {
        selectedCases.slice(i + 1).forEach(case2 => {
          // Check if cases are linked
          const link = case1.links?.find(l => 
            l.case1_id === case2.case_id || l.case2_id === case2.case_id
          )
          if (link) {
            acc.push({
              case1: case1.case_number,
              case2: case2.case_number,
              link_type: link.link_type,
              strength: link.link_strength,
            })
          }
        })
        return acc
      }, [] as any[])
    : []

  // Find common persons
  const commonPersons = selectedCases.length >= 2
    ? selectedCases.reduce((acc, case1, i) => {
        selectedCases.slice(i + 1).forEach(case2 => {
          case1.persons?.forEach(p1 => {
            const match = case2.persons?.find(p2 => p2.id_number === p1.id_number)
            if (match && !acc.find(p => p.id_number === p1.id_number)) {
              acc.push({
                ...p1,
                cases: [case1.case_number, case2.case_number]
              })
            }
          })
        })
        return acc
      }, [] as any[])
    : []

  return (
    <div className="h-full flex">
      {/* Left Panel - Search & Add Cases */}
      <div className={`${showSearch ? 'w-80' : 'w-12'} bg-dark-200 border-r border-dark-100 flex flex-col transition-all`}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-3 hover:bg-dark-100 transition-colors border-b border-dark-100"
        >
          {showSearch ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {showSearch && (
          <>
            <div className="p-4 border-b border-dark-100">
              <h2 className="font-semibold flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-500" />
                Investigation Workspace
              </h2>
              <p className="text-xs text-dark-100 mt-1">ลากคดีมาเปรียบเทียบ</p>
            </div>

            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-100" />
                <input
                  type="text"
                  placeholder="ค้นหาคดี..."
                  className="input w-full pl-10 py-2 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {searching ? (
                <p className="text-center text-dark-100 py-4">กำลังค้นหา...</p>
              ) : searchResults?.data?.cases?.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.data.cases.map((c: any) => (
                    <button
                      key={c.case_id}
                      onClick={() => addCase(c)}
                      disabled={selectedCases.some(sc => sc.case_id === c.case_id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedCases.some(sc => sc.case_id === c.case_id)
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
              ) : searchTerm.length >= 2 ? (
                <p className="text-center text-dark-100 py-4">ไม่พบผลลัพธ์</p>
              ) : (
                <p className="text-center text-dark-100 py-4 text-sm">
                  พิมพ์อย่างน้อย 2 ตัวอักษร
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-dark-200 border-b border-dark-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-dark-100">
              คดีที่เลือก: <span className="text-white font-bold">{selectedCases.length}</span>
            </span>
            {selectedCases.length >= 2 && (
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                  compareMode ? 'bg-primary-500 text-dark-300' : 'bg-dark-100'
                }`}
              >
                โหมดเปรียบเทียบ
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary text-sm flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
            <button className="btn-secondary text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {selectedCases.length === 0 ? (
            <div className="h-full flex items-center justify-center text-dark-100">
              <div className="text-center">
                <Layers className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">เริ่มต้นการสืบสวน</p>
                <p className="text-sm mt-2">ค้นหาและเพิ่มคดีจากด้านซ้าย</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Common Findings Alert */}
              {(commonLinks.length > 0 || commonPersons.length > 0) && (
                <div className="card border-purple-500/50 bg-purple-500/10">
                  <h3 className="font-semibold text-purple-400 flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5" />
                    พบความเชื่อมโยง!
                  </h3>
                  
                  {commonLinks.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-dark-100 mb-2">DNA/ID Links:</p>
                      <div className="space-y-2">
                        {commonLinks.map((link, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm bg-dark-300 p-2 rounded">
                            <span className="font-mono">{link.case1}</span>
                            <Link2 className="w-4 h-4 text-purple-400" />
                            <span className="font-mono">{link.case2}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              link.link_type === 'DNA_MATCH' ? 'bg-red-500/20 text-red-400' : 'bg-primary-500/20 text-primary-500'
                            }`}>
                              {link.link_type === 'DNA_MATCH' ? 'DNA Match' : 'ID Match'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {commonPersons.length > 0 && (
                    <div>
                      <p className="text-sm text-dark-100 mb-2">บุคคลที่ปรากฏในหลายคดี:</p>
                      <div className="space-y-2">
                        {commonPersons.map((person, i) => (
                          <Link
                            key={i}
                            to={`/graph/person/${person.person_id}`}
                            className="flex items-center justify-between p-2 bg-dark-300 rounded hover:bg-dark-100/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium">{person.full_name}</p>
                              <p className="text-xs font-mono text-dark-100">{person.id_number}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-dark-100">
                                พบใน: {person.cases.join(', ')}
                              </span>
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Case Cards */}
              <div className={`grid gap-4 ${
                compareMode 
                  ? 'grid-cols-1 lg:grid-cols-2' 
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {selectedCases.map(caseData => (
                  <CaseCard
                    key={caseData.case_id}
                    caseData={caseData}
                    onRemove={() => removeCase(caseData.case_id)}
                    isBookmarked={bookmarks.includes(caseData.case_id)}
                    onToggleBookmark={() => toggleBookmark(caseData.case_id)}
                    expanded={compareMode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes Panel */}
        <div className="bg-dark-200 border-t border-dark-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium">บันทึกการสืบสวน</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="เพิ่มบันทึก..."
              className="input flex-1 py-2 text-sm"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNote()}
            />
            <button onClick={addNote} className="btn-primary px-4">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {notes.length > 0 && (
            <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
              {notes.map(note => (
                <div key={note.id} className="flex items-start gap-2 text-sm bg-dark-300 p-2 rounded">
                  <span className="flex-1">{note.text}</span>
                  <span className="text-xs text-dark-100 whitespace-nowrap">
                    {note.created_at.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button 
                    onClick={() => setNotes(prev => prev.filter(n => n.id !== note.id))}
                    className="text-dark-100 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Case Card Component
function CaseCard({ 
  caseData, 
  onRemove, 
  isBookmarked, 
  onToggleBookmark,
  expanded 
}: { 
  caseData: WorkspaceCase
  onRemove: () => void
  isBookmarked: boolean
  onToggleBookmark: () => void
  expanded: boolean
}) {
  return (
    <div className={`card ${caseData.links && caseData.links.length > 0 ? 'border-purple-500/30' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono font-semibold">{caseData.case_number}</p>
          <p className="text-sm text-dark-100">{caseData.case_type}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleBookmark}
            className="p-1 hover:bg-dark-100 rounded transition-colors"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-primary-500" />
            ) : (
              <Bookmark className="w-4 h-4 text-dark-100" />
            )}
          </button>
          <button
            onClick={onRemove}
            className="p-1 hover:bg-dark-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-dark-100 hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-dark-100">
          <MapPin className="w-4 h-4" />
          {caseData.province}
        </div>
        <div className="flex items-center gap-2 text-dark-100">
          <Calendar className="w-4 h-4" />
          {caseData.case_date ? new Date(caseData.case_date).toLocaleDateString('th-TH') : '-'}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-dark-100">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4 text-dark-100" />
          <span className="text-sm">{caseData.persons?.length || 0}</span>
        </div>
        <div className="flex items-center gap-1">
          <FlaskConical className="w-4 h-4 text-dark-100" />
          <span className="text-sm">{caseData.sample_count || 0}</span>
        </div>
        {caseData.links && caseData.links.length > 0 && (
          <div className="flex items-center gap-1 text-purple-400">
            <Link2 className="w-4 h-4" />
            <span className="text-sm font-bold">{caseData.links.length}</span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && caseData.persons && caseData.persons.length > 0 && (
        <div className="mt-4 pt-4 border-t border-dark-100">
          <p className="text-xs text-dark-100 mb-2">บุคคลที่เกี่ยวข้อง:</p>
          <div className="space-y-1">
            {caseData.persons.slice(0, 5).map((p: any) => (
              <div key={p.person_id} className="flex items-center justify-between text-sm">
                <span>{p.full_name}</span>
                <span className={`text-xs px-1 rounded ${
                  p.role === 'Suspect' ? 'bg-red-500/20 text-red-400' : 'bg-dark-100 text-dark-100'
                }`}>
                  {p.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <Link
          to={`/cases/${caseData.case_id}`}
          className="flex-1 btn-secondary text-sm text-center"
        >
          รายละเอียด
        </Link>
        <Link
          to={`/graph/case/${caseData.case_id}`}
          className="flex-1 btn-primary text-sm text-center flex items-center justify-center gap-1"
        >
          <GitBranch className="w-4 h-4" />
          Graph
        </Link>
      </div>
    </div>
  )
}
