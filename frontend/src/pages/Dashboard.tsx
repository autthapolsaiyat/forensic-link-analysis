import { useQuery } from '@tanstack/react-query'
import { 
  FileText, 
  FlaskConical, 
  Users, 
  Link2, 
  Dna,
  AlertTriangle,
  TrendingUp,
  MapPin
} from 'lucide-react'
import { statsApi, personsApi, linksApi } from '../services/api'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: statsApi.getOverview,
  })

  const { data: multiCasePersons } = useQuery({
    queryKey: ['multi-case-persons'],
    queryFn: () => personsApi.getMultiCase(2, 10),
  })

  const { data: topLinks } = useQuery({
    queryKey: ['top-links'],
    queryFn: () => linksApi.getTop(10),
  })

  const { data: provinceStats } = useQuery({
    queryKey: ['province-stats'],
    queryFn: statsApi.getByProvince,
  })

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-dark-100 mt-1">ภาพรวมระบบเชื่อมโยงข้อมูลนิติวิทยาศาสตร์</p>
        </div>
        <div className="text-right text-sm text-dark-100">
          <p>อัพเดทล่าสุด</p>
          <p className="font-mono">{new Date().toLocaleString('th-TH')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="คดีทั้งหมด"
          value={stats?.total_cases || 0}
          color="cyan"
        />
        <StatCard
          icon={FlaskConical}
          label="ตัวอย่าง"
          value={stats?.total_samples || 0}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="บุคคลหลายคดี"
          value={stats?.multi_case_persons || 0}
          color="orange"
          highlight
        />
        <StatCard
          icon={Link2}
          label="Links ทั้งหมด"
          value={stats?.total_links || 0}
          color="green"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Dna}
          label="DNA Links"
          value={stats?.dna_links || 0}
          color="pink"
          small
        />
        <StatCard
          icon={Users}
          label="ID Links"
          value={stats?.id_links || 0}
          color="purple"
          small
        />
        <StatCard
          icon={AlertTriangle}
          label="DNA Matches"
          value={stats?.total_dna_matches || 0}
          color="red"
          small
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Case Persons */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              บุคคลที่ปรากฏหลายคดี
            </h2>
            <Link to="/persons" className="text-sm text-primary-500 hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="space-y-2">
            {multiCasePersons?.slice(0, 8).map((person) => (
              <Link
                key={person.person_id}
                to={`/graph/person/${person.person_id}`}
                className="flex items-center justify-between p-3 bg-dark-300 rounded-lg hover:bg-dark-100/30 transition-colors"
              >
                <div>
                  <p className="font-medium">{person.full_name}</p>
                  <p className="text-sm text-dark-100 font-mono">{person.id_number}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary-500">{person.case_count}</span>
                  <p className="text-xs text-dark-100">คดี</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Links */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary-500" />
              Top Links
            </h2>
            <Link to="/links" className="text-sm text-primary-500 hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>
          <div className="space-y-2">
            {topLinks?.slice(0, 6).map((link) => (
              <div
                key={link.link_id}
                className="flex items-center gap-3 p-3 bg-dark-300 rounded-lg"
              >
                <div className={`w-2 h-2 rounded-full ${
                  link.link_type === 'DNA_MATCH' ? 'bg-severity-severe' : 'bg-primary-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-mono truncate">{link.case1_number}</span>
                    <span className="text-dark-100">↔</span>
                    <span className="font-mono truncate">{link.case2_number}</span>
                  </div>
                  <p className="text-xs text-dark-100 mt-1">
                    {link.case1_province} ↔ {link.case2_province}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold ${
                    link.link_type === 'DNA_MATCH' ? 'text-severity-severe' : 'text-primary-500'
                  }`}>
                    {link.link_type === 'DNA_MATCH' ? 'DNA' : 'ID'}
                  </span>
                  <p className="text-xs text-dark-100">{Math.round(link.link_strength * 100)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Province Stats */}
      {provinceStats && provinceStats.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary-500" />
            สถิติแยกตามจังหวัด
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {provinceStats.slice(0, 4).map((province: { province: string; case_count: number }) => (
              <div key={province.province} className="bg-dark-300 rounded-lg p-4 text-center">
                <p className="text-sm text-dark-100 mb-1">{province.province || 'ไม่ระบุ'}</p>
                <p className="text-2xl font-bold text-primary-500 font-mono">
                  {province.case_count.toLocaleString()}
                </p>
                <p className="text-xs text-dark-100">คดี</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  color: 'cyan' | 'blue' | 'green' | 'orange' | 'red' | 'pink' | 'purple'
  highlight?: boolean
  small?: boolean
}

function StatCard({ icon: Icon, label, value, color, highlight, small }: StatCardProps) {
  const colorClasses = {
    cyan: 'text-primary-500',
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    orange: 'text-orange-400',
    red: 'text-red-400',
    pink: 'text-pink-400',
    purple: 'text-purple-400',
  }

  const bgClasses = {
    cyan: 'bg-primary-500/10',
    blue: 'bg-blue-400/10',
    green: 'bg-emerald-400/10',
    orange: 'bg-orange-400/10',
    red: 'bg-red-400/10',
    pink: 'bg-pink-400/10',
    purple: 'bg-purple-400/10',
  }

  return (
    <div className={`card ${highlight ? 'ring-2 ring-primary-500/50 animate-pulse-glow' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bgClasses[color]}`}>
          <Icon className={`${small ? 'w-4 h-4' : 'w-5 h-5'} ${colorClasses[color]}`} />
        </div>
        <div>
          <p className="text-sm text-dark-100">{label}</p>
          <p className={`${small ? 'text-xl' : 'text-2xl'} font-bold font-mono ${colorClasses[color]}`}>
            {value.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}
