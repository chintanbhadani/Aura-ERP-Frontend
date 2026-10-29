import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setToken, setLoggedUser } from '../lib/slice/Base';
import type { ReduxState } from '../helper/fe.interface';
import { hasModulePermission } from '../helper/helper';
import { ModuleName, Permission } from '../helper/constants';
import { 
  LogOut, 
  User, 
  Settings, 
  ChevronDown, 
  Menu, 
  Search,
  Home,
  Package,
  ClipboardCheck,
  Users,
  Receipt,
  Wallet,
  FolderTree,
  Truck,
  Ruler,
  Tags,
  UserCheck,
  HelpCircle,
  FileText,
  ClipboardList,
  ShoppingCart,
  TrendingUp
} from 'lucide-react';

import Breadcrumbs from '../components/Breadcrumbs';
import ThemeToggle from '../components/motion/ThemeToggle';

interface GlobalSearchItem {
  name: string;
  href: string;
  category: string;
  icon: React.ElementType;
  moduleName?: string;
  requiredPermission?: string;
}

const GLOBAL_NAV_ITEMS: GlobalSearchItem[] = [
  { name: 'Item List', href: '/master/skus', category: 'Master Data', icon: Tags, moduleName: ModuleName.INVENTORY_PRODUCTS, requiredPermission: Permission.LIST },
  { name: 'Item Group', href: '/master/categories', category: 'Master Data', icon: FolderTree, moduleName: ModuleName.MASTER_DATA, requiredPermission: Permission.LIST },
  { name: 'Suppliers', href: '/master/suppliers', category: 'Master Data', icon: Truck, moduleName: ModuleName.SUPPLIERS, requiredPermission: Permission.LIST },
  { name: 'Customers', href: '/master/customers', category: 'Master Data', icon: Users, moduleName: ModuleName.CLIENTS, requiredPermission: Permission.LIST },
  { name: 'Units', href: '/master/units', category: 'Master Data', icon: Ruler, moduleName: ModuleName.MASTER_DATA, requiredPermission: Permission.LIST },
  { name: 'Purchase Order List', href: '/purchase-order', category: 'Buying', icon: ShoppingCart, moduleName: ModuleName.PURCHASE_ORDERS, requiredPermission: Permission.LIST },
  { name: 'Goods Receipt (GRN List)', href: '/grn', category: 'Inventory', icon: ClipboardCheck, moduleName: ModuleName.GRN, requiredPermission: Permission.LIST },
  // { name: 'Stock Entry List', href: '/stock-entry', category: 'Inventory', icon: Package },
  { name: 'Material Request List', href: '/material-request', category: 'Inventory', icon: ClipboardList, moduleName: ModuleName.MATERIAL_REQUISITION, requiredPermission: Permission.LIST },
  { name: 'Production Orders', href: '/production-orders', category: 'CRM', icon: ClipboardCheck, moduleName: ModuleName.PRODUCTION_ORDERS, requiredPermission: Permission.LIST },
  { name: 'Invoices', href: '/invoices', category: 'Sales', icon: Receipt, moduleName: ModuleName.TAX_INVOICES, requiredPermission: Permission.LIST },
  { name: 'Clients', href: '/clients', category: 'CRM', icon: UserCheck, moduleName: ModuleName.CLIENTS, requiredPermission: Permission.LIST },
  { name: 'Inquiries', href: '/inquiries', category: 'CRM', icon: HelpCircle, moduleName: ModuleName.INQUIRIES, requiredPermission: Permission.LIST },
  { name: 'Quotations', href: '/quotations', category: 'CRM', icon: FileText, moduleName: ModuleName.QUOTATIONS, requiredPermission: Permission.LIST },
  { name: 'Proforma Invoices', href: '/proforma', category: 'CRM', icon: Receipt, moduleName: ModuleName.PROFORMA_INVOICES, requiredPermission: Permission.LIST },
  { name: 'Expenses', href: '/expenses', category: 'Finance', icon: Wallet, moduleName: ModuleName.EXPENSES, requiredPermission: Permission.LIST },
  { name: 'Sales Report', href: '/finance/sales-report', category: 'Finance', icon: TrendingUp, moduleName: ModuleName.TAX_INVOICES, requiredPermission: Permission.LIST },
  { name: 'Dashboard', href: '/', category: 'General', icon: Home, moduleName: ModuleName.DASHBOARD, requiredPermission: Permission.VIEW_DASHBOARD },
  { name: 'My Profile', href: '/profile', category: 'General', icon: User },
];

const ROUTE_BREADCRUMBS: Record<string, { module: string; page: string }> = {
  '/': { module: 'Home', page: 'Dashboard' },
  '/stock': { module: 'Stock', page: 'Stock Workspace' },
  '/stock/dashboard': { module: 'Stock', page: 'Stock Workspace' },
  '/inventory': { module: 'Stock', page: 'Stock Workspace' },
  '/master/skus': { module: 'Stock', page: 'Item' },
  '/master/categories': { module: 'Stock', page: 'Item Group' },
  '/master/suppliers': { module: 'Buying', page: 'Supplier' },
  '/master/customers': { module: 'Selling', page: 'Customer' },
  '/master/units': { module: 'Stock', page: 'Unit of Measure' },
  '/purchase-order': { module: 'Buying', page: 'Purchase Order' },
  '/purchase-order/new': { module: 'Buying', page: 'New Purchase Order' },
  '/buying/purchase-order': { module: 'Buying', page: 'Purchase Order' },
  '/buying/purchase-order/new': { module: 'Buying', page: 'New Purchase Order' },
  '/grn': { module: 'Stock', page: 'Goods Receipt (GRN)' },
  '/stock-entry': { module: 'Stock', page: 'Stock Entry' },
  '/material-request': { module: 'Stock', page: 'Material Request' },
  '/material-request/new': { module: 'Stock', page: 'New Material Request' },
  '/invoices': { module: 'Selling', page: 'Invoices' },
  '/clients': { module: 'CRM', page: 'Clients' },
  '/inquiries': { module: 'CRM', page: 'Inquiries' },
  '/quotations': { module: 'CRM', page: 'Quotations' },
  '/proforma': { module: 'CRM', page: 'Proforma Invoices' },
  '/production-orders': { module: 'CRM', page: 'Production Orders' },
  '/production-orders/new': { module: 'CRM', page: 'New Production Order' },
  '/production-order': { module: 'CRM', page: 'Production Orders' },
  '/production-order/new': { module: 'CRM', page: 'New Production Order' },
  '/expenses': { module: 'Finance', page: 'Expenses' },
  '/finance/sales-report': { module: 'Finance', page: 'Sales Report' },
  '/sales-report': { module: 'Finance', page: 'Sales Report' },
  '/profile': { module: 'User', page: 'My Profile' },
  '/products/new': { module: 'Stock', page: 'New Item' },
  '/products/edit': { module: 'Stock', page: 'Edit Item' },
  '/suppliers/new': { module: 'Buying', page: 'New Supplier' },
  '/suppliers/edit': { module: 'Buying', page: 'Edit Supplier' },
  '/customers/new': { module: 'Selling', page: 'New Customer' },
  '/customers/edit': { module: 'Selling', page: 'Edit Customer' },
};

function renderDynamicBreadcrumb(pathname: string, recordCode?: string) {
  const exact = ROUTE_BREADCRUMBS[pathname];
  if (exact) {
    const isEditPage = exact.page.startsWith('Edit ');
    const isNewPage = exact.page.startsWith('New ');

    let entityName = exact.page;
    if (isEditPage) entityName = exact.page.replace('Edit ', '');
    if (isNewPage) entityName = exact.page.replace('New ', '');

    const activeCode = recordCode && recordCode.toLowerCase() !== 'new' ? recordCode : undefined;

    return (
      <Breadcrumbs
        module={exact.module}
        entity={entityName}
        code={activeCode}
      />
    );
  }

  const matchingKey = Object.keys(ROUTE_BREADCRUMBS).find(key => key !== '/' && pathname.startsWith(key));
  if (matchingKey) {
    const match = ROUTE_BREADCRUMBS[matchingKey];
    let entityName = match.page.replace('Edit ', '').replace('New ', '');
    return (
      <Breadcrumbs
        module={match.module}
        entity={entityName}
        code={recordCode}
      />
    );
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const moduleName = parts.length > 1 ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Stock';
  const pageName = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1);

  return (
    <Breadcrumbs
      module={moduleName}
      entity={pageName}
      code={recordCode}
    />
  );
}

function GlobalSearchInput({
  value,
  onChange,
  isMobile = false
}: {
  value?: string;
  onChange?: (val: string) => void;
  isMobile?: boolean;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (onChange) onChange(val);
    setIsOpen(true);
  };

  const roleDetails = useSelector((state: ReduxState) => state.base?.roleDetails);
  const permissionsDetails = useMemo(() => {
    if (roleDetails?.permissionsDetails) return roleDetails.permissionsDetails;
    try {
      const cached = localStorage.getItem('roleDetails');
      return cached ? JSON.parse(cached)?.permissionsDetails : undefined;
    } catch {
      return undefined;
    }
  }, [roleDetails]);

  const filteredItems = GLOBAL_NAV_ITEMS.filter(item => {
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (item.moduleName && permissionsDetails && Array.isArray(permissionsDetails)) {
      return hasModulePermission(
        permissionsDetails,
        item.moduleName,
        item.requiredPermission || Permission.LIST
      );
    }
    return true;
  });

  return (
    <div className={`relative ${isMobile ? 'w-full' : 'w-64 md:w-80'}`}>
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={isMobile ? "Search commands or items..." : "Search or type a command (⌘ + G)"}
          className="w-full bg-gray-100/90 hover:bg-gray-100 focus:bg-white border border-gray-200 focus:border-primary-500 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none transition-all shadow-2xs"
        />
      </div>

      {/* Popover Dropdown for Global Commands */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 left-0 mt-1.5 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/90 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-80 overflow-y-auto">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 flex items-center justify-between transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-3.5 h-3.5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    <span className="font-semibold text-gray-900 group-hover:text-primary-700">{item.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-100 group-hover:bg-primary-100 group-hover:text-primary-600 px-2 py-0.5 rounded-full font-medium">
                    {item.category}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-gray-500 text-center">
                No commands found for "<span className="font-medium text-gray-700">{query}</span>"
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  breadcrumb?: React.ReactNode;
  headerSearch?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  recordCode?: string;
}

export function DashboardLayout({ children, breadcrumb, headerSearch, searchValue, onSearchChange, recordCode }: DashboardLayoutProps) {
  const { user } = useSelector((state: any) => state.base);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = () => {
    dispatch(setToken(null));
    dispatch(setLoggedUser(null));
    navigate('/login');
  };

  const displayName = user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) || user?.name || user?.username || user?.email || 'Admin';
  const role = (user?.role || 'Admin').replace('_', ' ').toLowerCase();
  
  // Extract initials for the avatar
  const initials = (user?.firstName && user?.lastName)
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : displayName.split(/[\s@._]+/).filter(Boolean).map((n: string) => n[0] || '').join('').substring(0, 2).toUpperCase() || 'A';

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isMobileOpen={isMobileMenuOpen} onMobileClose={() => setIsMobileMenuOpen(false)} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col relative w-full">
        {/* Header */}
        <header className="sticky top-0 z-30 shrink-0 bg-white border-b border-gray-200">
          <div className="h-13 flex items-center justify-between px-3 sm:px-4 gap-2">
            {/* Left: Mobile Toggle & Dynamic Breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button 
                className="md:hidden p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg shrink-0 cursor-pointer"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="truncate min-w-0">
                {breadcrumb !== undefined ? breadcrumb : renderDynamicBreadcrumb(location.pathname, recordCode)}
              </div>
            </div>

            {/* Right: Search Field (Desktop) & Profile Button */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:block">
                {headerSearch !== undefined ? (
                  headerSearch
                ) : (
                  <GlobalSearchInput value={searchValue} onChange={onSearchChange} />
                )}
              </div>

              <ThemeToggle size="sm" />
              
              <div className="relative shrink-0" ref={menuRef}>
                {/* User Button */}
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2 bg-white border border-gray-200 shadow-2xs p-1 pr-2.5 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white font-bold text-xs shadow-inner">
                    {initials}
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                    
                    {/* User Info Header */}
                    <div className="px-4 py-3 flex items-center gap-3 bg-gray-50/60 rounded-t-2xl border-b border-gray-100">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-primary-500 flex items-center justify-center text-white font-bold text-sm shadow-inner shrink-0">
                        {initials}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-bold text-gray-900 truncate" title={displayName}>{displayName}</p>
                        <p className="text-[11px] font-medium text-gray-500 capitalize truncate">{role}</p>
                      </div>
                    </div>

                    <div className="px-2 py-1.5 space-y-0.5">
                      <button 
                        onClick={() => { navigate('/profile'); setShowMenu(false); }}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-2.5 group cursor-pointer"
                      >
                        <User className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        My Profile
                      </button>
                      <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-2.5 group cursor-pointer">
                        <Settings className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                        Settings
                      </button>
                    </div>

                    <div className="px-3 py-2 mt-1">
                      <button 
                        onClick={handleLogout}
                        className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-red-500/25 cursor-pointer"
                      >
                        Logout <LogOut className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Second Line on Mobile: Full-width Search Field */}
          <div className="md:hidden px-3 pb-2 pt-0.5 border-t border-gray-100">
            {headerSearch !== undefined ? (
              headerSearch
            ) : (
              <GlobalSearchInput value={searchValue} onChange={onSearchChange} isMobile />
            )}
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export default DashboardLayout;
