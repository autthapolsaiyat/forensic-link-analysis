import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, Search, Eye, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react'
import { personsApi } from '../services/api'

export default function PersonsPage() {
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['persons', page, limit],
    queryFn: () => personsApi.getAll({ page, limit, multi_case_only: true }),
  })

  const { data: multiCasePersons } = useQuery({
    queryKey: ['multi-case-persons-all'],
    queryFn: () => personsApi.getMultiCase(2, 200),
  })

  // Filter by search
  const displayPersons = searchTerm && multiCasePersons
    ? multiCasePersons.filter(
        (p) =>
          p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.id_number.includes(searchTerm)
      )
    : data?.data || []

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary-500" />
            บุคคลที่ปรากฏหลายคดี
          </h1>
          <p className="text-dark-100 mt-1">
            รายชื่อบุคคลที่ DNA หรือเลขประจำตัวปรากฏในหลายคดี
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-500">{data?.pagination?.total || multiCasePersons?.length || 0}</p>
          <p className="text-sm text-dark-100">คนทั้งหมด</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-100" />
          <input
            type="text"
            placeholder="ค้นหาชื่อ, เลขประจำตัว..."
            className="input w-full pl-12 py-3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-100">
                <th className="text-left p-4 font-semibold text-dark-100">ชื่อ-นามสกุล</th>
                <th className="text-left p-4 font-semibold text-dark-100">เลขประจำตัว</th>
                <th className="text-left p-4 font-semibold text-dark-100">ประเภท</th>
                <th className="text-center p-4 font-semibold text-dark-100">จำนวนคดี</th>
                <th className="text-right p-4 font-semibold text-dark-100">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-dark-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500 mx-auto"></div>
                  </td>
                </tr>
              ) : displayPersons.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-dark-100">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                displayPersons.map((person) => (
                  <tr key={person.person_id} className="border-b border-dark-100/50 hover:bg-dark-100/20">
                    <td className="p-4">
                      <p className="font-medium">{person.full_name}</p>
                    </td>
                    <td className="p-4">
                      <code className="text-sm font-mono bg-dark-300 px-2 py-1 rounded">
                        {person.id_number}
                      </code>
                    </td>
                    <td className="p-4">
                      <span className={`text-sm px-2 py-1 rounded ${
                        person.person_type === 'Suspect' ? 'bg-severity-severe/20 text-severity-severe' :
                        person.person_type === 'Arrested' ? 'bg-severity-medium/20 text-severity-medium' :
                        'bg-primary-500/20 text-primary-500'
                      }`}>
                        {person.person_type}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-2xl font-bold text-primary-500">{person.case_count}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/graph/person/${person.person_id}`}
                          className="p-2 bg-primary-500/20 text-primary-500 rounded-lg hover:bg-primary-500/30 transition-colors"
                          title="ดู Graph"
                        >
                          <GitBranch className="w-4 h-4" />
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
        {data?.pagination && !searchTerm && (
          <div className="flex items-center justify-between p-4 border-t border-dark-100">
            <p className="text-sm text-dark-100">
              แสดง {(page - 1) * limit + 1} - {Math.min(page * limit, data.pagination.total)} จาก {data.pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 bg-dark-300 rounded-lg hover:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 bg-dark-300 rounded-lg font-mono">
                {page} / {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                disabled={page === data.pagination.totalPages}
                className="p-2 bg-dark-300 rounded-lg hover:bg-dark-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
