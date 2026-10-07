import { Outlet, Link } from 'react-router-dom';
import { Activity, Kanban, LayoutDashboard, Settings, User } from 'lucide-react';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-dark-900 text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-dark-700 bg-dark-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-dark-700">
          <div className="flex items-center gap-2 text-primary-500 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded bg-primary-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary-500" />
            </div>
            DevFlow
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link to="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-md bg-dark-700/50 text-slate-100 font-medium transition-colors">
            <LayoutDashboard className="w-5 h-5 text-slate-400" />
            Dashboard
          </Link>
          <Link to="/issues" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-dark-700/50 text-slate-400 hover:text-slate-100 font-medium transition-colors">
            <Kanban className="w-5 h-5" />
            Issues
          </Link>
          <Link to="/settings" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-dark-700/50 text-slate-400 hover:text-slate-100 font-medium transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-dark-700">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-slate-200">Mughees Ali</span>
              <span className="text-xs text-slate-500">Workspace Owner</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b border-dark-700 bg-dark-900/50 backdrop-blur-sm z-10">
          <h2 className="text-lg font-medium">Overview</h2>
          <button className="btn btn-primary text-sm shadow-lg shadow-primary-500/20">
            Create Issue
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
