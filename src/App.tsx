import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setToken, setLoggedUser } from './slices/Base';
import type { RootState } from './store';
import { LayoutDashboard, Activity, Package, Users, ClipboardCheck, UserCog, Settings, Factory, ChevronDown, User, LogOut, ChevronLeft, ChevronRight, Database, FileText, Menu, X } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { InventoryTable } from './components/InventoryTable';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { MasterData } from './components/MasterData';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceFormPage } from './pages/Sales/InvoiceFormPage';
import { ProductFormPage } from './pages/Inventory/ProductFormPage';
import { Settings as SettingsComponent } from './components/Settings';
import WithAuth from './components/WithAuth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from '@mui/material/styles';
import { auraTheme } from './theme/muiTheme';

const ProtectedDashboard = WithAuth(Dashboard);
const ProtectedInventoryTable = WithAuth(InventoryTable);
const ProtectedMasterData = WithAuth(MasterData);
const ProtectedInvoiceList = WithAuth(InvoiceList);
const ProtectedInvoiceForm = WithAuth(InvoiceFormPage);
const ProtectedProductFormPage = WithAuth(ProductFormPage);
const ProtectedSettings = WithAuth(SettingsComponent);

const Sidebar = ({ isOpen, toggleSidebar, closeMobile }: { isOpen: boolean, toggleSidebar: () => void, closeMobile?: () => void }) => {
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { 
      name: 'Master Data', 
      icon: Database,
      subItems: [
        { name: 'Categories', path: '/master-data/categories' },
        { name: 'Suppliers', path: '/master-data/suppliers' },
        { name: 'Customers', path: '/master-data/customers' },
        { name: 'Units', path: '/master-data/units' }
      ]
    },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];

  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);

  return (
    <div className={`${isOpen ? 'w-60' : 'w-20'} bg-white border-r border-gray-100 flex flex-col h-full z-50 transition-all duration-300 relative`}>
      <button 
        onClick={toggleSidebar}
        className="hidden md:flex absolute -right-3 top-6 bg-white border border-gray-200 rounded-md p-1 shadow-sm text-gray-500 hover:text-gray-700 z-30"
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      <button 
        onClick={closeMobile}
        className="md:hidden absolute right-4 top-6 text-gray-500 hover:text-gray-700 p-2"
      >
        <X className="w-5 h-5" />
      </button>
      
      <div className={`p-6 flex items-center ${isOpen ? 'gap-3' : 'justify-center'} text-primary font-bold text-xl mb-6 mt-2`}>
        <Factory className="w-6 h-6 shrink-0" />
        {isOpen && <span>Aura ERP</span>}
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <div key={link.name}>
              {link.subItems ? (
                <button
                  onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                  title={!isOpen ? link.name : undefined}
                  className={`w-full flex items-center justify-between ${isOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2.5 rounded-lg font-medium transition-colors text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 cursor-pointer`}
                >
                  <div className={`flex items-center ${isOpen ? 'gap-3' : 'justify-center'}`}>
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                    {isOpen && <span className="whitespace-nowrap">{link.name}</span>}
                  </div>
                  {isOpen && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${isMasterDataOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>
              ) : (
                <Link
                  to={link.path || '#'}
                  title={!isOpen ? link.name : undefined}
                  className={`flex items-center ${isOpen ? 'gap-3 px-4' : 'justify-center px-0'} py-2.5 rounded-lg font-medium transition-colors text-sm ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" />
                  {isOpen && <span className="whitespace-nowrap">{link.name}</span>}
                </Link>
              )}
              {link.subItems && isMasterDataOpen && isOpen && (
                <div className="mt-1 ml-9 space-y-1">
                  {link.subItems.map(subItem => (
                    <Link
                      key={subItem.name}
                      to={subItem.path}
                      className={`block px-4 py-2 text-sm rounded-lg transition-colors ${
                        location.pathname === subItem.path
                          ? 'bg-primary-bg text-primary font-medium'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
};

const TopBar = ({ toggleMobileMenu }: { toggleMobileMenu?: () => void }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.base.user);

  const handleLogout = () => {
    dispatch(setToken(null));
    dispatch(setLoggedUser(null));
    navigate('/login');
  };

  return (
    <div className="flex justify-between md:justify-end items-center p-4 md:p-6 relative z-10 w-full max-w-7xl mx-auto">
      <button 
        onClick={toggleMobileMenu}
        className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <Menu className="w-6 h-6" />
      </button>
      <button 
        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        className="flex items-center gap-2 bg-white rounded-full p-1 pr-3 shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors relative z-50 cursor-pointer"
      >
        <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase">
          {user?.name ? user.name.substring(0, 2) : 'U'}
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
              <div className="bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                {user?.username ? user?.username.substring(0, 2) : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-gray-900 font-semibold text-sm truncate">{user?.username || ''}</p>
                <p className="text-gray-400 text-xs truncate">{user?.role || user?.email || ''}</p>
              </div>
            </div>
            <div className="py-2">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
                <User className="w-4 h-4" />
                My Profile
              </button>
              <button 
                onClick={() => {
                  setIsUserMenuOpen(false);
                  navigate('/settings');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
            </div>
            <div className="px-4 pb-2">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors mt-2 cursor-pointer"
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (isAuthPage) {
    return <div className="min-h-screen bg-[#ebf7f0]">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#ebf7f0] flex overflow-hidden">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Desktop and Mobile */}
      <div className={`fixed inset-y-0 left-0 z-50 md:z-20 transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          isOpen={isSidebarOpen} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          closeMobile={() => setIsMobileMenuOpen(false)} 
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto transition-all duration-300">
        <TopBar toggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-4 md:px-8 pb-8">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider theme={auraTheme}>
      <Router>
        <ToastContainer position="top-right" autoClose={4000} />
        <AppLayout>
          <Routes>
            <Route path="/" element={<ProtectedDashboard />} />
            <Route path="/inventory" element={<ProtectedInventoryTable />} />
            <Route path="/inventory/new" element={<ProtectedProductFormPage />} />
            <Route path="/inventory/edit/:id" element={<ProtectedProductFormPage />} />
            <Route path="/invoices" element={<ProtectedInvoiceList />} />
            <Route path="/invoices/new" element={<ProtectedInvoiceForm />} />
            <Route path="/master-data/:type" element={<ProtectedMasterData />} />
            <Route path="/settings" element={<ProtectedSettings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AppLayout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
