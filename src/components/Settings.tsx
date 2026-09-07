import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { CurrencySetting } from '../slices/settingsSlice';
import { 
  setCurrency, 
  resetSettings, 
  DEFAULT_CURRENCY 
} from '../slices/settingsSlice';
import type { CurrencyOption } from '../helper/currency';
import { WORLD_CURRENCIES, formatCurrency } from '../helper/currency';
import { successToast } from '../helper/toast';
import { 
  Box, 
  Button, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  TextField, 
  Autocomplete, 
  Typography, 
  Paper, 
  Divider,
  Chip
} from '@mui/material';
import { Settings as SettingsIcon, DollarSign, Check, RotateCcw, Globe, Sparkles } from 'lucide-react';

export const Settings: React.FC = () => {
  const dispatch = useDispatch();
  const currentCurrency = useSelector(
    (state: RootState) => (state as any).settings?.currency || DEFAULT_CURRENCY
  );

  const [selectedCurrency, setSelectedCurrency] = useState<CurrencySetting>(currentCurrency);
  const [isCustom, setIsCustom] = useState(
    !WORLD_CURRENCIES.some(c => c.code === currentCurrency.code && c.symbol === currentCurrency.symbol)
  );

  const handleCurrencySelect = (_event: any, newValue: CurrencyOption | string | null) => {
    if (!newValue) return;

    if (typeof newValue === 'string') {
      // Custom typed
      setSelectedCurrency({
        code: newValue.toUpperCase(),
        symbol: newValue,
        name: newValue,
        position: selectedCurrency.position || 'prefix',
      });
      setIsCustom(true);
    } else {
      setSelectedCurrency({
        code: newValue.code,
        symbol: newValue.symbol,
        name: newValue.name,
        position: newValue.position,
      });
      setIsCustom(false);
    }
  };

  const handleSave = () => {
    dispatch(setCurrency(selectedCurrency));
    successToast(`Global currency updated to ${selectedCurrency.name} (${selectedCurrency.symbol})`);
  };

  const handleReset = () => {
    dispatch(resetSettings());
    setSelectedCurrency(DEFAULT_CURRENCY);
    setIsCustom(false);
    successToast('Settings reset to default (USD $)');
  };

  const currentOption = WORLD_CURRENCIES.find(
    c => c.code === selectedCurrency.code && c.symbol === selectedCurrency.symbol
  ) || null;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-bg text-primary rounded-2xl flex items-center justify-center">
              <SettingsIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              <p className="text-gray-500 mt-0.5">Manage global business preferences, currency, and defaults.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              borderRadius: '24px', 
              border: '1px solid', 
              borderColor: 'divider',
              backgroundColor: '#ffffff' 
            }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Currency & Financial Formatting</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Select the default currency symbol and code used across all invoices, line items, inventory prices, and PDF exports.
            </p>

            {/* Popular Quick Chips */}
            <div className="mb-6">
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Popular Currencies
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
                {[
                  { code: 'USD', symbol: '$', name: 'US Dollar', position: 'prefix' as const },
                  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', position: 'prefix' as const },
                  { code: 'EUR', symbol: '€', name: 'Euro', position: 'prefix' as const },
                  { code: 'GBP', symbol: '£', name: 'British Pound', position: 'prefix' as const },
                  { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'prefix' as const },
                  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', position: 'prefix' as const },
                  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', position: 'prefix' as const },
                ].map((item) => {
                  const isSelected = selectedCurrency.code === item.code && selectedCurrency.symbol === item.symbol;
                  return (
                    <Chip
                      key={item.code}
                      label={`${item.symbol} - ${item.name}`}
                      clickable
                      color={isSelected ? 'primary' : 'default'}
                      variant={isSelected ? 'filled' : 'outlined'}
                      onClick={() => {
                        setSelectedCurrency(item);
                        setIsCustom(false);
                      }}
                      sx={{ 
                        fontWeight: isSelected ? 700 : 500,
                        borderRadius: '10px',
                        py: 0.5,
                      }}
                    />
                  );
                })}
              </Box>
            </div>

            <Divider sx={{ my: 3 }} />

            {/* Currency Select Dropdown */}
            <div className="space-y-4">
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Search All World Currencies
              </Typography>
              
              <Autocomplete
                options={WORLD_CURRENCIES}
                value={currentOption}
                onChange={handleCurrencySelect}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return `${option.name} (${option.symbol} - ${option.code}) ${option.country ? `• ${option.country}` : ''}`;
                }}
                isOptionEqualToValue={(option, val) => option.code === val.code && option.symbol === val.symbol}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search world currency (e.g. Ugandan Shilling, Dollar, Euro)..."
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '14px',
                      }
                    }}
                  />
                )}
              />

              {/* Custom fields override */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <TextField
                  label="Currency Symbol"
                  value={selectedCurrency.symbol}
                  onChange={(e) => {
                    setSelectedCurrency({ ...selectedCurrency, symbol: e.target.value });
                    setIsCustom(true);
                  }}
                  helperText="e.g. $, USh, €, ₹, £"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '14px',
                    }
                  }}
                />

                <TextField
                  label="Currency Code"
                  value={selectedCurrency.code}
                  onChange={(e) => {
                    setSelectedCurrency({ ...selectedCurrency, code: e.target.value.toUpperCase() });
                    setIsCustom(true);
                  }}
                  helperText="e.g. USD, UGX, EUR, INR"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '14px',
                    }
                  }}
                />
              </div>

              {/* Symbol Placement */}
              <div className="pt-2">
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                  Symbol Placement
                </Typography>
                <RadioGroup
                  row
                  value={selectedCurrency.position}
                  onChange={(e) => setSelectedCurrency({ ...selectedCurrency, position: e.target.value as 'prefix' | 'suffix' })}
                >
                  <FormControlLabel 
                    value="prefix" 
                    control={<Radio color="primary" />} 
                    label={`Prefix (Before amount, e.g. ${selectedCurrency.symbol}306,050.00)`} 
                  />
                  <FormControlLabel 
                    value="suffix" 
                    control={<Radio color="primary" />} 
                    label={`Suffix (After amount, e.g. 306,050.00 ${selectedCurrency.symbol})`} 
                  />
                </RadioGroup>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 justify-end pt-8 mt-6 border-t border-gray-100">
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<RotateCcw className="w-4 h-4" />}
                onClick={handleReset}
                sx={{ 
                  borderRadius: '12px', 
                  px: 2.5, 
                  py: 1, 
                  textTransform: 'none',
                  color: 'text.secondary'
                }}
              >
                Reset Default
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Check className="w-4 h-4" />}
                onClick={handleSave}
                sx={{ 
                  borderRadius: '12px', 
                  px: 4, 
                  py: 1, 
                  fontWeight: 600,
                  textTransform: 'none',
                }}
              >
                Save Settings
              </Button>
            </div>
          </Paper>
        </div>

        {/* Right Column: Live Preview Card */}
        <div className="space-y-6">
          <Paper
            elevation={0}
            sx={{
              p: 3.5,
              borderRadius: '24px',
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: '#ffffff',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-gray-900 text-base">Live Preview</h3>
            </div>
            <p className="text-xs text-gray-500 mb-6">
              This preview reflects how prices, invoices, and totals will appear across Aura ERP.
            </p>

            <div className="space-y-3">
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(3000, selectedCurrency)}
                </span>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Line Item Total</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(6050, selectedCurrency)}
                </span>
              </div>

              <div className="p-4 bg-primary-bg rounded-2xl border border-primary/20 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Invoice Total</span>
                  <p className="text-xs text-primary/70">{selectedCurrency.name}</p>
                </div>
                <span className="text-lg font-extrabold text-primary">
                  {formatCurrency(306050, selectedCurrency)}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Active Code:</span>
                <span className="font-bold text-gray-900">{selectedCurrency.code}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1.5">
                <span>Active Symbol:</span>
                <span className="font-bold text-gray-900">{selectedCurrency.symbol}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-1.5">
                <span>Placement:</span>
                <span className="font-bold text-gray-900 capitalize">{selectedCurrency.position}</span>
              </div>
            </div>
          </Paper>
        </div>
      </div>
    </div>
  );
};

export default Settings;
