// src/pages/LiveImportMonitor.tsx
// Real-time Import Monitor with Center Selection - Mobile/iPad Optimized

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  RefreshCw, Volume2, VolumeX, Maximize, Minimize,
  Database, TestTube, Users, Dna, Link2, CheckCircle,
  TrendingUp, Clock, Zap, Activity, Calendar, MapPin,
  ChevronDown, Building2
} from 'lucide-react'

// Center interface
interface Center {
  code: string
  name: string
  nameTH: string
  targetCases: number
}

// All centers data
const CENTERS: Center[] = [
  { code: 'RTP00', name: 'CIFS', nameTH: 'พฐก', targetCases: 150000 },
  { code: 'RTP02', name: 'PFSC2', nameTH: 'ศพฐ.2', targetCases: 200000 },
  { code: 'RTP03', name: 'PFSC3', nameTH: 'ศพฐ.3', targetCases: 180000 },
  { code: 'RTP04', name: 'PFSC4', nameTH: 'ศพฐ.4', targetCases: 160000 },
  { code: 'RTP05', name: 'PFSC5', nameTH: 'ศพฐ.5', targetCases: 170000 },
  { code: 'RTP09', name: 'PFSC9', nameTH: 'ศพฐ.9', targetCases: 140000 },
  { code: 'RTP10', name: 'PFSC10', nameTH: 'ศพฐ.10', targetCases: 290000 },
]

// Stats interface
interface ImportStats {
  cases: number
  samples: number
  persons: number
  dnaMatches: number
  links: number
  multiCasePersons: number
}

// Center stats interface
interface CenterStats {
  code: string
  cases: number
  samples: number
  status: 'pending' | 'importing' | 'completed'
}

// Yearly data
interface YearlyData {
  year: number
  yearBE: number
  nddbCases: number
  importedCases: number
  status: 'pending' | 'importing' | 'completed'
}

// NDDB Data for ศพฐ.10
const NDDB_YEARLY_DATA: { year: number; count: number }[] = [
  { year: 2008, count: 1702 }, { year: 2009, count: 1661 }, { year: 2010, count: 1808 },
  { year: 2011, count: 1692 }, { year: 2012, count: 1627 }, { year: 2013, count: 11521 },
  { year: 2014, count: 27910 }, { year: 2015, count: 19442 }, { year: 2016, count: 16607 },
  { year: 2017, count: 22483 }, { year: 2018, count: 19438 }, { year: 2019, count: 27296 },
  { year: 2020, count: 33782 }, { year: 2021, count: 22369 }, { year: 2022, count: 11669 },
  { year: 2023, count: 12944 }, { year: 2024, count: 30615 }, { year: 2025, count: 25525 },
]

// Flip digit component
const FlipDigit = ({ digit }: { digit: string }) => (
  <div className="flip-digit-container">
    <div className="flip-digit">
      <div className="digit-display"><span>{digit}</span></div>
    </div>
  </div>
)

// Flip number display
const FlipNumber = ({ value, label, icon: Icon, color, rate }: {
  value: number; label: string; icon: any; color: string; rate?: number
}) => {
  const digits = value.toLocaleString().split('')
  return (
    <div className="flip-card" style={{ '--glow-color': color } as React.CSSProperties}>
      <div className="flip-card-header">
        <Icon className="flip-card-icon" style={{ color }} />
        <span className="flip-card-label">{label}</span>
        {rate !== undefined && rate > 0 && (
          <span className="flip-card-rate"><TrendingUp size={14} />+{rate}/min</span>
        )}
      </div>
      <div className="flip-number-display">
        {digits.map((digit, idx) => <FlipDigit key={idx} digit={digit} />)}
      </div>
    </div>
  )
}

// Progress bar component
const ProgressBar = ({ progress, label }: { progress: number; label: string }) => (
  <div className="progress-section">
    <div className="progress-header">
      <span>{label}</span>
      <span className="progress-percent">{progress.toFixed(1)}%</span>
    </div>
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}>
        <div className="progress-glow" />
      </div>
    </div>
  </div>
)

// Center selector component
const CenterSelector = ({ selectedCenter, onSelect, isOpen, onToggle }: { 
  selectedCenter: Center; onSelect: (center: Center) => void; isOpen: boolean; onToggle: () => void
}) => (
  <div className="center-selector">
    <button className="center-selector-btn" onClick={onToggle}>
      <MapPin size={18} />
      <span className="center-name">{selectedCenter.nameTH}</span>
      <span className="center-code">({selectedCenter.code})</span>
      <ChevronDown size={18} className={`chevron ${isOpen ? 'open' : ''}`} />
    </button>
    {isOpen && (
      <div className="center-dropdown">
        {CENTERS.map(center => (
          <button key={center.code} className={`center-option ${center.code === selectedCenter.code ? 'selected' : ''}`}
            onClick={() => { onSelect(center); onToggle(); }}>
            <span className="option-name">{center.nameTH}</span>
            <span className="option-code">{center.code}</span>
          </button>
        ))}
      </div>
    )}
  </div>
)

// All Centers Overview component
const AllCentersOverview = ({ centerStats }: { centerStats: CenterStats[] }) => {
  const totalCases = centerStats.reduce((sum, c) => sum + c.cases, 0)
  const totalTarget = CENTERS.reduce((sum, c) => sum + c.targetCases, 0)
  const overallProgress = (totalCases / totalTarget) * 100

  return (
    <div className="all-centers-section">
      <div className="section-header">
        <Building2 size={20} color="#00f0ff" />
        <span>ภาพรวมทุกศูนย์</span>
        <span className="total-progress">{overallProgress.toFixed(1)}%</span>
      </div>
      <div className="centers-grid">
        {CENTERS.map(center => {
          const stats = centerStats.find(s => s.code === center.code)
          const cases = stats?.cases || 0
          const progress = (cases / center.targetCases) * 100
          const status = cases === 0 ? 'pending' : progress >= 95 ? 'completed' : 'importing'
          return (
            <div key={center.code} className={`center-card ${status}`}>
              <div className="center-card-header">
                <span className="center-card-name">{center.nameTH}</span>
                <span className="center-status-badge">
                  {status === 'completed' ? '✅' : status === 'importing' ? '🔄' : '⏳'}
                </span>
              </div>
              <div className="center-card-stats">
                <span className="cases-count">{cases.toLocaleString()}</span>
                <span className="cases-target">/ {(center.targetCases / 1000).toFixed(0)}K</span>
              </div>
              <div className="center-progress-bar">
                <div className="center-progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
              <div className="center-progress-text">{progress.toFixed(1)}%</div>
            </div>
          )
        })}
      </div>
      <div className="total-summary">
        <div className="summary-label">รวมทั้งหมด</div>
        <div className="summary-value">{totalCases.toLocaleString()} / {(totalTarget / 1000).toFixed(0)}K cases</div>
      </div>
    </div>
  )
}

// Main component
export default function LiveImportMonitor() {
  const [selectedCenter, setSelectedCenter] = useState<Center>(CENTERS[6])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [stats, setStats] = useState<ImportStats>({ cases: 0, samples: 0, persons: 0, dnaMatches: 0, links: 0, multiCasePersons: 0 })
  const [centerStats, setCenterStats] = useState<CenterStats[]>([])
  const [rates, setRates] = useState({ cases: 0, samples: 0, persons: 0 })
  const [yearlyImported, setYearlyImported] = useState<Record<number, number>>({})
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isConnected, setIsConnected] = useState(true)
  const [importComplete, setImportComplete] = useState(false)
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all')
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevStatsRef = useRef<ImportStats>(stats)

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+dmIV0aGNqeY2eoJmNfW1mZ3GCkp2fl46AcmhmbHqKmZ6cko2DenFsb3WBjZaZl5OSjoqFgX15dnRzdHd7gYaKjY6OjYuIhYJ+e3h2dXV2eHt/g4aIiYmJiIaEgX57eHZ1dXZ4e36BhIaHh4eGhYOBfnt4dnV1dnh7foCDhYaGhoWEgn97eHZ1dXZ4e36Ag4WGhoaFhIKAe3h2dXV2eHt+gIOFhoaGhYSCf3t4dnV1dnh7foCDhYaGhoWEgn97eHZ1dXZ4e36Ag4WGhoaFhIJ/')
  }, [])

  const playCompletionSound = useCallback(() => {
    if (soundEnabled && audioRef.current) audioRef.current.play().catch(() => {})
  }, [soundEnabled])

  const fetchYearlyData = useCallback(async () => {
    try {
      const response = await fetch('https://forensic-link-api.azurewebsites.net/api/v1/stats/by-year')
      if (response.ok) {
        const json = await response.json()
        const data = json.data || json
        const yearlyMap: Record<number, number> = {}
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            const year = item.year || item.case_year
            const count = item.count || item.case_count || item.total
            if (year && year >= 2000 && year <= 2030) yearlyMap[year] = count
          })
        }
        setYearlyImported(yearlyMap)
      }
    } catch (error) { console.error('Failed to fetch yearly data:', error) }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('https://forensic-link-api.azurewebsites.net/api/v1/stats/overview')
      if (response.ok) {
        const json = await response.json()
        const data = json.data || json
        const newStats: ImportStats = {
          cases: data.total_cases || 0, samples: data.total_samples || 0, persons: data.total_persons || 0,
          dnaMatches: data.total_dna_matches || 0, links: data.total_links || 0, multiCasePersons: data.multi_case_persons || 0
        }
        setRates({
          cases: Math.round((newStats.cases - prevStatsRef.current.cases) * 12),
          samples: Math.round((newStats.samples - prevStatsRef.current.samples) * 12),
          persons: Math.round((newStats.persons - prevStatsRef.current.persons) * 12)
        })
        prevStatsRef.current = newStats
        setStats(newStats)
        setLastUpdate(new Date())
        setIsConnected(true)
        setCenterStats([
          { code: 'RTP00', cases: 0, samples: 0, status: 'pending' },
          { code: 'RTP02', cases: 0, samples: 0, status: 'pending' },
          { code: 'RTP03', cases: 0, samples: 0, status: 'pending' },
          { code: 'RTP04', cases: 0, samples: 0, status: 'pending' },
          { code: 'RTP05', cases: 0, samples: 0, status: 'pending' },
          { code: 'RTP09', cases: 0, samples: 0, status: 'pending' },
          { code: 'RTP10', cases: newStats.cases, samples: newStats.samples, status: 'importing' },
        ])
        if (newStats.cases === prevStatsRef.current.cases && newStats.cases > 0 && !importComplete) {
          setImportComplete(true)
          playCompletionSound()
        }
      }
    } catch (error) { console.error('Failed to fetch stats:', error); setIsConnected(false) }
  }, [importComplete, playCompletionSound])

  useEffect(() => {
    fetchStats(); fetchYearlyData()
    const interval = setInterval(() => { fetchStats(); fetchYearlyData() }, 5000)
    return () => clearInterval(interval)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true) }
    else { document.exitFullscreen(); setIsFullscreen(false) }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const progress = (stats.cases / selectedCenter.targetCases) * 100
  
  const getYearlyStatus = (): YearlyData[] => {
    return NDDB_YEARLY_DATA.map(nddb => {
      const imported = yearlyImported[nddb.year] || 0
      const percent = (imported / nddb.count) * 100
      let status: 'pending' | 'importing' | 'completed' = 'pending'
      if (percent >= 95) status = 'completed'
      else if (imported > 0) status = 'importing'
      return { year: nddb.year, yearBE: nddb.year + 543, nddbCases: nddb.count, importedCases: imported, status }
    }).reverse()
  }
  
  const yearlyStatus = getYearlyStatus()
  const completedYears = yearlyStatus.filter(y => y.status === 'completed').length

  return (
    <div ref={containerRef} className="live-monitor-container">
      <style>{`
        .live-monitor-container { min-height: 100vh; background: linear-gradient(135deg, #0a0e14 0%, #0d1520 50%, #0a1628 100%); color: #e0e1dd; padding: 20px; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; overflow-x: hidden; }
        .monitor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
        .monitor-title { display: flex; align-items: center; gap: 12px; }
        .monitor-title h1 { font-size: clamp(1.5rem, 5vw, 2.5rem); font-weight: 700; background: linear-gradient(135deg, #00f0ff, #00a8b3); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; }
        .live-badge { display: flex; align-items: center; gap: 6px; background: rgba(255, 45, 85, 0.2); border: 1px solid rgba(255, 45, 85, 0.5); padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #ff2d55; animation: pulse-badge 2s infinite; }
        .live-dot { width: 8px; height: 8px; background: #ff2d55; border-radius: 50%; animation: blink 1s infinite; }
        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.3; } }
        @keyframes pulse-badge { 0%, 100% { box-shadow: 0 0 10px rgba(255, 45, 85, 0.3); } 50% { box-shadow: 0 0 20px rgba(255, 45, 85, 0.6); } }
        .monitor-controls { display: flex; gap: 10px; }
        .control-btn { background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); color: #00f0ff; padding: 10px; border-radius: 10px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; }
        .control-btn:hover { background: rgba(0, 240, 255, 0.2); box-shadow: 0 0 20px rgba(0, 240, 255, 0.3); }
        .control-btn.active { background: rgba(0, 240, 255, 0.3); }
        .center-selector { position: relative; margin-bottom: 20px; }
        .center-selector-btn { display: flex; align-items: center; gap: 10px; background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.3); color: #00f0ff; padding: 12px 20px; border-radius: 12px; cursor: pointer; font-size: 16px; transition: all 0.3s; }
        .center-selector-btn:hover { background: rgba(0, 240, 255, 0.2); box-shadow: 0 0 20px rgba(0, 240, 255, 0.3); }
        .center-name { font-weight: 600; font-size: 18px; }
        .center-code { color: #8892a0; font-size: 14px; }
        .chevron { transition: transform 0.3s; }
        .chevron.open { transform: rotate(180deg); }
        .center-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: rgba(13, 21, 32, 0.98); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 12px; margin-top: 5px; z-index: 100; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5); }
        .center-option { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 12px 20px; background: transparent; border: none; color: #e0e1dd; cursor: pointer; transition: all 0.2s; text-align: left; }
        .center-option:hover { background: rgba(0, 240, 255, 0.1); }
        .center-option.selected { background: rgba(0, 240, 255, 0.2); color: #00f0ff; }
        .option-name { font-weight: 500; }
        .option-code { color: #8892a0; font-size: 13px; }
        .view-toggle { display: flex; gap: 5px; background: rgba(13, 21, 32, 0.8); padding: 5px; border-radius: 10px; margin-bottom: 20px; }
        .view-toggle-btn { padding: 10px 20px; background: transparent; border: none; color: #8892a0; border-radius: 8px; cursor: pointer; transition: all 0.3s; font-size: 14px; }
        .view-toggle-btn.active { background: rgba(0, 240, 255, 0.2); color: #00f0ff; }
        .all-centers-section { background: rgba(13, 21, 32, 0.8); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; font-size: 18px; color: #00f0ff; }
        .total-progress { margin-left: auto; background: rgba(57, 255, 20, 0.2); color: #39ff14; padding: 4px 12px; border-radius: 12px; font-size: 14px; }
        .centers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .center-card { background: rgba(0, 20, 40, 0.5); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 12px; padding: 15px; transition: all 0.3s; }
        .center-card.importing { border-color: rgba(0, 240, 255, 0.5); box-shadow: 0 0 20px rgba(0, 240, 255, 0.2); animation: cardPulse 2s ease-in-out infinite; }
        .center-card.completed { border-color: rgba(57, 255, 20, 0.5); box-shadow: 0 0 20px rgba(57, 255, 20, 0.2); }
        .center-card.pending { opacity: 0.6; }
        @keyframes cardPulse { 0%, 100% { box-shadow: 0 0 20px rgba(0, 240, 255, 0.2); } 50% { box-shadow: 0 0 30px rgba(0, 240, 255, 0.4); } }
        .center-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .center-card-name { font-weight: 600; color: #00f0ff; }
        .center-status-badge { font-size: 14px; }
        .center-card-stats { margin-bottom: 10px; }
        .cases-count { font-size: 24px; font-weight: 700; color: #39ff14; }
        .cases-target { color: #8892a0; font-size: 14px; }
        .center-progress-bar { height: 6px; background: rgba(0, 20, 40, 0.8); border-radius: 3px; overflow: hidden; margin-bottom: 5px; }
        .center-progress-fill { height: 100%; background: linear-gradient(90deg, #00f0ff, #39ff14); border-radius: 3px; transition: width 0.5s ease-out; }
        .center-progress-text { font-size: 12px; color: #8892a0; text-align: right; }
        .total-summary { display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid rgba(0, 240, 255, 0.2); }
        .summary-label { color: #8892a0; }
        .summary-value { font-size: 18px; font-weight: 600; color: #00f0ff; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .flip-card { background: linear-gradient(145deg, rgba(13, 21, 32, 0.9), rgba(10, 14, 20, 0.95)); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 16px; padding: 20px; box-shadow: 0 0 30px rgba(0, 0, 0, 0.5), 0 0 60px var(--glow-color, rgba(0, 240, 255, 0.1)); transition: all 0.3s; }
        .flip-card:hover { border-color: var(--glow-color, rgba(0, 240, 255, 0.5)); transform: translateY(-5px); }
        .flip-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .flip-card-icon { width: 24px; height: 24px; filter: drop-shadow(0 0 8px currentColor); }
        .flip-card-label { font-size: 14px; color: #8892a0; text-transform: uppercase; letter-spacing: 1px; flex: 1; }
        .flip-card-rate { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #39ff14; background: rgba(57, 255, 20, 0.1); padding: 4px 8px; border-radius: 10px; }
        .flip-number-display { display: flex; justify-content: center; gap: 4px; flex-wrap: wrap; }
        .flip-digit-container { perspective: 300px; }
        .flip-digit { position: relative; width: clamp(35px, 10vw, 50px); height: clamp(55px, 15vw, 75px); }
        .digit-display { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #1a2332 0%, #0d1520 100%); border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 8px; font-size: clamp(28px, 8vw, 42px); font-weight: 700; font-family: 'SF Mono', 'Fira Code', monospace; color: #00f0ff; text-shadow: 0 0 20px rgba(0, 240, 255, 0.8); animation: digitPulse 2s ease-in-out infinite; }
        @keyframes digitPulse { 0%, 100% { text-shadow: 0 0 20px rgba(0, 240, 255, 0.8); } 50% { text-shadow: 0 0 30px rgba(0, 240, 255, 1), 0 0 40px rgba(0, 240, 255, 0.5); } }
        .progress-section { background: rgba(13, 21, 32, 0.8); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 20px; }
        .progress-header { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #8892a0; }
        .progress-percent { color: #00f0ff; font-weight: 700; font-size: 18px; }
        .progress-track { height: 12px; background: rgba(0, 20, 40, 0.8); border-radius: 6px; overflow: hidden; position: relative; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #00f0ff, #00a8b3); border-radius: 6px; transition: width 0.5s ease-out; position: relative; overflow: hidden; }
        .progress-glow { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: shimmer 2s infinite; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .yearly-table-container { background: rgba(13, 21, 32, 0.8); border: 1px solid rgba(0, 240, 255, 0.2); border-radius: 16px; padding: 20px; margin-bottom: 20px; overflow-x: auto; }
        .yearly-table-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 16px; color: #00f0ff; }
        .yearly-summary { margin-left: auto; background: rgba(57, 255, 20, 0.2); color: #39ff14; padding: 4px 12px; border-radius: 12px; font-size: 13px; }
        .yearly-table { width: 100%; min-width: 600px; }
        .yearly-row { display: grid; grid-template-columns: 80px 80px 100px 100px 150px 80px; gap: 10px; padding: 12px 10px; border-bottom: 1px solid rgba(0, 240, 255, 0.1); align-items: center; font-size: 14px; }
        .yearly-row.header-row { color: #8892a0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(0, 240, 255, 0.3); }
        .yearly-row.completed { background: rgba(57, 255, 20, 0.05); }
        .yearly-row.importing { background: rgba(0, 240, 255, 0.1); animation: rowPulse 2s ease-in-out infinite; }
        @keyframes rowPulse { 0%, 100% { background: rgba(0, 240, 255, 0.1); } 50% { background: rgba(0, 240, 255, 0.2); } }
        .yearly-row.pending { opacity: 0.5; }
        .col-year, .col-year-be { font-family: 'SF Mono', monospace; color: #00f0ff; }
        .col-nddb { color: #8892a0; }
        .col-imported { color: #39ff14; font-weight: 600; }
        .col-progress { display: flex; align-items: center; gap: 8px; }
        .mini-progress { flex: 1; height: 6px; background: rgba(0, 20, 40, 0.8); border-radius: 3px; overflow: hidden; }
        .mini-progress-fill { height: 100%; background: linear-gradient(90deg, #00f0ff, #39ff14); border-radius: 3px; transition: width 0.5s ease-out; }
        .progress-text { font-size: 12px; color: #00f0ff; min-width: 40px; text-align: right; }
        .status-badge { font-size: 16px; }
        .status-bar { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding: 15px 20px; background: rgba(13, 21, 32, 0.6); border: 1px solid rgba(0, 240, 255, 0.15); border-radius: 12px; }
        .status-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #8892a0; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; }
        .status-dot.connected { background: #39ff14; box-shadow: 0 0 10px #39ff14; }
        .status-dot.disconnected { background: #ff2d55; box-shadow: 0 0 10px #ff2d55; }
        .complete-banner { background: linear-gradient(135deg, rgba(57, 255, 20, 0.2), rgba(0, 168, 179, 0.2)); border: 2px solid #39ff14; border-radius: 16px; padding: 30px; text-align: center; margin-bottom: 20px; animation: celebrate 1s ease-out; }
        @keyframes celebrate { 0% { transform: scale(0.8); opacity: 0; } 50% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        .complete-banner h2 { color: #39ff14; font-size: 28px; margin: 0 0 10px 0; text-shadow: 0 0 30px rgba(57, 255, 20, 0.8); }
        .complete-banner p { color: #8892a0; margin: 0; }
        .pending-banner { display: flex; align-items: center; justify-content: center; gap: 12px; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px; font-size: 16px; color: #ffc107; }
        .pending-banner span:first-child { font-size: 24px; }
        @media (max-width: 768px) { .live-monitor-container { padding: 15px; } .stats-grid { grid-template-columns: 1fr; } .monitor-title h1 { font-size: 1.5rem; } .flip-card { padding: 15px; } .centers-grid { grid-template-columns: repeat(2, 1fr); } .yearly-row { grid-template-columns: 60px 60px 70px 70px 100px 50px; font-size: 12px; padding: 10px 5px; } }
        @media (min-width: 768px) and (max-width: 1024px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
      `}</style>

      <div className="monitor-header">
        <div className="monitor-title">
          <Activity size={32} color="#00f0ff" style={{ filter: 'drop-shadow(0 0 10px #00f0ff)' }} />
          <h1>Live Import Monitor</h1>
          <div className="live-badge"><div className="live-dot" />LIVE</div>
        </div>
        <div className="monitor-controls">
          <button className={`control-btn ${soundEnabled ? 'active' : ''}`} onClick={() => setSoundEnabled(!soundEnabled)} title={soundEnabled ? 'Mute' : 'Unmute'}>
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button className="control-btn" onClick={toggleFullscreen} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button className="control-btn" onClick={() => { fetchStats(); fetchYearlyData(); }} title="Refresh">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="view-toggle">
        <button className={`view-toggle-btn ${viewMode === 'all' ? 'active' : ''}`} onClick={() => setViewMode('all')}>🏢 ทุกศูนย์</button>
        <button className={`view-toggle-btn ${viewMode === 'single' ? 'active' : ''}`} onClick={() => setViewMode('single')}>📍 ศูนย์เดียว</button>
      </div>

      {viewMode === 'all' && <AllCentersOverview centerStats={centerStats} />}

      {viewMode === 'single' && (
        <>
          <CenterSelector selectedCenter={selectedCenter} onSelect={setSelectedCenter} isOpen={dropdownOpen} onToggle={() => setDropdownOpen(!dropdownOpen)} />
          
          {/* Show stats only for RTP10, others show 0 */}
          {(() => {
            const isRTP10 = selectedCenter.code === 'RTP10'
            const displayStats = isRTP10 ? stats : { cases: 0, samples: 0, persons: 0, dnaMatches: 0, links: 0, multiCasePersons: 0 }
            const displayRates = isRTP10 ? rates : { cases: 0, samples: 0, persons: 0 }
            const displayProgress = isRTP10 ? progress : 0
            
            return (
              <>
                {!isRTP10 && (
                  <div className="pending-banner">
                    <span>⏳</span>
                    <span>ยังไม่ได้นำเข้าข้อมูล {selectedCenter.nameTH} - รอคิว</span>
                  </div>
                )}
                {isRTP10 && importComplete && (
                  <div className="complete-banner">
                    <CheckCircle size={48} color="#39ff14" style={{ marginBottom: 15 }} />
                    <h2>🎉 Import Complete!</h2>
                    <p>ข้อมูลนำเข้าเสร็จสมบูรณ์ พร้อมรัน Link Engine</p>
                  </div>
                )}
                <div className="stats-grid">
                  <FlipNumber value={displayStats.cases} label="Cases" icon={Database} color="#00f0ff" rate={displayRates.cases} />
                  <FlipNumber value={displayStats.samples} label="Samples" icon={TestTube} color="#a855f7" rate={displayRates.samples} />
                  <FlipNumber value={displayStats.persons} label="Persons" icon={Users} color="#39ff14" rate={displayRates.persons} />
                  <FlipNumber value={displayStats.dnaMatches} label="DNA Matches" icon={Dna} color="#f72585" />
                  <FlipNumber value={displayStats.multiCasePersons} label="Multi-Case Persons" icon={Users} color="#ff6b35" />
                  <FlipNumber value={displayStats.links} label="Links" icon={Link2} color="#ffd700" />
                </div>
                <ProgressBar progress={displayProgress} label={`${selectedCenter.nameTH} Import Progress (${displayStats.cases.toLocaleString()} / ${selectedCenter.targetCases.toLocaleString()} cases)`} />
              </>
            )
          })()}
          {selectedCenter.code === 'RTP10' && (
            <div className="yearly-table-container">
              <div className="yearly-table-header">
                <Calendar size={20} color="#00f0ff" />
                <span>สถานะนำเข้าแยกตามปี</span>
                <span className="yearly-summary">{completedYears} / {NDDB_YEARLY_DATA.length} ปี</span>
              </div>
              <div className="yearly-table">
                <div className="yearly-row header-row">
                  <div className="col-year">ปี ค.ศ.</div>
                  <div className="col-year-be">ปี พ.ศ.</div>
                  <div className="col-nddb">NDDB</div>
                  <div className="col-imported">นำเข้าแล้ว</div>
                  <div className="col-progress">ความคืบหน้า</div>
                  <div className="col-status">สถานะ</div>
                </div>
                {yearlyStatus.map((year) => {
                  const percent = year.nddbCases > 0 ? (year.importedCases / year.nddbCases) * 100 : 0
                  return (
                    <div key={year.year} className={`yearly-row ${year.status}`}>
                      <div className="col-year">{year.year}</div>
                      <div className="col-year-be">{year.yearBE}</div>
                      <div className="col-nddb">{year.nddbCases.toLocaleString()}</div>
                      <div className="col-imported">{year.importedCases.toLocaleString()}</div>
                      <div className="col-progress">
                        <div className="mini-progress">
                          <div className="mini-progress-fill" style={{ width: `${Math.min(percent, 100)}%` }} />
                        </div>
                        <span className="progress-text">{Math.round(percent)}%</span>
                      </div>
                      <div className="col-status">
                        {year.status === 'completed' ? <span className="status-badge">✅</span> : year.status === 'importing' ? <span className="status-badge">🔄</span> : <span className="status-badge">⏳</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="status-bar">
        <div className="status-item">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="status-item"><Clock size={14} /><span>Last update: {lastUpdate.toLocaleTimeString('th-TH')}</span></div>
        <div className="status-item"><Zap size={14} /><span>Refresh: 5s</span></div>
      </div>
    </div>
  )
}
