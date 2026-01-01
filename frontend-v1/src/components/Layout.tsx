import { Outlet, NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  GitBranch, 
  Users, 
  Link2, 
  Search,
  Database,
  ChevronRight
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/graph', icon: GitBranch, label: 'Graph View' },
  { to: '/persons', icon: Users, label: 'บุคคลหลายคดี' },
  { to: '/links', icon: Link2, label: 'Case Links' },
  { to: '/search', icon: Search, label: 'ค้นหา' },
]

export default function Layout() {
  return (
    <div className="flex h-screen bg-dark-300">
      {/* Sidebar */}
      <aside className="w-64 bg-dark-200 border-r border-dark-100 flex flex-col">
        {/* Logo */}
        <div className="p-4 border-b border-dark-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-dark-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-primary-500">Forensic Link</h1>
              <p className="text-xs text-dark-100">ศพฐ.10</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-500'
                    : 'text-dark-100 hover:bg-dark-100/20 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-dark-100">
          <div className="text-xs text-dark-100">
            <p>Forensic Link Analysis v1.0</p>
            <p className="mt-1">© 2025 ศพฐ.10</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
