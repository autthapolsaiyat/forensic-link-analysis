// src/pages/SmartDashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  FileText, FlaskConical, Users, Link2, Dna, AlertTriangle,
  TrendingUp, TrendingDown, MapPin, Calendar, Clock, Bell,
  Flame, GitBranch, ChevronRight, Activity, Target, Zap
} from 'lucide-react'
import { statsApi, personsApi, linksApi } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

export default function SmartDashboard() {
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

  const { data: caseTypeStats } = useQuery({
    queryKey: ['case-type-stats'],
    queryFn: statsApi.getByCaseType,
  })

  const { data: linksSummary } = useQuery({
    queryKey: ['links-summary'],
    queryFn: statsApi.getLinksSummary,
  })

  // Mock trend data (would come from API in production)
  const trendData = [
    { month: 'ม.ค.', cases: 1200, matches: 45 },
    { month: 'ก.พ.', cases: 1400, matches: 52 },
    { month: 'มี.ค.', cases: 1100, matches: 38 },
    { month: 'เม.ย.', cases: 1600, matches: 61 },
    { month: 'พ.ค.', cases: 1800, matches: 73 },
    { month: 'มิ.ย.', cases: 2100, matches: 89 },
  ]

  const COLORS = ['#00d4ff', '#4895ef', '#f77f00', '#ef233c', '#2ec4b6']

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Alerts */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary-500" />
            Smart Dashboard
          </h1>
          <p className="text-dark-100 mt-1">ภาพรวมและ AI Insights</p>
        </div>
        
        {/* Alerts */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg animate-pulse">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">
              พบ DNA Match ใหม่ {stats?.total_dna_matches || 0} รายการ
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={FileText}
          label="คดีทั้งหมด"
          value={stats?.total_cases || 0}
          trend={+12.5}
          color="cyan"
        />
        <MetricCard
          icon={FlaskConical}
          label="ตัวอย่าง DNA"
          value={stats?.total_samples || 0}
          trend={+8.3}
          color="blue"
        />
        <MetricCard
          icon={Users}
          label="บุคคลหลายคดี"
          value={stats?.multi_case_persons || 0}
          trend={+23.1}
          color="orange"
          highlight
        />
        <MetricCard
          icon={Link2}
          label="Links ทั้งหมด"
          value={stats?.total_links || 0}
          trend={+15.7}
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            แนวโน้มรายเดือน
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="month" stroke="#778da9" fontSize={12} />
                <YAxis stroke="#778da9" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1b263b', 
                    border: '1px solid #415a77',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="cases" 
                  stroke="#00d4ff" 
                  strokeWidth={2}
                  dot={{ fill: '#00d4ff' }}
                  name="คดี"
                />
                <Line 
                  type="monotone" 
                  dataKey="matches" 
                  stroke="#ef233c" 
                  strokeWidth={2}
                  dot={{ fill: '#ef233c' }}
                  name="DNA Match"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Province Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary-500" />
            สถิติแยกตามจังหวัด
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provinceStats?.slice(0, 5) || []} layout="vertical">
                <XAxis type="number" stroke="#778da9" fontSize={12} />
                <YAxis dataKey="province" type="category" stroke="#778da9" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1b263b', 
                    border: '1px solid #415a77',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="case_count" fill="#00d4ff" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hot Cases - High Priority */}
        <div className="card border-severity-severe/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-severity-severe">
            <Flame className="w-5 h-5" />
            Hot Cases
          </h3>
          <p className="text-xs text-dark-100 mb-4">คดีที่พบ DNA Match มากที่สุด</p>
          <div className="space-y-3">
            {topLinks?.slice(0, 4).map((link: any, i: number) => (
              <Link
                key={link.link_id}
                to={`/graph/case/${link.case1_id}`}
                className="flex items-center justify-between p-3 bg-dark-300 rounded-lg hover:bg-dark-100/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-severity-severe/20 text-severity-severe' :
                    i === 1 ? 'bg-severity-medium/20 text-severity-medium' :
                    'bg-dark-100 text-dark-100'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-mono text-sm">{link.case1_number}</p>
                    <p className="text-xs text-dark-100">{link.case1_province}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-1 bg-severity-severe/20 text-severity-severe rounded">
                    DNA
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Network Clusters */}
        <div className="card border-purple-500/30">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-400">
            <Target className="w-5 h-5" />
            Network Clusters
          </h3>
          <p className="text-xs text-dark-100 mb-4">กลุ่มคดีที่เชื่อมโยงกัน</p>
          <div className="space-y-3">
            {multiCasePersons?.slice(0, 4).map((person: any) => (
              <Link
                key={person.person_id}
                to={`/graph/person/${person.person_id}`}
                className="flex items-center justify-between p-3 bg-dark-300 rounded-lg hover:bg-dark-100/30 transition-colors"
              >
                <div>
                  <p className="font-medium">{person.full_name}</p>
                  <p className="text-xs font-mono text-dark-100">{person.id_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-purple-400">{person.case_count}</span>
                  <span className="text-xs text-dark-100">คดี</span>
                </div>
              </Link>
            ))}
          </div>
          <Link
            to="/persons"
            className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-dark-100 text-primary-500 hover:underline text-sm"
          >
            ดูทั้งหมด
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Link Types Summary */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-500" />
            ประเภท Links
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={linksSummary?.byType || []}
                  dataKey="count"
                  nameKey="link_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ link_type, count }) => `${link_type}: ${count}`}
                  labelLine={false}
                >
                  {linksSummary?.byType?.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1b263b', 
                    border: '1px solid #415a77',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#00d4ff]"></span>
                DNA Match
              </span>
              <span className="font-bold">{stats?.dna_links || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#4895ef]"></span>
                ID Number
              </span>
              <span className="font-bold">{stats?.id_links || 0}</span>
            </div>
            {linksSummary?.crossProvinceLinks > 0 && (
              <div className="flex items-center justify-between text-sm pt-2 border-t border-dark-100">
                <span className="text-dark-100">ข้ามจังหวัด</span>
                <span className="font-bold text-severity-medium">{linksSummary.crossProvinceLinks}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-gradient-to-r from-primary-500/10 to-purple-500/10 border-primary-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Investigation Workspace</h3>
            <p className="text-sm text-dark-100 mt-1">
              เปรียบเทียบและวิเคราะห์หลายคดีพร้อมกัน
            </p>
          </div>
          <Link
            to="/workspace"
            className="btn-primary flex items-center gap-2"
          >
            <GitBranch className="w-4 h-4" />
            เริ่มการสืบสวน
          </Link>
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
interface MetricCardProps {
  icon: React.ElementType
  label: string
  value: number
  trend?: number
  color: 'cyan' | 'blue' | 'green' | 'orange' | 'red'
  highlight?: boolean
}

function MetricCard({ icon: Icon, label, value, trend, color, highlight }: MetricCardProps) {
  const colorClasses = {
    cyan: 'text-primary-500 bg-primary-500/10',
    blue: 'text-blue-400 bg-blue-400/10',
    green: 'text-emerald-400 bg-emerald-400/10',
    orange: 'text-orange-400 bg-orange-400/10',
    red: 'text-red-400 bg-red-400/10',
  }

  return (
    <div className={`card ${highlight ? 'ring-2 ring-primary-500/50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold font-mono">{value.toLocaleString()}</p>
        <p className="text-sm text-dark-100 mt-1">{label}</p>
      </div>
    </div>
  )
}
