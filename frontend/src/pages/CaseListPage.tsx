// src/pages/CaseListPage.tsx
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Search, Filter, FileText, MapPin, Calendar, 
  ChevronLeft, ChevronRight, Link2, AlertTriangle,
  Eye, GitBranch, Download, SlidersHorizontal,
  CheckCircle, Clock, XCircle, Loader2
} from 'lucide-react'
import { casesApi } from '../services/api'

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    'มีการตรวจเก็บ': { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: <Clock className="w-3 h-3" /> },
    'ส่งข้อมูลสำเร็จ': { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: <CheckCircle className="w-3 h-3" /> },
    'ส่งข้อมูลเข้ากลุ่มงานแล้ว': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: <Loader2 className="w-3 h-3" /> },
    'ตรวจพิสูจน์เสร็จสิ้น': { bg: 'bg-green-500/20', text: 'text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
    'อยู่ระหว่างการดำเนินการตรวจพิสูจน์': { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    'ส่งข้อมูลไม่สำเร็จ': { bg: 'bg-red-500/20', text: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
    'พบความเชื่อมโยง': { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: <Link2 className="w-3 h-3" /> },
  }
  
  const { bg, text, icon } = config[status] || config['มีการตรวจเก็บ']
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon}
      {status}
    </span>
  )
}

// Link indicator
const LinkIndicator = ({ hasLink, linkCount }: { hasLink: boolean; linkCount: number }) => {
  if (!hasLink) return null
  return (
    <div className="flex items-center gap-1 text-purple-400">
      <Link2 className="w-4 h-4" />
      <span className="text-xs font-bold">{linkCount}</span>
    </div>
  )
}

export default function CaseListPage() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    province: '',
    case_type: '',
    from_date: '',
    to_date: '',
    has_links: false
  })
  const [showFilters, setShowFilters] = useState(false)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['cases', page, limit, filters],
    queryFn: () => casesApi.getAll({ 
      page, 
      limit,
      province: filters.province || undefined,
      case_type: filters.case_type || undefined,
      from_date: filters.from_date || undefined,
      to_date: filters.to_date || undefined,
    }),
  })

  // Province list for filter
  const provinces = ['ยะลา', 'ปัตตานี', 'นราธิวาส', 'สงขลา', 'สตูล']
  
  // Case types for filter
  const caseTypes = [
    'ฆ่าผู้อื่น', 'ยาเสพติด', 'ลักทรัพย์', 'ปล้นทรัพย์', 
    'ข่มขืน', 'ทำร้ายร่างกาย', 'วางเพลิง', 'อื่นๆ'
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-500" />
            รายการคดี
          </h1>
          <p className="text-dark-100 mt-1">
            ค้นหาและจัดการข้อมูลคดีทั้งหมดในระบบ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-100" />
            <input
              type="text"
              placeholder="ค้นหาเลขคดี, FIDS No., สถานที่เกิดเหตุ..."
              className="input w-full pl-12 py-3"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Toggle */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'ring-2 ring-primary-500' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            ตัวกรอง
            {Object.values(filters).some(v => v) && (
              <span className="w-5 h-5 bg-primary-500 text-dark-300 rounded-full text-xs flex items-center justify-center">
                {Object.values(filters).filter(v => v).length}
              </span>
            )}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-dark-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Province */}
            <div>
              <label className="block text-sm text-dark-100 mb-1">จังหวัด</label>
              <select
                value={filters.province}
                onChange={(e) => setFilters({ ...filters, province: e.target.value })}
                className="input w-full py-2"
              >
                <option value="">ทั้งหมด</option>
                {provinces.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Case Type */}
            <div>
              <label className="block text-sm text-dark-100 mb-1">ประเภทคดี</label>
              <select
                value={filters.case_type}
                onChange={(e) => setFilters({ ...filters, case_type: e.target.value })}
                className="input w-full py-2"
              >
                <option value="">ทั้งหมด</option>
                {caseTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm text-dark-100 mb-1">วันที่เริ่ม</label>
              <input
                type="date"
                value={filters.from_date}
                onChange={(e) => setFilters({ ...filters, from_date: e.target.value })}
                className="input w-full py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-dark-100 mb-1">วันที่สิ้นสุด</label>
              <input
                type="date"
                value={filters.to_date}
                onChange={(e) => setFilters({ ...filters, to_date: e.target.value })}
                className="input w-full py-2"
              />
            </div>

            {/* Has Links */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has_links"
                checked={filters.has_links}
                onChange={(e) => setFilters({ ...filters, has_links: e.target.checked })}
                className="w-4 h-4 rounded bg-dark-300 border-dark-100"
              />
              <label htmlFor="has_links" className="text-sm flex items-center gap-1">
                <Link2 className="w-4 h-4 text-purple-400" />
                เฉพาะคดีที่พบการเชื่อมโยง
              </label>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => setFilters({ province: '', case_type: '', from_date: '', to_date: '', has_links: false })}
              className="text-sm text-primary-500 hover:underline"
            >
              ล้างตัวกรอง
            </button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-dark-100">
        <span>พบ {data?.pagination?.total?.toLocaleString() || 0} รายการ</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            พบการเชื่อมโยง
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            ตรวจเสร็จ
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            กำลังตรวจ
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-dark-300 border-b border-dark-100">
                <th className="text-left p-4 font-semibold text-dark-100">FIDS No.</th>
                <th className="text-left p-4 font-semibold text-dark-100">Case No.</th>
                <th className="text-left p-4 font-semibold text-dark-100">เลขที่หนังสือนำส่ง</th>
                <th className="text-left p-4 font-semibold text-dark-100">วันที่รับ</th>
                <th className="text-left p-4 font-semibold text-dark-100">วันที่เกิดเหตุ</th>
                <th className="text-left p-4 font-semibold text-dark-100">สถานที่เกิดเหตุ</th>
                <th className="text-left p-4 font-semibold text-dark-100">จังหวัด</th>
                <th className="text-center p-4 font-semibold text-dark-100">Links</th>
                <th className="text-right p-4 font-semibold text-dark-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-dark-100">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      กำลังโหลด...
                    </div>
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-dark-100">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                data?.data?.map((caseItem: any) => (
                  <tr 
                    key={caseItem.case_id} 
                    className={`border-b border-dark-100/50 hover:bg-dark-100/20 transition-colors ${
                      caseItem.link_count > 0 ? 'bg-purple-500/5' : ''
                    }`}
                  >
                    <td className="p-4">
                      <span className="font-mono text-sm text-primary-500">
                        {caseItem.case_id?.replace('PFSC10_', '10-') || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-sm">{caseItem.case_number}</span>
                    </td>
                    <td className="p-4 text-sm text-dark-100">
                      {caseItem.document_number || '-'}
                    </td>
                    <td className="p-4 text-sm">
                      {caseItem.received_date ? new Date(caseItem.received_date).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="p-4 text-sm">
                      {caseItem.case_date ? new Date(caseItem.case_date).toLocaleDateString('th-TH') : '-'}
                    </td>
                    <td className="p-4">
                      <p className="text-sm truncate max-w-xs" title={caseItem.scene_address}>
                        {caseItem.scene_address || caseItem.case_type || '-'}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-dark-100" />
                        {caseItem.province || '-'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {caseItem.link_count > 0 ? (
                        <Link 
                          to={`/graph/case/${caseItem.case_id}`}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-bold hover:bg-purple-500/30 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          {caseItem.link_count}
                        </Link>
                      ) : (
                        <span className="text-dark-100">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/cases/${caseItem.case_id}`}
                          className="p-2 hover:bg-dark-100/30 rounded-lg transition-colors"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4 text-dark-100 hover:text-white" />
                        </Link>
                        <Link
                          to={`/graph/case/${caseItem.case_id}`}
                          className="p-2 hover:bg-dark-100/30 rounded-lg transition-colors"
                          title="ดู Graph"
                        >
                          <GitBranch className="w-4 h-4 text-dark-100 hover:text-primary-500" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between p-4 border-t border-dark-100 bg-dark-300">
            <p className="text-sm text-dark-100">
              แสดง {((page - 1) * limit) + 1} - {Math.min(page * limit, data.pagination.total)} จาก {data.pagination.total.toLocaleString()} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                  let pageNum
                  if (data.pagination.totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= data.pagination.totalPages - 2) {
                    pageNum = data.pagination.totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-lg font-mono text-sm transition-colors ${
                        page === pageNum 
                          ? 'bg-primary-500 text-dark-300' 
                          : 'bg-dark-200 hover:bg-dark-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              
              <button
                onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="p-2 bg-dark-200 rounded-lg hover:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
