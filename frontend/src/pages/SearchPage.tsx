import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, FileText, Users, FlaskConical, GitBranch } from 'lucide-react'
import { searchApi } from '../services/api'

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'cases' | 'persons' | 'samples'>('all')
  const [debouncedTerm, setDebouncedTerm] = useState('')

  // Debounce search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    const timeout = setTimeout(() => {
      if (term.length >= 2) {
        setDebouncedTerm(term)
      } else {
        setDebouncedTerm('')
      }
    }, 300)
    return () => clearTimeout(timeout)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['search', debouncedTerm, searchType],
    queryFn: () => searchApi.search(debouncedTerm, searchType),
    enabled: debouncedTerm.length >= 2,
  })

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6 text-primary-500" />
          ค้นหา
        </h1>
        <p className="text-dark-100 mt-1">
          ค้นหาคดี, บุคคล, หรือตัวอย่าง
        </p>
      </div>

      {/* Search Box */}
      <div className="card mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-100" />
            <input
              type="text"
              placeholder="ค้นหาเลขคดี, ชื่อ, เลขประจำตัว, Lab Number..."
              className="input w-full pl-12 py-3 text-lg"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              autoFocus
            />
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as typeof searchType)}
            className="input py-3 min-w-[150px]"
          >
            <option value="all">ทั้งหมด</option>
            <option value="cases">คดี</option>
            <option value="persons">บุคคล</option>
            <option value="samples">ตัวอย่าง</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
        </div>
      ) : debouncedTerm.length < 2 ? (
        <div className="text-center py-12 text-dark-100">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>พิมพ์อย่างน้อย 2 ตัวอักษรเพื่อค้นหา</p>
        </div>
      ) : data?.counts?.total === 0 ? (
        <div className="text-center py-12 text-dark-100">
          <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>ไม่พบผลลัพธ์สำหรับ "{debouncedTerm}"</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="flex items-center gap-4 text-sm text-dark-100">
            <span>พบ {data?.counts?.total} รายการ:</span>
            {data?.counts?.cases > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" /> {data.counts.cases} คดี
              </span>
            )}
            {data?.counts?.persons > 0 && (
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {data.counts.persons} บุคคล
              </span>
            )}
            {data?.counts?.samples > 0 && (
              <span className="flex items-center gap-1">
                <FlaskConical className="w-4 h-4" /> {data.counts.samples} ตัวอย่าง
              </span>
            )}
          </div>

          {/* Cases Results */}
          {data?.data?.cases?.length > 0 && (searchType === 'all' || searchType === 'cases') && (
            <div className="card">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-primary-500" />
                คดี ({data.data.cases.length})
              </h3>
              <div className="space-y-2">
                {data.data.cases.map((c: { case_id: string; case_number: string; case_type: string; province: string; case_date: string }) => (
                  <Link
                    key={c.case_id}
                    to={`/graph/case/${c.case_id}`}
                    className="flex items-center justify-between p-4 bg-dark-300 rounded-lg hover:bg-dark-100/30 transition-colors"
                  >
                    <div>
                      <p className="font-mono font-semibold">{c.case_number}</p>
                      <p className="text-sm text-dark-100">{c.case_type}</p>
                      <p className="text-xs text-dark-100 mt-1">{c.province} • {new Date(c.case_date).toLocaleDateString('th-TH')}</p>
                    </div>
                    <GitBranch className="w-5 h-5 text-primary-500" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Persons Results */}
          {data?.data?.persons?.length > 0 && (searchType === 'all' || searchType === 'persons') && (
            <div className="card">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary-500" />
                บุคคล ({data.data.persons.length})
              </h3>
              <div className="space-y-2">
                {data.data.persons.map((p: { person_id: string; id_number: string; full_name: string; person_type: string; case_count: number }) => (
                  <Link
                    key={p.person_id}
                    to={`/graph/person/${p.person_id}`}
                    className="flex items-center justify-between p-4 bg-dark-300 rounded-lg hover:bg-dark-100/30 transition-colors"
                  >
                    <div>
                      <p className="font-semibold">{p.full_name}</p>
                      <p className="text-sm font-mono text-dark-100">{p.id_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                        p.person_type === 'Suspect' ? 'bg-severity-severe/20 text-severity-severe' :
                        p.person_type === 'Arrested' ? 'bg-severity-medium/20 text-severity-medium' :
                        'bg-primary-500/20 text-primary-500'
                      }`}>
                        {p.person_type}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-primary-500">{p.case_count}</span>
                      <p className="text-xs text-dark-100">คดี</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Samples Results */}
          {data?.data?.samples?.length > 0 && (searchType === 'all' || searchType === 'samples') && (
            <div className="card">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-primary-500" />
                ตัวอย่าง ({data.data.samples.length})
              </h3>
              <div className="space-y-2">
                {data.data.samples.map((s: { sample_id: string; lab_number: string; sample_type: string; sample_source: string; case_number: string; province: string }) => (
                  <div
                    key={s.sample_id}
                    className="flex items-center justify-between p-4 bg-dark-300 rounded-lg"
                  >
                    <div>
                      <p className="font-mono font-semibold">{s.lab_number}</p>
                      <p className="text-sm text-dark-100">{s.sample_type}</p>
                      <p className="text-xs text-dark-100 mt-1">{s.sample_source}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-mono">{s.case_number}</p>
                      <p className="text-xs text-dark-100">{s.province}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
