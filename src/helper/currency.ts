import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { CurrencySetting } from '../slices/settingsSlice';
import { DEFAULT_CURRENCY } from '../slices/settingsSlice';
import store from '../store';

export interface CurrencyOption extends CurrencySetting {
  country?: string;
}

export const WORLD_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', position: 'prefix', country: 'United States' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', position: 'prefix', country: 'Uganda' },
  { code: 'EUR', symbol: '€', name: 'Euro', position: 'prefix', country: 'European Union' },
  { code: 'GBP', symbol: '£', name: 'British Pound', position: 'prefix', country: 'United Kingdom' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', position: 'prefix', country: 'India' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', position: 'prefix', country: 'Kenya' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling', position: 'prefix', country: 'Tanzania' },
  { code: 'RWF', symbol: 'RF', name: 'Rwandan Franc', position: 'prefix', country: 'Rwanda' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', position: 'prefix', country: 'South Africa' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', position: 'prefix', country: 'Nigeria' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi', position: 'prefix', country: 'Ghana' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', position: 'prefix', country: 'United Arab Emirates' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', position: 'prefix', country: 'Saudi Arabia' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', position: 'prefix', country: 'Canada' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar', position: 'prefix', country: 'Australia' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', position: 'prefix', country: 'Japan' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', position: 'prefix', country: 'China' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', position: 'prefix', country: 'Singapore' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', position: 'prefix', country: 'Switzerland' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', position: 'prefix', country: 'Brazil' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso', position: 'prefix', country: 'Mexico' },
];

/**
 * Format a number/string into a currency-formatted string
 */
export const formatCurrency = (
  amount: number | string | null | undefined,
  currency?: CurrencySetting
): string => {
  const activeCurrency = currency || DEFAULT_CURRENCY;
  const num = Number(amount || 0);
  
  // Use 'en-IN' universally to get the Lakhs/Crores comma formatting (e.g., 2,20,204.81) for all currencies
  const locale = 'en-IN';
  
  const formattedNumber = num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbol = activeCurrency.symbol || '$';
  const position = activeCurrency.position || 'prefix';

  // Add a space if symbol has multiple characters (like USh, KSh, AED)
  const spacer = symbol.length > 1 ? ' ' : '';

  if (position === 'suffix') {
    return `${formattedNumber} ${symbol}`;
  }

  return `${symbol}${spacer}${formattedNumber}`;
};

/**
 * Helper to fetch current active currency from Redux store non-reactively
 */
export const getActiveCurrency = (): CurrencySetting => {
  try {
    const state = store.getState() as any;
    return state?.settings?.currency || DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
};

/**
 * React hook to access current currency and formatting utilities
 */
export const useCurrency = () => {
  const currency: CurrencySetting = useSelector(
    (state: RootState) => (state as any).settings?.currency || DEFAULT_CURRENCY
  );

  return {
    currency,
    symbol: currency.symbol || '$',
    code: currency.code || 'USD',
    format: (amount: number | string | null | undefined) => formatCurrency(amount, currency),
  };
};
