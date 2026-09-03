import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Activity, Package, Users, ClipboardCheck, UserCog, Settings, Factory, ChevronDown, User, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { InventoryTable } from './components/InventoryTable';
import { Login } from './components/Login';
import { Signup } from './components/Signup';

const Sidebar = ({ isOpen, toggleSidebar }: { isOpen: boolean, toggleSidebar: () => void }) => {
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Active Jobs', path: '#', icon: Activity },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Clients CRM', path: '#', icon: Users },
    { name: 'QC Logs', path: '#', icon: ClipboardCheck },
    { name: 'User Roles', path: '#', icon: UserCog },
    { name: 'Settings', path: '#', icon: Settings },
  ];

  return (
    <div className={`${isOpen ? 'w-60' : 'w-20'} bg-white border-r border-gray-100 flex flex-col h-screen fixed left-0 top-0 z-20 transition-all duration-300`}>
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 bg-white border border-gray-200 rounded-md p-1 shadow-sm text-gray-500 hover:text-gray-700 z-30"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      
      <div className={`p-6 flex items-center ${isOpen ? 'gap-3' : 'justify-center'} text-[#0f8b5a] font-bold text-xl mb-6 mt-2`}>
        <Factory className="w-6 h-6 shrink-0" />
        {isOpen && <span>Aura ERP</span>}
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.name}
              to={link.path}
              title={!isOpen ? link.name : undefined}
              className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2.5 rounded-lg font-medium transition-colors text-sm ${
                isActive 
                  ? 'bg-[#0f8b5a] text-white' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              {isOpen && <span className="whitespace-nowrap">{link.name}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const TopBar = () => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="flex justify-end p-6 relative z-10 w-full max-w-7xl mx-auto">
      <button 
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center gap-2 bg-white rounded-full p-1 pr-3 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors relative z-50"
      >
        <div className="bg-[#0f8b5a] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs">
          JD
        </div>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isUserMenuOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsUserMenuOpen(false)}
          ></div>
          <div className="absolute top-20 right-6 w-64 bg-white rounded-2xl shadow-lg border border-gray-100 z-50 overflow-hidden py-2">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
              <div className="bg-[#0f8b5a] text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                JD
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">John Doe</p>
                <p className="text-gray-400 text-xs">Admin</p>
              </div>
            </div>
            <div className="py-2">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                <User className="w-4 h-4" />
                My Profile
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
            <div className="px-4 pb-2">
              <button 
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors mt-2"
              >
                Logout
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  if (isAuthPage) {
    return <div className="min-h-screen bg-[#ebf7f0]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#ebf7f0] flex">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'ml-60' : 'ml-20'}`}>
        <TopBar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<InventoryTable />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
}

export default App;
