import React, { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setToken, setLoggedUser } from '../lib/slice/Base';
import { LogOut, User, Settings, ChevronDown } from 'lucide-react';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useSelector((state: any) => state.base);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    dispatch(setToken(null));
    dispatch(setLoggedUser(null));
    navigate('/');
  };

  const username = user?.username || 'John Doe';
  const role = (user?.role || 'Admin').replace('_', ' ').toLowerCase();
  
  // Extract initials for the avatar
  const initials = username.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col relative">
        {/* Transparent Header just for positioning the menu */}
        <header className="flex items-center justify-end p-4 sticky top-0 z-20 shrink-0">
          <div className="relative">
            {/* User Button */}
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-gray-200/80 shadow-sm p-1 pr-3 rounded-full hover:bg-white hover:shadow-md hover:border-gray-300 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {initials}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                <div className="absolute right-0 mt-2 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-gray-100/80 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                  
                  {/* User Info Header */}
                  <div className="px-5 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold text-base shadow-inner shrink-0">
                      {initials}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-gray-900 truncate">{username}</p>
                      <p className="text-xs font-medium text-gray-500 capitalize truncate">{role}</p>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 my-1 mx-2"></div>

                  <div className="px-2 py-1 space-y-0.5">
                    <button 
                      onClick={() => { navigate('/profile'); setShowMenu(false); }}
                      className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-2.5 group"
                    >
                      <User className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                      My Profile
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200 flex items-center gap-2.5 group">
                      <Settings className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                      Settings
                    </button>
                  </div>

                  <div className="px-3 py-2 mt-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-red-500/25"
                    >
                      Logout <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </>
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
