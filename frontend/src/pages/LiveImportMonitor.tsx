// src/pages/LiveImportMonitor.tsx
// Real-time Import Monitor with Flip Numbers - Mobile/iPad Optimized

import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  RefreshCw, Volume2, VolumeX, Maximize, Minimize,
  Database, TestTube, Users, Dna, Link2, CheckCircle,
  TrendingUp, Clock, Zap, Activity
} from 'lucide-react'

// Stats interface
interface ImportStats {
  cases: number
  samples: number
  persons: number
  dnaMatches: number
  links: number
  multiCasePersons: number
}

// Flip digit component
const FlipDigit = ({ digit, prevDigit }: { digit: string; prevDigit: string }) => {
  const [isFlipping, setIsFlipping] = useState(false)

  useEffect(() => {
    if (digit !== prevDigit) {
      setIsFlipping(true)
      const timer = setTimeout(() => setIsFlipping(false), 600)
      return () => clearTimeout(timer)
    }
  }, [digit, prevDigit])

  return (
    <div className="flip-digit-container">
      <div className={`flip-digit ${isFlipping ? 'flipping' : ''}`}>
        <div className="digit-top">
          <span>{digit}</span>
        </div>
        <div className="digit-bottom">
          <span>{digit}</span>
        </div>
        {isFlipping && (
          <>
            <div className="digit-flip-top">
              <span>{prevDigit}</span>
            </div>
            <div className="digit-flip-bottom">
              <span>{digit}</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Flip number display
const FlipNumber = ({ value, label, icon: Icon, color, rate }: {
  value: number
  label: string
  icon: any
  color: string
  rate?: number
}) => {
  const [prevValue, setPrevValue] = useState(value)
  const [displayDigits, setDisplayDigits] = useState<string[]>([])
  const [prevDigits, setPrevDigits] = useState<string[]>([])

  useEffect(() => {
    const formatted = value.toLocaleString()
    const prev = prevValue.toLocaleString()
    
    setPrevDigits(prev.split(''))
    setDisplayDigits(formatted.split(''))
    setPrevValue(value)
  }, [value])

  return (
    <div className="flip-card" style={{ '--glow-color': color } as React.CSSProperties}>
      <div className="flip-card-header">
        <Icon className="flip-card-icon" style={{ color }} />
        <span className="flip-card-label">{label}</span>
        {rate !== undefined && rate > 0 && (
          <span className="flip-card-rate">
            <TrendingUp size={14} />
            +{rate}/min
          </span>
        )}
      </div>
      
      <div className="flip-number-display">
        {displayDigits.map((digit, idx) => (
          <FlipDigit 
            key={idx} 
            digit={digit} 
            prevDigit={prevDigits[idx] || digit}
          />
        ))}
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
      <div 
        className="progress-fill" 
        style={{ width: `${Math.min(progress, 100)}%` }}
      >
        <div className="progress-glow" />
      </div>
    </div>
  </div>
)

// Main component
export default function LiveImportMonitor() {
  const [stats, setStats] = useState<ImportStats>({
    cases: 0,
    samples: 0,
    persons: 0,
    dnaMatches: 0,
    links: 0,
    multiCasePersons: 0
  })
  const [prevStats, setPrevStats] = useState<ImportStats>(stats)
  const [rates, setRates] = useState({ cases: 0, samples: 0, persons: 0 })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isConnected, setIsConnected] = useState(true)
  const [importComplete, setImportComplete] = useState(false)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Create notification sound
  useEffect(() => {
    // Create audio context for notification
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+dmIV0aGNqeY2eoJmNfW1mZ3GCkp2fl46AcmhmbHqKmZ6cko2DenFsb3WBjZaZl5OSjoqFgX15dnRzdHd7gYaKjY6OjYuIhYJ+e3h2dXV2eHt/g4aIiYmJiIaEgX57eHZ1dXZ4e36BhIaHh4eGhYOBfnt4dnV1dnh7foCDhYaGhoWEgn97eHZ1dXZ4e36Ag4WGhoaFhIKAe3h2dXV2eHt+gIOFhoaGhYSCf3t4dnV1dnh7foCDhYaGhoWEgn97eHZ1dXZ4e36Ag4WGhoaFhIJ/')
  }, [])

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [soundEnabled])

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('https://forensic-link-api.azurewebsites.net/api/stats')
      if (response.ok) {
        const data = await response.json()
        
        setPrevStats(stats)
        
        const newStats: ImportStats = {
          cases: data.cases || data.totalCases || 0,
          samples: data.samples || data.totalSamples || 0,
          persons: data.persons || data.totalPersons || 0,
          dnaMatches: data.dnaMatches || data.totalDnaMatches || 0,
          links: data.links || data.totalLinks || 0,
          multiCasePersons: data.multiCasePersons || 0
        }
        
        // Calculate rates (per minute, assuming 5 second refresh)
        setRates({
          cases: Math.round((newStats.cases - stats.cases) * 12),
          samples: Math.round((newStats.samples - stats.samples) * 12),
          persons: Math.round((newStats.persons - stats.persons) * 12)
        })
        
        setStats(newStats)
        setLastUpdate(new Date())
        setIsConnected(true)

        // Check if import complete (no new data for a while)
        if (newStats.cases === stats.cases && newStats.samples === stats.samples && stats.cases > 0) {
          if (!importComplete) {
            setImportComplete(true)
            playCompletionSound()
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
      setIsConnected(false)
    }
  }, [stats, importComplete, playCompletionSound])

  // Auto refresh every 5 seconds
  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Calculate progress (estimate based on expected total)
  const expectedTotal = 290000
  const progress = (stats.cases / expectedTotal) * 100

  return (
    <div ref={containerRef} className="live-monitor-container">
      {/* Styles */}
      <style>{`
        .live-monitor-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e14 0%, #0d1520 50%, #0a1628 100%);
          color: #e0e1dd;
          padding: 20px;
          font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow-x: hidden;
        }

        .monitor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 15px;
        }

        .monitor-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .monitor-title h1 {
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          font-weight: 700;
          background: linear-gradient(135deg, #00f0ff, #00a8b3);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
        }

        .live-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 45, 85, 0.2);
          border: 1px solid rgba(255, 45, 85, 0.5);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          color: #ff2d55;
          animation: pulse-badge 2s infinite;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #ff2d55;
          border-radius: 50%;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }

        @keyframes pulse-badge {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 45, 85, 0.3); }
          50% { box-shadow: 0 0 20px rgba(255, 45, 85, 0.6); }
        }

        .monitor-controls {
          display: flex;
          gap: 10px;
        }

        .control-btn {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.3);
          color: #00f0ff;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .control-btn:hover {
          background: rgba(0, 240, 255, 0.2);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.3);
        }

        .control-btn.active {
          background: rgba(0, 240, 255, 0.3);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .flip-card {
          background: linear-gradient(145deg, rgba(13, 21, 32, 0.9), rgba(10, 14, 20, 0.95));
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 
            0 0 30px rgba(0, 0, 0, 0.5),
            0 0 60px var(--glow-color, rgba(0, 240, 255, 0.1));
          transition: all 0.3s;
        }

        .flip-card:hover {
          border-color: var(--glow-color, rgba(0, 240, 255, 0.5));
          transform: translateY(-5px);
          box-shadow: 
            0 10px 40px rgba(0, 0, 0, 0.5),
            0 0 80px var(--glow-color, rgba(0, 240, 255, 0.2));
        }

        .flip-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .flip-card-icon {
          width: 24px;
          height: 24px;
          filter: drop-shadow(0 0 8px currentColor);
        }

        .flip-card-label {
          font-size: 14px;
          color: #8892a0;
          text-transform: uppercase;
          letter-spacing: 1px;
          flex: 1;
        }

        .flip-card-rate {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #39ff14;
          background: rgba(57, 255, 20, 0.1);
          padding: 4px 8px;
          border-radius: 10px;
        }

        .flip-number-display {
          display: flex;
          justify-content: center;
          gap: 4px;
          flex-wrap: wrap;
        }

        .flip-digit-container {
          perspective: 300px;
        }

        .flip-digit {
          position: relative;
          width: clamp(35px, 10vw, 50px);
          height: clamp(55px, 15vw, 75px);
          font-size: clamp(30px, 8vw, 48px);
          font-weight: 700;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }

        .digit-top, .digit-bottom {
          position: absolute;
          width: 100%;
          height: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #1a2332 0%, #0d1520 100%);
          border: 1px solid rgba(0, 240, 255, 0.3);
        }

        .digit-top {
          top: 0;
          border-radius: 8px 8px 0 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.5);
        }

        .digit-top span {
          transform: translateY(50%);
          color: #00f0ff;
          text-shadow: 0 0 20px rgba(0, 240, 255, 0.8);
        }

        .digit-bottom {
          bottom: 0;
          border-radius: 0 0 8px 8px;
          border-top: none;
        }

        .digit-bottom span {
          transform: translateY(-50%);
          color: #00f0ff;
          text-shadow: 0 0 20px rgba(0, 240, 255, 0.8);
        }

        .digit-flip-top, .digit-flip-bottom {
          position: absolute;
          width: 100%;
          height: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #1a2332 0%, #0d1520 100%);
          backface-visibility: hidden;
        }

        .digit-flip-top {
          top: 0;
          border-radius: 8px 8px 0 0;
          transform-origin: bottom;
          animation: flipTop 0.6s ease-in-out;
        }

        .digit-flip-bottom {
          bottom: 0;
          border-radius: 0 0 8px 8px;
          transform-origin: top;
          animation: flipBottom 0.6s ease-in-out;
        }

        @keyframes flipTop {
          0% { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); }
        }

        @keyframes flipBottom {
          0% { transform: rotateX(90deg); }
          100% { transform: rotateX(0deg); }
        }

        .progress-section {
          background: rgba(13, 21, 32, 0.8);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 30px;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
          color: #8892a0;
        }

        .progress-percent {
          color: #00f0ff;
          font-weight: 700;
          font-size: 18px;
        }

        .progress-track {
          height: 12px;
          background: rgba(0, 20, 40, 0.8);
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00f0ff, #00a8b3);
          border-radius: 6px;
          transition: width 0.5s ease-out;
          position: relative;
          overflow: hidden;
        }

        .progress-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          padding: 15px 20px;
          background: rgba(13, 21, 32, 0.6);
          border: 1px solid rgba(0, 240, 255, 0.15);
          border-radius: 12px;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #8892a0;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-dot.connected {
          background: #39ff14;
          box-shadow: 0 0 10px #39ff14;
        }

        .status-dot.disconnected {
          background: #ff2d55;
          box-shadow: 0 0 10px #ff2d55;
        }

        .complete-banner {
          background: linear-gradient(135deg, rgba(57, 255, 20, 0.2), rgba(0, 168, 179, 0.2));
          border: 2px solid #39ff14;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          margin-bottom: 30px;
          animation: celebrate 1s ease-out;
        }

        @keyframes celebrate {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }

        .complete-banner h2 {
          color: #39ff14;
          font-size: 28px;
          margin: 0 0 10px 0;
          text-shadow: 0 0 30px rgba(57, 255, 20, 0.8);
        }

        .complete-banner p {
          color: #8892a0;
          margin: 0;
        }

        /* Mobile optimizations */
        @media (max-width: 768px) {
          .live-monitor-container {
            padding: 15px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .monitor-title h1 {
            font-size: 1.5rem;
          }

          .flip-card {
            padding: 15px;
          }
        }

        /* iPad optimizations */
        @media (min-width: 768px) and (max-width: 1024px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Landscape mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .flip-digit {
            width: 30px;
            height: 45px;
            font-size: 24px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="monitor-header">
        <div className="monitor-title">
          <Activity size={32} color="#00f0ff" style={{ filter: 'drop-shadow(0 0 10px #00f0ff)' }} />
          <h1>Live Import Monitor</h1>
          <div className="live-badge">
            <div className="live-dot" />
            LIVE
          </div>
        </div>
        
        <div className="monitor-controls">
          <button 
            className={`control-btn ${soundEnabled ? 'active' : ''}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button 
            className="control-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
          <button 
            className="control-btn"
            onClick={fetchStats}
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Complete Banner */}
      {importComplete && (
        <div className="complete-banner">
          <CheckCircle size={48} color="#39ff14" style={{ marginBottom: 15 }} />
          <h2>🎉 Import Complete!</h2>
          <p>ข้อมูลนำเข้าเสร็จสมบูรณ์ พร้อมรัน Link Engine</p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        <FlipNumber 
          value={stats.cases}
          label="Cases"
          icon={Database}
          color="#00f0ff"
          rate={rates.cases}
        />
        <FlipNumber 
          value={stats.samples}
          label="Samples"
          icon={TestTube}
          color="#a855f7"
          rate={rates.samples}
        />
        <FlipNumber 
          value={stats.persons}
          label="Persons"
          icon={Users}
          color="#39ff14"
          rate={rates.persons}
        />
        <FlipNumber 
          value={stats.dnaMatches}
          label="DNA Matches"
          icon={Dna}
          color="#f72585"
        />
        <FlipNumber 
          value={stats.multiCasePersons}
          label="Multi-Case Persons"
          icon={Users}
          color="#ff6b35"
        />
        <FlipNumber 
          value={stats.links}
          label="Links"
          icon={Link2}
          color="#ffd700"
        />
      </div>

      {/* Progress */}
      <ProgressBar 
        progress={progress}
        label={`ศพฐ.10 Import Progress (Est. ${expectedTotal.toLocaleString()} cases)`}
      />

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-item">
          <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div className="status-item">
          <Clock size={14} />
          <span>Last update: {lastUpdate.toLocaleTimeString('th-TH')}</span>
        </div>
        <div className="status-item">
          <Zap size={14} />
          <span>Refresh: 5s</span>
        </div>
      </div>
    </div>
  )
}
