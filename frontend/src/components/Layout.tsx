// src/components/Layout.tsx
import { Outlet, NavLink } from 'react-router-dom'
import { 
  Activity, 
  FileText,
  GitBranch, 
  Users, 
  Link2, 
  Search,
  Database,
  ChevronRight,
  Layers,
  Settings,
  HelpCircle
} from 'lucide-react'

const navItems = [
  { to: '/', icon: Activity, label: 'Dashboard', description: 'ภาพรวม & Insights' },
  { to: '/cases', icon: FileText, label: 'รายการคดี', description: 'ค้นหาและจัดการคดี' },
  { to: '/graph', icon: GitBranch, label: 'Graph View', description: 'แสดงความเชื่อมโยง' },
  { to: '/workspace', icon: Layers, label: 'Workspace', description: 'เปรียบเทียบคดี' },
  { to: '/persons', icon: Users, label: 'บุคคลหลายคดี', description: 'วิเคราะห์บุคคล' },
  { to: '/links', icon: Link2, label: 'Case Links', description: 'รายการเชื่อมโยง' },
  { to: '/search', icon: Search, label: 'ค้นหา', description: 'ค้นหาขั้นสูง' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-dark-300">
      {/* Sidebar */}
      <aside className="w-72 bg-dark-200 border-r border-dark-100 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-dark-100">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Database className="w-6 h-6 text-dark-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-500">Forensic Link</h1>
              <p className="text-xs text-dark-100">Intelligence System</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="text-xs text-dark-100 uppercase tracking-wider px-3 mb-2">เมนูหลัก</p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-500 shadow-lg shadow-primary-500/10'
                    : 'text-dark-100 hover:bg-dark-100/20 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-500' : ''}`} />
                  <div className="flex-1">
                    <span className="font-medium block">{item.label}</span>
                    <span className="text-xs opacity-70">{item.description}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-dark-100">
          <div className="flex items-center gap-2 mb-3">
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-dark-100 hover:text-white hover:bg-dark-100/20 rounded-lg transition-colors">
              <Settings className="w-4 h-4" />
              ตั้งค่า
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-dark-100 hover:text-white hover:bg-dark-100/20 rounded-lg transition-colors">
              <HelpCircle className="w-4 h-4" />
              ช่วยเหลือ
            </button>
          </div>
          <div className="text-xs text-dark-100 text-center">
            <p>Forensic Link Analysis v2.0</p>
            <p className="mt-1">© 2025 ศพฐ.10</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-dark-300">
        <Outlet />
      </main>
    </div>
  )
}
