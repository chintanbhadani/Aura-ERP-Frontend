import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setToken, setLoggedUser } from './slices/Base';
import type { RootState } from './store';
import { LayoutDashboard, Activity, Package, Users, ClipboardCheck, UserCog, Settings, Factory, ChevronDown, User, LogOut, ChevronLeft, ChevronRight, Database, FileText, Menu, X, Receipt, DollarSign } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import { InventoryTable } from './components/InventoryTable';
import { Login } from './components/Login';
import { Signup } from './components/Signup';
import { MasterData } from './components/MasterData';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceFormPage } from './pages/Sales/InvoiceFormPage';
import { ProductFormPage } from './pages/Inventory/ProductFormPage';
import { ExpenseList } from './components/ExpenseList';
import { DailyCashPage } from './components/DailyCashPage';
import { Settings as SettingsComponent } from './components/Settings';
import WithAuth from './components/WithAuth';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from '@mui/material/styles';
import { auraTheme } from './theme/muiTheme';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProductMasterList } from './pages/Master/ProductMasterList';
import { CategoryList } from './pages/Master/CategoryList';
import { SupplierList } from './pages/Master/SupplierList';
import { CustomerList } from './pages/Master/CustomerList';
import { UnitList } from './pages/Master/UnitList';
import { PartOfList } from './pages/Master/PartOfList';
import { SubPartOfList } from './pages/Master/SubPartOfList';
import { MachineList } from './pages/Master/MachineList';

const ProtectedDashboard = WithAuth(Dashboard);
const ProtectedInventoryTable = WithAuth(InventoryTable);
const ProtectedMasterData = WithAuth(MasterData);
const ProtectedInvoiceList = WithAuth(InvoiceList);
const ProtectedInvoiceForm = WithAuth(InvoiceFormPage);
const ProtectedProductFormPage = WithAuth(ProductFormPage);
const ProtectedExpenseList = WithAuth(ExpenseList);
const ProtectedDailyCashPage = WithAuth(DailyCashPage);
const ProtectedSettings = WithAuth(SettingsComponent);

const ModernPageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DashboardLayout>
    <div className="max-w-7xl mx-auto w-full">
      {children}
    </div>
  </DashboardLayout>
);

const Sidebar = ({ isOpen, toggleSidebar, closeMobile }: { isOpen: boolean, toggleSidebar: () => void, closeMobile?: () => void }) => {
  const location = useLocation();

  const links = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Inventory', path: '/inventory', icon: Package },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Expenses', path: '/expenses', icon: Receipt },
    { name: 'Daily Cash', path: '/daily-cash', icon: DollarSign },
    { 
      name: 'Master Data', 
      icon: Database,
      subItems: [
        { name: 'Item Group', path: '/master/categories' },
        { name: 'Part Of', path: '/master/part-of' },
        { name: 'Sub Part Of', path: '/master/sub-part-of' },
        { name: 'Suppliers', path: '/master/suppliers' },
        { name: 'Customers', path: '/master/customers' },
        { name: 'Units', path: '/master/units' },
        { name: 'Machines', path: '/master/machines' },
        { name: 'Item Master', path: '/master/skus' }
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
      
      <Link to="/" className={`p-6 flex items-center ${isOpen ? 'gap-3' : 'justify-center'} text-primary font-bold text-xl mb-6 mt-2 hover:opacity-80 transition-opacity`}>
        <Factory className="w-6 h-6 shrink-0" />
        {isOpen && <span>Aura ERP</span>}
      </Link>
      
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
  return <div className="min-h-screen bg-background">{children}</div>;
};

function App() {
  return (
    <ThemeProvider theme={auraTheme}>
      <Router>
        <ToastContainer position="top-right" autoClose={4000} />
        <AppLayout>
          <Routes>
            <Route path="/" element={<ProtectedDashboard />} />
            <Route path="/inventory" element={<ModernPageWrapper><ProtectedInventoryTable /></ModernPageWrapper>} />
            <Route path="/inventory/new" element={<ProtectedProductFormPage />} />
            <Route path="/inventory/edit" element={<ProtectedProductFormPage />} />
            <Route path="/invoices" element={<ModernPageWrapper><ProtectedInvoiceList /></ModernPageWrapper>} />
            <Route path="/invoices/new" element={<ProtectedInvoiceForm />} />
            <Route path="/expenses" element={<ModernPageWrapper><ProtectedExpenseList /></ModernPageWrapper>} />
            <Route path="/daily-cash" element={<ModernPageWrapper><ProtectedDailyCashPage /></ModernPageWrapper>} />

            {/* Master Data Routes - Modern Patel Strap ERP Design */}
            <Route path="/master/skus" element={<ProductMasterList />} />
            <Route path="/master-data/skus" element={<ProductMasterList />} />
            <Route path="/master/categories" element={<CategoryList />} />
            <Route path="/master-data/categories" element={<CategoryList />} />
            <Route path="/master/suppliers" element={<SupplierList />} />
            <Route path="/master-data/suppliers" element={<SupplierList />} />
            <Route path="/master/customers" element={<CustomerList />} />
            <Route path="/master-data/customers" element={<CustomerList />} />
            <Route path="/master/units" element={<UnitList />} />
            <Route path="/master-data/units" element={<UnitList />} />
            <Route path="/master/part-of" element={<PartOfList />} />
            <Route path="/master/sub-part-of" element={<SubPartOfList />} />
            <Route path="/master/machines" element={<MachineList />} />
            <Route path="/products" element={<ProductMasterList />} />
            <Route path="/products/new" element={<ProtectedProductFormPage />} />
            <Route path="/products/edit" element={<ProtectedProductFormPage />} />

            {/* Fallback for other master-data types */}
            <Route path="/master-data/:type" element={<ModernPageWrapper><ProtectedMasterData /></ModernPageWrapper>} />
            <Route path="/settings" element={<ModernPageWrapper><ProtectedSettings /></ModernPageWrapper>} />
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
