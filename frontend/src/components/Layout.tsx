// src/components/Layout.tsx
import { Outlet, NavLink } from 'react-router-dom'
import { 
  Activity, 
  FileText,
  Users, 
  Link2, 
  ChevronRight,
  Layers,
  Settings,
  HelpCircle,
  Zap,
  Shield,
  GitFork
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Activity, label: 'Dashboard', description: 'ภาพรวม & Insights' },
  { to: '/cases', icon: FileText, label: 'รายการคดี', description: 'ค้นหาและจัดการคดี' },
  { to: '/network-graph', icon: Layers, label: 'Network Investigation', description: 'JARVIS Graph Analysis' },
  { to: '/hierarchy', icon: GitFork, label: 'Hierarchical View', description: 'ผังความเชื่อมโยง' },
  { to: '/persons', icon: Users, label: 'บุคคลหลายคดี', description: 'วิเคราะห์บุคคล' },
  { to: '/links', icon: Link2, label: 'Case Links', description: 'รายการเชื่อมโยง' },
]

export default function Layout() {
  return (
    <div className="flex h-screen jarvis-grid-bg">
      {/* Sidebar */}
      <aside className="w-72 sidebar-jarvis flex flex-col relative">
        {/* Animated top border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] data-flow" />
        
        {/* Logo */}
        <div className="p-5 border-b border-cyan-500/20">
          <div className="flex items-center gap-3">
            {/* Arc Reactor Logo */}
            <div className="relative">
              <div className="w-12 h-12 hud-circle flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center arc-reactor">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold neon-text tracking-wide">FORENSIC LINK</h1>
              <p className="text-xs text-cyan-400/60 tracking-widest uppercase">Intelligence System</p>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="px-5 py-3 border-b border-cyan-500/10">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="status-dot status-online" />
              <span className="text-cyan-400/80">SYSTEM ONLINE</span>
            </div>
            <div className="flex items-center gap-1 text-cyan-400/50">
              <Zap className="w-3 h-3" />
              <span>v2.0</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-[10px] text-cyan-400/40 uppercase tracking-[0.2em] px-3 mb-3 flex items-center gap-2">
            <span className="flex-1 h-[1px] bg-gradient-to-r from-cyan-500/30 to-transparent" />
            NAVIGATION
            <span className="flex-1 h-[1px] bg-gradient-to-l from-cyan-500/30 to-transparent" />
          </p>
          
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative overflow-hidden ${
                  isActive
                    ? 'bg-cyan-500/15 border border-cyan-500/40'
                    : 'border border-transparent hover:bg-cyan-500/5 hover:border-cyan-500/20'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active Indicator */}
                  {isActive && (
                    <>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-400 rounded-r shadow-[0_0_10px_var(--jarvis-cyan)]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent" />
                    </>
                  )}
                  
                  <div className={`relative z-10 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-cyan-500/20 shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                      : 'bg-cyan-500/5 group-hover:bg-cyan-500/10'
                  }`}>
                    <item.icon className={`w-5 h-5 transition-all ${
                      isActive ? 'text-cyan-400' : 'text-cyan-400/50 group-hover:text-cyan-400/80'
                    }`} />
                  </div>
                  
                  <div className="flex-1 relative z-10">
                    <span className={`font-medium block text-sm transition-colors ${
                      isActive ? 'text-cyan-300' : 'text-cyan-100/70 group-hover:text-cyan-100'
                    }`}>
                      {item.label}
                    </span>
                    <span className={`text-[10px] transition-colors ${
                      isActive ? 'text-cyan-400/60' : 'text-cyan-400/30'
                    }`}>
                      {item.description}
                    </span>
                  </div>
                  
                  <ChevronRight className={`w-4 h-4 relative z-10 transition-all ${
                    isActive 
                      ? 'text-cyan-400 rotate-90' 
                      : 'text-cyan-400/30 group-hover:text-cyan-400/50 group-hover:translate-x-1'
                  }`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-cyan-500/20">
          <div className="flex items-center gap-2 mb-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all border border-transparent hover:border-cyan-500/20">
              <Settings className="w-4 h-4" />
              ตั้งค่า
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs text-cyan-400/60 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all border border-transparent hover:border-cyan-500/20">
              <HelpCircle className="w-4 h-4" />
              ช่วยเหลือ
            </button>
          </div>
          
          {/* Bottom decoration */}
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            <div className="pt-3 text-center">
              <p className="text-[10px] text-cyan-400/40 tracking-widest uppercase">Forensic Link Analysis</p>
              <p className="text-[10px] text-cyan-400/25 mt-1">© 2025 ศพฐ.10 • JARVIS UI</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-cyan-500/0" />
        <Outlet />
      </main>
      
      {/* Scan lines overlay */}
      <div className="jarvis-scanlines pointer-events-none" />
    </div>
  )
}
