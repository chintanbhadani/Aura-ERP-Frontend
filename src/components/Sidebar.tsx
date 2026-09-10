import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  Activity, 
  ClipboardCheck, 
  Users, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Factory,
  Briefcase,
  Database,
  ChevronDown,
  Receipt,
  FileText
} from 'lucide-react';
import { cn } from './Button';

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  subItems?: { name: string; href: string }[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { 
    name: 'Master Data', 
    icon: Database,
    subItems: [
      { name: 'Categories', href: '/master-data/categories' },
      { name: 'Suppliers', href: '/master-data/suppliers' },
      { name: 'Units', href: '/master-data/units' },
      { name: 'Product Master', href: '/master-data/skus' }
    ]
  },
];

export function Sidebar({ isOpen = false, onClose = () => {} }: { isOpen?: boolean, onClose?: () => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMasterDataOpen, setIsMasterDataOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:relative flex flex-col bg-white border-r border-gray-200 h-screen transition-transform duration-300 md:translate-x-0",
          isCollapsed ? "w-20" : "w-64",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
      {/* Header / Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        {!isCollapsed && (
          <div className="flex items-center gap-2 text-primary-600 font-bold text-lg whitespace-nowrap overflow-hidden">
            <Factory size={24} />
            <span>Patel Strap ERP</span>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto text-primary-600">
            <Factory size={24} />
          </div>
        )}
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 absolute -right-3 top-5 bg-white border border-gray-200 shadow-sm z-10 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <div key={item.name}>
              {item.subItems ? (
                <button
                  onClick={() => setIsMasterDataOpen(!isMasterDataOpen)}
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors font-medium text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 cursor-pointer",
                    isCollapsed ? "justify-center px-0" : ""
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className="flex-shrink-0 text-gray-500" />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown size={16} className={`transition-transform ${isMasterDataOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>
              ) : (
                <Link
                  to={item.href || '#'}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm cursor-pointer",
                    isActive 
                      ? "bg-primary-600 text-white shadow-md shadow-primary-500/20" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    isCollapsed ? "justify-center px-0" : ""
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon size={20} className={cn("flex-shrink-0", isActive ? "text-white" : "text-gray-500")} />
                  {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                </Link>
              )}
              
              {item.subItems && isMasterDataOpen && !isCollapsed && (
                <div className="mt-1 ml-9 space-y-1">
                  {item.subItems.map(subItem => (
                    <Link
                      key={subItem.name}
                      to={subItem.href}
                      className={cn(
                        "block px-4 py-2 text-sm rounded-lg transition-colors cursor-pointer",
                        location.pathname === subItem.href
                          ? "bg-primary-50 text-primary-600 font-medium"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      {subItem.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
