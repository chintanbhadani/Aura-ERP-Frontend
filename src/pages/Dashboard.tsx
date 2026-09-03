import React from 'react';
import { Button } from '../components/Button';
import { Card, CardDescription, CardTitle } from '../components/Card';
import { Leaf, Activity, Settings, ScanLine, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../layouts/DashboardLayout';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-12 font-sans">
        <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Plant ERP Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, Shift Supervisor</p>
          </div>
          <div className="flex gap-4">
            <Button size="lg" className="gap-2 shadow-lg shadow-primary-500/20">
              <ScanLine size={20} />
              Scan Barcode
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/login')} className="gap-2">
              <LogOut size={20} />
              Logout
            </Button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-4">
              <Activity size={24} />
            </div>
            <CardTitle>Active Jobs</CardTitle>
            <CardDescription>4 machines currently running</CardDescription>
          </Card>
          
          <Card>
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-4">
              <Leaf size={24} />
            </div>
            <CardTitle>BOM Inventory</CardTitle>
            <CardDescription>Healthy levels of PET flakes</CardDescription>
          </Card>

          <Card>
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-2xl flex items-center justify-center mb-4">
              <Settings size={24} />
            </div>
            <CardTitle>QC Logs</CardTitle>
            <CardDescription>All parameters within limits</CardDescription>
          </Card>
        </div>

        {/* Content Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Recent Production</h2>
            <Button variant="ghost">View All</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <Card key={item} className="flex gap-4 items-center">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-400 font-medium">Image</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Roll #26A5C1{item}</h4>
                  <p className="text-sm text-gray-500">Machine A • Net: 25.4kg</p>
                  <div className="mt-3 flex gap-2">
                    <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full">
                      QC Passed
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

      </div>
      </div>
    </DashboardLayout>
  );
}
