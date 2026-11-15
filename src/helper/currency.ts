import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { CurrencySetting } from '../slices/settingsSlice';
import { DEFAULT_CURRENCY } from '../slices/settingsSlice';
import store from '../store';

export interface CurrencyOption extends CurrencySetting {
  country?: string;
}

export const WORLD_CURRENCIES: CurrencyOption[] = [
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', position: 'prefix', country: 'Uganda' },
  { code: 'USD', symbol: '$', name: 'US Dollar', position: 'prefix', country: 'United States' },
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
  currency?: CurrencySetting,
  options?: { forceDecimals?: boolean }
): string => {
  let activeCurrency = currency || getActiveCurrency();
  if (!activeCurrency || activeCurrency.code === 'USD' || activeCurrency.symbol === '$') {
    activeCurrency = DEFAULT_CURRENCY;
  }
  const num = Number(amount || 0);
  
  // Standard 3-digit comma grouping (e.g., 123,234,456,345)
  const locale = 'en-US';
  
  const hasDecimals = options?.forceDecimals || (num % 1 !== 0);
  const formattedNumber = num.toLocaleString(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });

  const symbol = activeCurrency.symbol || 'USh';
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
    const cur = state?.settings?.currency;
    if (cur && cur.code && cur.code !== 'USD' && cur.symbol !== '$') {
      return cur;
    }
    return DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
};

/**
 * React hook to access current currency and formatting utilities
 */
export const useCurrency = () => {
  const currency: CurrencySetting = useSelector(
    (state: RootState) => {
      const cur = (state as any).settings?.currency;
      if (cur && cur.code && cur.code !== 'USD' && cur.symbol !== '$') {
        return cur;
      }
      return DEFAULT_CURRENCY;
    }
  );

  return {
    currency,
    symbol: currency.symbol || 'USh',
    code: currency.code || 'UGX',
    format: (amount: number | string | null | undefined) => formatCurrency(amount, currency),
  };
};
