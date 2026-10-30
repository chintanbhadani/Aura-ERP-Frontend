import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UnauthorizedPage from './pages/UnauthorizedPage';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Profile from './pages/Profile';
import Clients from './pages/Sales/Clients';
import Inquiries from './pages/Sales/Inquiries';
import { InquiryFormPage } from './pages/Sales/InquiryFormPage';
import Quotations from './pages/Sales/Quotations';
import ProformaInvoices from './pages/Sales/ProformaInvoices';
import MasterData from './components/MasterData';
import { ExpenseListPage } from './pages/Finance/ExpenseListPage';
import { ExpenseFormPage } from './pages/Finance/ExpenseFormPage';
import { SalesReportPage } from './pages/Finance/SalesReportPage';
import { CashBookPage } from './pages/Finance/CashBookPage';
import { CategoryList } from './pages/Master/CategoryList';
import { CategoryFormPage } from './pages/Master/CategoryFormPage';
import { PartOfList } from './pages/Master/PartOfList';
import { PartOfFormPage } from './pages/Master/PartOfFormPage';
import { SubPartOfList } from './pages/Master/SubPartOfList';
import { SubPartOfFormPage } from './pages/Master/SubPartOfFormPage';
import { SupplierList } from './pages/Master/SupplierList';
import { SupplierFormPage } from './pages/Master/SupplierFormPage';
import { CustomerList } from './pages/Master/CustomerList';
import { CustomerFormPage } from './pages/Master/CustomerFormPage';
import { UnitList } from './pages/Master/UnitList';
import { UnitFormPage } from './pages/Master/UnitFormPage';
import { MachineList } from './pages/Master/MachineList';
import { ProductMasterList } from './pages/Master/ProductMasterList';
import { UserManagementList } from './pages/Master/UserManagementList';
import { UserFormPage } from './pages/Master/UserFormPage';
import { RoleManagementList } from './pages/UserManagement/RoleManagementList';
import { RoleFormPage } from './pages/UserManagement/RoleFormPage';
import { InvoiceFormPage } from './pages/Sales/InvoiceFormPage';
import { ProductFormPage } from './pages/Inventory/ProductFormPage';
import { InvoiceList } from './components/InvoiceList';
import { InventoryTable as ProductInventory } from './components/InventoryTable';
import { StockEntryList } from './pages/Inventory/StockEntryList';
import { GrnList } from './pages/Inventory/GrnList';
import { GRNFormPage } from './pages/Inventory/GRNFormPage';
import { MaterialRequestList } from './pages/Inventory/MaterialRequestList';
import { MaterialRequestFormPage } from './pages/Inventory/MaterialRequestFormPage';
import { PurchaseOrderList } from './pages/Buying/PurchaseOrderList';
import { PurchaseOrderFormPage } from './pages/Buying/PurchaseOrderFormPage';
import { BinReportList } from './pages/Inventory/BinReportList';
import { StockLedgerList } from './pages/Inventory/StockLedgerList';
import { StockDashboardPage } from './pages/Inventory/StockDashboardPage';
import { ProductionOrderList } from './pages/Sales/ProductionOrderList';
import { ProductionOrderFormPage } from './pages/Sales/ProductionOrderFormPage';
import { ProductionPlanningPage } from './pages/Sales/ProductionPlanningPage';
import { BomListPage } from './pages/Production/BomListPage';
import { BomFormPage } from './pages/Production/BomFormPage';
import { ProductionWeighingLedger } from './pages/Production/ProductionWeighingLedger';
import { RollDetailPage } from './pages/Production/RollDetailPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected App Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/stock" element={<StockDashboardPage />} />
        <Route path="/stock/dashboard" element={<StockDashboardPage />} />
        <Route path="/app/stock" element={<StockDashboardPage />} />
        <Route path="/inventory" element={<StockDashboardPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/inquiries" element={<Inquiries />} />
        <Route path="/inquiries/new" element={<InquiryFormPage />} />
        <Route path="/inquiries/:id" element={<InquiryFormPage />} />
        <Route path="/crm/inquiries" element={<Inquiries />} />
        <Route path="/crm/inquiries/new" element={<InquiryFormPage />} />
        <Route path="/crm/inquiries/:id" element={<InquiryFormPage />} />
        <Route path="/quotations" element={<Quotations />} />
        <Route path="/proforma" element={<ProformaInvoices />} />

        {/* BOM (Bill of Materials) Routes */}
        <Route path="/bom" element={<BomListPage />} />
        <Route path="/bom/new" element={<BomFormPage />} />
        <Route path="/bom/:id" element={<BomFormPage />} />
        <Route path="/production/bom" element={<BomListPage />} />
        <Route path="/production/bom/new" element={<BomFormPage />} />
        <Route path="/production/bom/:id" element={<BomFormPage />} />

        {/* Production Weighing & Roll Sticker Generator */}
        <Route path="/production/weighing" element={<ProductionWeighingLedger />} />
        <Route path="/production-weighing" element={<ProductionWeighingLedger />} />
        <Route path="/production/roll/:code" element={<RollDetailPage />} />
        <Route path="/roll/:code" element={<RollDetailPage />} />

        {/* Production Planning Routes */}
        <Route path="/production-planning" element={<ProductionPlanningPage />} />
        <Route path="/production/planning" element={<ProductionPlanningPage />} />
        <Route path="/crm/production-planning" element={<ProductionPlanningPage />} />
        <Route path="/sales/production-planning" element={<ProductionPlanningPage />} />

        {/* Production Order Routes */}
        <Route path="/production-orders" element={<ProductionOrderList />} />
        <Route path="/production-orders/new" element={<ProductionOrderFormPage />} />
        <Route path="/production-orders/:id" element={<ProductionOrderFormPage />} />
        <Route path="/production-order" element={<ProductionOrderList />} />
        <Route path="/production-order/new" element={<ProductionOrderFormPage />} />
        <Route path="/production-order/:id" element={<ProductionOrderFormPage />} />
        <Route path="/crm/production-orders" element={<ProductionOrderList />} />
        <Route path="/sales/production-orders" element={<ProductionOrderList />} />

        {/* Bin Report Routes */}
        <Route path="/bin-report" element={<BinReportList />} />
        <Route path="/stock/bin-report" element={<BinReportList />} />
        <Route path="/app/query-report/Neelkanth%20Bin%20Report" element={<BinReportList />} />
        <Route path="/app/query-report/Neelkanth Bin Report" element={<BinReportList />} />
        
        {/* Purchase Order Routes */}
        <Route path="/purchase-order" element={<PurchaseOrderList />} />
        <Route path="/purchase-order/new" element={<PurchaseOrderFormPage />} />
        <Route path="/purchase-order/:id" element={<PurchaseOrderFormPage />} />
        <Route path="/buying/purchase-order" element={<PurchaseOrderList />} />
        <Route path="/buying/purchase-order/new" element={<PurchaseOrderFormPage />} />
        <Route path="/buying/purchase-order/:id" element={<PurchaseOrderFormPage />} />

        {/* Material Request Routes */}
        <Route path="/material-request" element={<MaterialRequestList />} />
        <Route path="/material-request/new" element={<MaterialRequestFormPage />} />
        <Route path="/material-request/:id" element={<MaterialRequestFormPage />} />
        <Route path="/master/material-request" element={<MaterialRequestList />} />
        <Route path="/master/material-request/new" element={<MaterialRequestFormPage />} />
        <Route path="/master/material-request/:id" element={<MaterialRequestFormPage />} />

        {/* Dedicated Master Data Routes */}
        <Route path="/master/categories" element={<CategoryList />} />
        <Route path="/master/categories/new" element={<CategoryFormPage />} />
        <Route path="/master/categories/:id" element={<CategoryFormPage />} />
        <Route path="/master/part-of" element={<PartOfList />} />
        <Route path="/master/part-of/new" element={<PartOfFormPage />} />
        <Route path="/master/part-of/:id" element={<PartOfFormPage />} />
        <Route path="/master/sub-part-of" element={<SubPartOfList />} />
        <Route path="/master/sub-part-of/new" element={<SubPartOfFormPage />} />
        <Route path="/master/sub-part-of/:id" element={<SubPartOfFormPage />} />
        <Route path="/master/suppliers" element={<SupplierList />} />
        <Route path="/master/suppliers/new" element={<SupplierFormPage />} />
        <Route path="/master/suppliers/:id" element={<SupplierFormPage />} />
        <Route path="/master/customers" element={<CustomerList />} />
        <Route path="/master/customers/new" element={<CustomerFormPage />} />
        <Route path="/master/customers/:id" element={<CustomerFormPage />} />
        <Route path="/master/units" element={<UnitList />} />
        <Route path="/master/units/new" element={<UnitFormPage />} />
        <Route path="/master/units/:id" element={<UnitFormPage />} />
        <Route path="/master/machines" element={<MachineList />} />
        <Route path="/master/skus" element={<ProductMasterList />} />
        
        {/* User & Role Management Routes */}
        <Route path="/users" element={<UserManagementList />} />
        <Route path="/users/new" element={<UserFormPage />} />
        <Route path="/users/:id" element={<UserFormPage />} />
        <Route path="/users/edit" element={<UserFormPage />} />
        <Route path="/users/edit/:id" element={<UserFormPage />} />
        <Route path="/master/users" element={<UserManagementList />} />
        <Route path="/master/users/new" element={<UserFormPage />} />
        <Route path="/master/users/:id" element={<UserFormPage />} />
        <Route path="/roles" element={<RoleManagementList />} />
        <Route path="/roles/new" element={<RoleFormPage />} />
        <Route path="/roles/:id" element={<RoleFormPage />} />
        <Route path="/roles/edit/:id" element={<RoleFormPage />} />
        <Route path="/user/role" element={<RoleFormPage />} />
        
        <Route path="/master/:type" element={<MasterData />} />
        
        {/* Finance / Expense Routes */}
        <Route path="/expenses" element={<ExpenseListPage />} />
        <Route path="/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/expenses/:id" element={<ExpenseFormPage />} />
        <Route path="/finance/expenses" element={<ExpenseListPage />} />
        <Route path="/finance/expenses/new" element={<ExpenseFormPage />} />
        <Route path="/finance/expenses/:id" element={<ExpenseFormPage />} />
        <Route path="/finance/sales-report" element={<SalesReportPage />} />
        <Route path="/sales-report" element={<SalesReportPage />} />
        <Route path="/finance/cash-book" element={<CashBookPage />} />
        <Route path="/cash-book" element={<CashBookPage />} />
        <Route path="/finance/balance-sheet" element={<CashBookPage />} />
        <Route path="/balance-sheet" element={<CashBookPage />} />
        <Route path="/invoices" element={<InvoiceList />} />
        <Route path="/invoices/sales" element={<InvoiceList fixedType="SALES" />} />
        <Route path="/invoices/purchase" element={<InvoiceList fixedType="PURCHASE" />} />
        <Route path="/invoices/new" element={<InvoiceFormPage />} />
        <Route path="/invoices/sales/new" element={<InvoiceFormPage defaultType="SALES" />} />
        <Route path="/invoices/purchase/new" element={<InvoiceFormPage defaultType="PURCHASE" />} />
        <Route path="/invoices/:id" element={<InvoiceFormPage />} />
        
        {/* Item Master Detail Routes */}
        <Route path="/products" element={<ProductMasterList />} />
        <Route path="/products/new" element={<ProductFormPage />} />
        <Route path="/products/edit" element={<ProductFormPage />} />
        <Route path="/item/:id" element={<ProductFormPage />} />
        <Route path="/stock-entry" element={<StockEntryList />} />
        <Route path="/stock-ledger" element={<StockLedgerList />} />
        <Route path="/stock/stock-ledger" element={<StockLedgerList />} />
        
        {/* GRN Routes */}
        <Route path="/grn" element={<GrnList />} />
        <Route path="/grn/new" element={<GRNFormPage />} />
        <Route path="/grn/:id" element={<GRNFormPage />} />
        <Route path="/stock/grn" element={<GrnList />} />
        <Route path="/stock/grn/new" element={<GRNFormPage />} />
        <Route path="/stock/grn/:id" element={<GRNFormPage />} />
        </Route>
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
    </Router>
  );
}

export default App;
