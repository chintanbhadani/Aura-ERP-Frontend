import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { AuraLogo } from './AuraLogo';
import { 
  Home, 
  Package, 
  Activity, 
  ClipboardCheck, 
  Users, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Factory,
  Briefcase,
  UserCheck,
  User,
  ShieldCheck,
  HelpCircle,
  FileText,
  Receipt,
  Wallet,
  Database,
  FolderTree,
  Layers,
  Truck,
  Ruler,
  Tags,
  ClipboardList,
  ShoppingCart,
  Boxes,
  Scale,
  Landmark,
  TrendingUp,
  X
} from 'lucide-react';
import { cn } from './Button';
import type { ReduxState } from '../helper/fe.interface';
import { hasModulePermission, shouldShowMenuGroup } from '../helper/helper';
import { ModuleName, Permission } from '../helper/constants';

interface SubNavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  moduleName?: string;
  requiredPermission?: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  moduleName?: string;
  requiredPermission?: string;
  moduleNames?: string[];
  children?: SubNavItem[];
}

const navItems: NavItem[] = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: Home,
    moduleName: ModuleName.DASHBOARD,
    requiredPermission: Permission.VIEW_DASHBOARD
  },
  { 
    name: 'Invoice', 
    icon: Receipt,
    moduleNames: [
      ModuleName.TAX_INVOICES
    ],
    children: [
      { name: 'Sales Invoice', href: '/invoices/sales', icon: FileText, moduleName: ModuleName.TAX_INVOICES, requiredPermission: Permission.LIST },
      { name: 'Purchase Invoice', href: '/invoices/purchase', icon: ShoppingCart, moduleName: ModuleName.TAX_INVOICES, requiredPermission: Permission.LIST },
    ]
  },
  { 
    name: 'Stock', 
    icon: Boxes,
    moduleNames: [
      ModuleName.INVENTORY_PRODUCTS,
      ModuleName.MATERIAL_REQUISITION,
      ModuleName.GRN,
      ModuleName.STOCK_ENTRIES
    ],
    children: [
      { name: 'Dashboard', href: '/stock', icon: Home, moduleName: ModuleName.INVENTORY_PRODUCTS, requiredPermission: Permission.LIST },
      { name: 'Material Request', href: '/material-request', icon: ClipboardList, moduleName: ModuleName.MATERIAL_REQUISITION, requiredPermission: Permission.LIST },
      { name: 'Goods Receipt (GRN)', href: '/grn', icon: ClipboardCheck, moduleName: ModuleName.GRN, requiredPermission: Permission.LIST },
      // { name: 'Stock Entry', href: '/stock-entry', icon: Package },
      { name: 'Stock Ledger', href: '/stock-ledger', icon: Activity, moduleName: ModuleName.STOCK_ENTRIES, requiredPermission: Permission.LIST },
      { name: 'Bin Report (Stock Balance)', href: '/bin-report', icon: Boxes, moduleName: ModuleName.INVENTORY_PRODUCTS, requiredPermission: Permission.LIST },
    ]
  },
  /* Production and CRM commented out temporarily for future work
  { 
    name: 'Production', 
    icon: Factory,
    moduleNames: [
      ModuleName.PRODUCTION_ORDERS,
      ModuleName.BOM,
      ModuleName.PRODUCTION_PLANNING,
      ModuleName.PRODUCTION_WEIGHING
    ],
    children: [
      { name: 'Production Orders', href: '/production-orders', icon: ClipboardCheck, moduleName: ModuleName.PRODUCTION_ORDERS, requiredPermission: Permission.LIST },
      { name: 'BOM (Bill of Materials)', href: '/bom', icon: Layers, moduleName: ModuleName.BOM, requiredPermission: Permission.LIST },
      { name: 'Production Planning', href: '/production-planning', icon: Factory, moduleName: ModuleName.PRODUCTION_PLANNING, requiredPermission: Permission.LIST },
      { name: 'Production Weighing', href: '/production/weighing', icon: Scale, moduleName: ModuleName.PRODUCTION_WEIGHING, requiredPermission: Permission.LIST },
    ]
  },
  { 
    name: 'CRM', 
    icon: Briefcase,
    moduleNames: [
      ModuleName.CLIENTS,
      ModuleName.INQUIRIES,
      ModuleName.QUOTATIONS,
      ModuleName.PROFORMA_INVOICES
    ],
    children: [
      { name: 'Clients', href: '/clients', icon: UserCheck, moduleName: ModuleName.CLIENTS, requiredPermission: Permission.LIST },
      { name: 'Inquiries', href: '/inquiries', icon: HelpCircle, moduleName: ModuleName.INQUIRIES, requiredPermission: Permission.LIST },
      { name: 'Quotations', href: '/quotations', icon: FileText, moduleName: ModuleName.QUOTATIONS, requiredPermission: Permission.LIST },
      { name: 'Proforma Invoices', href: '/proforma', icon: Receipt, moduleName: ModuleName.PROFORMA_INVOICES, requiredPermission: Permission.LIST },
    ]
  },
  */
  { 
    name: 'Finance', 
    icon: Landmark,
    moduleNames: [
      ModuleName.EXPENSES,
      ModuleName.TAX_INVOICES
    ],
    children: [
      { name: 'Expenses', href: '/expenses', icon: Wallet, moduleName: ModuleName.EXPENSES, requiredPermission: Permission.LIST },
      { name: 'Sales Report', href: '/finance/sales-report', icon: TrendingUp, moduleName: ModuleName.TAX_INVOICES, requiredPermission: Permission.LIST },
      { name: 'Cash Book & Balance Sheet', href: '/finance/cash-book', icon: Scale, moduleName: ModuleName.EXPENSES, requiredPermission: Permission.LIST },
    ]
  },
  { 
    name: 'User Management', 
    icon: Users,
    moduleNames: [
      ModuleName.USER_MANAGEMENT,
      ModuleName.ROLE_PERMISSIONS
    ],
    children: [
      { name: 'Users', href: '/users', icon: UserCheck, moduleName: ModuleName.USER_MANAGEMENT, requiredPermission: Permission.LIST },
      { name: 'Roles', href: '/roles', icon: ShieldCheck, moduleName: ModuleName.ROLE_PERMISSIONS, requiredPermission: Permission.LIST },
      { name: 'My Profile', href: '/profile', icon: User },
    ]
  },
  { 
    name: 'Master Data', 
    icon: Database,
    moduleNames: [
      ModuleName.MASTER_DATA,
      ModuleName.SUPPLIERS,
      ModuleName.CLIENTS,
      ModuleName.INVENTORY_PRODUCTS
    ],
    children: [
      { name: 'Item Group', href: '/master/categories', icon: FolderTree, moduleName: ModuleName.MASTER_DATA, requiredPermission: Permission.LIST },
      { name: 'Part Of', href: '/master/part-of', icon: Layers, moduleName: ModuleName.MASTER_DATA, requiredPermission: Permission.LIST },
      { name: 'Sub Part Of', href: '/master/sub-part-of', icon: Layers, moduleName: ModuleName.MASTER_DATA, requiredPermission: Permission.LIST },
      { name: 'Suppliers', href: '/master/suppliers', icon: Truck, moduleName: ModuleName.SUPPLIERS, requiredPermission: Permission.LIST },
      { name: 'Customers', href: '/master/customers', icon: Users, moduleName: ModuleName.CLIENTS, requiredPermission: Permission.LIST },
      { name: 'Units', href: '/master/units', icon: Ruler, moduleName: ModuleName.MASTER_DATA, requiredPermission: Permission.LIST },
      { name: 'Item Master', href: '/master/skus', icon: Tags, moduleName: ModuleName.INVENTORY_PRODUCTS, requiredPermission: Permission.LIST },
    ]
  },
];

export interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1280;
    }
    return false;
  });
  const location = useLocation();

  const reduxRoleDetails = useSelector((state: ReduxState) => state.base?.roleDetails);

  // Read permissionsDetails from Redux or cached localStorage
  const permissionsDetails = useMemo(() => {
    if (reduxRoleDetails?.permissionsDetails) {
      return reduxRoleDetails.permissionsDetails;
    }
    try {
      const cached = localStorage.getItem('roleDetails');
      return cached ? JSON.parse(cached)?.permissionsDetails : undefined;
    } catch {
      return undefined;
    }
  }, [reduxRoleDetails]);

  // Filter visible nav items according to user permissions (matching LIMS pattern)
  const visibleNavItems = useMemo(() => {
    if (!permissionsDetails || !Array.isArray(permissionsDetails)) {
      return navItems;
    }

    return navItems
      .map(item => {
        // Standalone link without children
        if (!item.children) {
          if (item.moduleName) {
            const hasAccess = hasModulePermission(
              permissionsDetails,
              item.moduleName,
              item.requiredPermission || Permission.LIST
            );
            if (!hasAccess) return null;
          }
          return item;
        }

        // Group check: check if any module in group is allowed
        if (item.moduleNames && item.moduleNames.length > 0) {
          const hasAnyInGroup = shouldShowMenuGroup(permissionsDetails, item.moduleNames);
          const hasUnrestrictedChild = item.children.some(c => !c.moduleName);
          if (!hasAnyInGroup && !hasUnrestrictedChild) {
            return null;
          }
        }

        // Filter children
        const visibleChildren = item.children.filter(child => {
          if (!child.moduleName) return true; // Items without restrictions like "My Profile"
          return hasModulePermission(
            permissionsDetails,
            child.moduleName,
            child.requiredPermission || Permission.LIST
          );
        });

        if (visibleChildren.length === 0) {
          return null;
        }

        return {
          ...item,
          children: visibleChildren
        };
      })
      .filter((item): item is NavItem => item !== null);
  }, [permissionsDetails]);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialState: Record<string, boolean> = {};
    visibleNavItems.forEach(item => {
      if (item.children) {
        initialState[item.name] = item.children.some(child => {
          if (child.href === '/stock' || child.href === '/') {
            return location.pathname === child.href || location.pathname === '/stock/dashboard';
          }
          return location.pathname === child.href || location.pathname.startsWith(child.href + '/');
        });
      }
    });
    setOpenMenus(initialState);
  }, [location.pathname, visibleNavItems]);

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={onMobileClose}
        />
      )}
      <div 
        className={cn(
          "flex flex-col bg-white border-r border-gray-200 h-screen transition-all duration-300",
          "fixed md:relative z-[60] md:z-30",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "w-72 max-w-[85vw] md:max-w-none",
          isCollapsed ? "md:w-20" : "md:w-64"
        )}
      >
      {/* Header / Logo */}
      <div className="h-13 flex items-center justify-between px-3 border-b border-gray-200 relative shrink-0">
        <div className="flex items-center overflow-hidden">
          <AuraLogo showText={!isCollapsed || isMobileOpen} />
        </div>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button 
            type="button"
            onClick={onMobileClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg md:hidden cursor-pointer"
            title="Close Sidebar"
          >
            <X size={18} />
          </button>
        )}
        
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 absolute -right-3 top-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-sm z-10 hidden md:flex items-center justify-center cursor-pointer transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleNavItems.map((item) => {
          if (item.children) {
            const hasActiveChild = item.children.some(child => {
              if (child.href === '/stock' || child.href === '/') {
                return location.pathname === child.href || location.pathname === '/stock/dashboard';
              }
              return location.pathname === child.href || location.pathname.startsWith(child.href + '/');
            });
            const isOpen = openMenus[item.name];
            
            return (
              <div key={item.name} className="space-y-1">
                <button
                  onClick={() => {
                    if (isCollapsed) setIsCollapsed(false);
                    toggleMenu(item.name);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors font-medium text-sm",
                    hasActiveChild 
                      ? "bg-primary-50 text-primary-700 font-semibold" 
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    isCollapsed ? "justify-center px-0" : ""
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={20} className={cn("flex-shrink-0", hasActiveChild ? "text-primary-600" : "text-gray-500")} />
                    {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown size={16} className={cn("transition-transform duration-200 text-gray-400", isOpen && "rotate-180")} />
                  )}
                </button>

                {/* Sub Menu Items */}
                {isOpen && !isCollapsed && (
                  <div className="pl-3 space-y-1 border-l-2 border-primary-100 ml-5 my-1">
                    {item.children.map((subItem) => {
                      const isSubActive = subItem.href === '/stock' || subItem.href === '/'
                        ? (location.pathname === subItem.href || location.pathname === '/stock/dashboard')
                        : (location.pathname === subItem.href || location.pathname.startsWith(subItem.href + '/'));

                      return (
                        <Link
                          key={subItem.name}
                          to={subItem.href}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors font-medium text-xs",
                            isSubActive
                              ? "bg-primary-600 text-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          )}
                        >
                          <subItem.icon size={15} className={cn("flex-shrink-0", isSubActive ? "text-white" : "text-gray-400")} />
                          <span>{subItem.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href || '#'}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm",
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
          );
        })}
      </div>
      </div>
    </>
  );
}

