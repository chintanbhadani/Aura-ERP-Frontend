import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Home, 
  Copy, 
  Check, 
  KeyRound, 
  Layers, 
  UserCheck,
  HelpCircle
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { successToast } from '../helper/toast';
import monsterImg from '../assets/unauthorized-monster.png';

interface UnauthorizedPageProps {
  moduleName?: string;
  permission?: string;
  userRole?: string;
  standalone?: boolean;
}

export const UnauthorizedContent: React.FC<UnauthorizedPageProps> = ({
  moduleName,
  permission = 'List',
  userRole
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyDetails = () => {
    const text = `Access Request Details:\n- Status Code: 403 (Forbidden)\n- Restricted Module: ${moduleName || 'N/A'}\n- Required Permission: ${permission}\n- Current Role: ${userRole || 'User'}\n- URL: ${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    successToast('Access request copied! Send this to your admin.');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-3.25rem)] flex items-center justify-center p-4 sm:p-8 bg-gradient-to-b from-[#6ecb87] via-[#85db9a] to-[#d6f5df] overflow-hidden text-center">
      
      {/* Full-Page Animated Background Clouds / Mist */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Cloud Top Left */}
        <motion.div
          animate={{ x: [-35, 35, -35], y: [-8, 8, -8] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-12 -left-20 w-80 h-40 bg-white/40 rounded-full blur-3xl"
        />
        {/* Cloud Top Right */}
        <motion.div
          animate={{ x: [30, -30, 30], y: [6, -6, 6] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-16 -right-20 w-96 h-48 bg-white/45 rounded-full blur-3xl"
        />
        {/* Cloud Bottom Fog */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.75, 0.55] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-16 left-1/2 -translate-x-1/2 w-[120%] h-56 bg-gradient-to-t from-white/90 via-white/50 to-transparent blur-2xl"
        />
      </div>

      {/* Main Page Content Centered */}
      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center justify-center py-6">
        
        {/* Hero Section: Giant 4 [Monster] 3 composition */}
        <div className="relative flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center select-none leading-none">
            {/* Left 4 */}
            <span className="text-[120px] sm:text-[170px] md:text-[220px] font-black text-white/85 tracking-tight font-sans drop-shadow-xs">
              4
            </span>

            {/* Confused 3D Fluffy Guard Monster in the center */}
            <motion.div
              animate={{
                y: [-6, 6, -6],
                rotate: [-1.5, 1.5, -1.5],
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative z-10 w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 -mx-4 sm:-mx-6 flex items-center justify-center"
            >
              <img
                src={monsterImg}
                alt="Confused Furry Guard Monster"
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </motion.div>

            {/* Right 3 */}
            <span className="text-[120px] sm:text-[170px] md:text-[220px] font-black text-white/85 tracking-tight font-sans drop-shadow-xs">
              3
            </span>
          </div>

          {/* Soft grounding shadow under monster */}
          <div className="w-36 sm:w-48 h-3.5 sm:h-4.5 bg-emerald-950/20 rounded-full blur-md mx-auto -mt-2 sm:-mt-3 mb-2" />
        </div>

        {/* Content Below Monster */}
        <div className="relative z-20 max-w-xl mx-auto -mt-1 sm:-mt-3">
          {/* Polite Main Heading */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-black text-[#13381e] tracking-tight mb-2.5"
          >
            Sorry, you are not allowed to view this page
          </motion.h1>

          {/* Polite Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs sm:text-sm md:text-base font-medium text-[#1e522d]/85 max-w-lg mx-auto mb-5 leading-relaxed"
          >
            We apologize for the inconvenience, but your account does not have permission to access this section. Please contact your system administrator if you believe this is an error.
          </motion.p>

          {/* Permission Breakdown Card (Frosted Glass Pill) */}
          {(moduleName || permission || userRole) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/80 p-3 sm:p-4 text-xs shadow-lg shadow-emerald-950/5 mb-5 max-w-md mx-auto"
            >
              <div className="flex flex-wrap items-center justify-center gap-2">
                {moduleName && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50/90 border border-emerald-200/80 rounded-xl text-emerald-900 font-semibold">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] text-gray-500">Module:</span>
                    <span className="font-bold">{moduleName}</span>
                  </div>
                )}
                {permission && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50/90 border border-rose-200/80 rounded-xl text-rose-900 font-semibold">
                    <KeyRound className="w-3.5 h-3.5 text-rose-600" />
                    <span className="text-[11px] text-gray-500">Required:</span>
                    <span className="font-bold">{permission}</span>
                  </div>
                )}
                {userRole && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50/90 border border-amber-200/80 rounded-xl text-amber-900 font-semibold">
                    <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-[11px] text-gray-500">Role:</span>
                    <span className="font-bold">{userRole}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Help & Copy Action Banner */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white/70 backdrop-blur-md rounded-2xl border border-white/80 text-[11px] text-emerald-950 mb-6 max-w-md mx-auto shadow-xs"
          >
            <div className="flex items-center gap-2 text-left">
              <HelpCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Need access? Request permissions from your <strong>System Administrator</strong>.</span>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyDetails}
              className="shrink-0 p-1.5 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200/80 transition-colors cursor-pointer shadow-2xs"
              title="Copy access request info to clipboard"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </motion.button>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.03, x: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-6 py-3 bg-white/90 hover:bg-white text-emerald-900 border border-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-900/10 hover:shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-700" />
              <span>Take Me Back</span>
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-7 py-3 bg-[#11381e] hover:bg-[#0c2a16] text-white rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-emerald-950/20 border border-white/20"
            >
              <Home className="w-4 h-4" />
              <span>Back to Safe Haven (Dashboard)</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export const UnauthorizedPage: React.FC<UnauthorizedPageProps> = (props) => {
  if (props.standalone === false) {
    return <UnauthorizedContent {...props} />;
  }

  return (
    <DashboardLayout>
      <UnauthorizedContent {...props} />
    </DashboardLayout>
  );
};

export default UnauthorizedPage;
