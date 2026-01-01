import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link2, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { linksApi } from '../services/api'

export default function LinksPage() {
  const [page, setPage] = useState(1)
  const [linkType, setLinkType] = useState<string>('')
  const [minStrength, setMinStrength] = useState(0)
  const limit = 20

  const { data, isLoading } = useQuery({
    queryKey: ['links', page, limit, linkType, minStrength],
    queryFn: () =>
      linksApi.getAll({
        page,
        limit,
        link_type: linkType || undefined,
        min_strength: minStrength || undefined,
      }),
  })

  const { data: linkTypes } = useQuery({
    queryKey: ['link-types'],
    queryFn: linksApi.getTypes,
  })

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary-500" />
            Case Links
          </h1>
          <p className="text-dark-100 mt-1">
            ความเชื่อมโยงระหว่างคดี (DNA Match, ID Number, Evidence)
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-500">{data?.pagination?.total || 0}</p>
          <p className="text-sm text-dark-100">Links ทั้งหมด</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-dark-100" />
            <span className="text-sm text-dark-100">ตัวกรอง:</span>
          </div>
          
          <select
            value={linkType}
            onChange={(e) => { setLinkType(e.target.value); setPage(1); }}
            className="input py-2"
          >
            <option value="">ทุกประเภท</option>
            <option value="DNA_MATCH">DNA Match</option>
            <option value="ID_NUMBER">ID Number</option>
            <option value="EVIDENCE">Evidence</option>
          </select>
          
          <select
            value={minStrength}
            onChange={(e) => { setMinStrength(Number(e.target.value)); setPage(1); }}
            className="input py-2"
          >
            <option value="0">ทุก Strength</option>
            <option value="0.5">&ge; 50%</option>
            <option value="0.7">&ge; 70%</option>
            <option value="0.9">&ge; 90%</option>
            <option value="1">100% เท่านั้น</option>
          </select>
        </div>
      </div>

      {/* Link Type Summary */}
      {linkTypes && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {linkTypes.map((lt: { link_type: string; count: number; avg_strength: number }) => (
            <div
              key={lt.link_type}
              className={`card cursor-pointer transition-colors ${
                linkType === lt.link_type ? 'ring-2 ring-primary-500' : ''
              }`}
              onClick={() => { setLinkType(lt.link_type === linkType ? '' : lt.link_type); setPage(1); }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-100">{lt.link_type}</p>
                  <p className="text-2xl font-bold font-mono text-primary-500">{lt.count}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  lt.link_type === 'DNA_MATCH' ? 'bg-severity-severe' :
                  lt.link_type === 'ID_NUMBER' ? 'bg-primary-500' :
                  'bg-severity-normal'
                }`} />
              </div>
              <p className="text-xs text-dark-100 mt-2">
                Avg: {Math.round(lt.avg_strength * 100)}%
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-100">
                <th className="text-left p-4 font-semibold text-dark-100">คดี 1</th>
                <th className="text-center p-4 font-semibold text-dark-100">Link</th>
                <th className="text-left p-4 font-semibold text-dark-100">คดี 2</th>
                <th className="text-center p-4 font-semibold text-dark-100">Strength</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-dark-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500 mx-auto"></div>
                  </td>
                </tr>
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-dark-100">
                    ไม่พบข้อมูล
                  </td>
                </tr>
              ) : (
                data?.data?.map((link) => (
                  <tr key={link.link_id} className="border-b border-dark-100/50 hover:bg-dark-100/20">
                    <td className="p-4">
                      <p className="font-mono text-sm">{link.case1_number}</p>
                      <p className="text-xs text-dark-100 mt-1">{link.case1_type}</p>
                      <p className="text-xs text-dark-100">{link.case1_province}</p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        link.link_type === 'DNA_MATCH' ? 'bg-severity-severe/20 text-severity-severe' :
                        link.link_type === 'ID_NUMBER' ? 'bg-primary-500/20 text-primary-500' :
                        'bg-severity-normal/20 text-severity-normal'
                      }`}>
                        <Link2 className="w-4 h-4" />
                        {link.link_type === 'DNA_MATCH' ? 'DNA' : link.link_type === 'ID_NUMBER' ? 'ID' : 'EVI'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-mono text-sm">{link.case2_number}</p>
                      <p className="text-xs text-dark-100 mt-1">{link.case2_type}</p>
                      <p className="text-xs text-dark-100">{link.case2_province}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center">
                        <div className="w-16 h-2 bg-dark-300 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              link.link_strength >= 0.9 ? 'bg-severity-severe' :
                              link.link_strength >= 0.7 ? 'bg-severity-medium' :
                              'bg-primary-500'
                            }`}
                            style={{ width: `${link.link_strength * 100}%` }}
                          />
                        </div>
                        <span className="ml-2 font-mono text-sm">{Math.round(link.link_strength * 100)}%</span>
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
