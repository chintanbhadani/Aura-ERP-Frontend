import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface CurrencySetting {
  code: string;
  symbol: string;
  name: string;
  position: 'prefix' | 'suffix';
}

export interface SettingsState {
  currency: CurrencySetting;
  companyName: string;
}

export const DEFAULT_CURRENCY: CurrencySetting = {
  code: 'UGX',
  symbol: 'USh',
  name: 'Ugandan Shilling',
  position: 'prefix',
};

const initialState: SettingsState = {
  currency: DEFAULT_CURRENCY,
  companyName: 'Aura ERP',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setCurrency(state, action: PayloadAction<CurrencySetting>) {
      state.currency = action.payload;
    },
    updateSettings(state, action: PayloadAction<Partial<SettingsState>>) {
      return { ...state, ...action.payload };
    },
    resetSettings() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE' as any, (state, action: any) => {
      const persistedCur = action.payload?.settings?.currency;
      if (!persistedCur || persistedCur.code === 'USD' || persistedCur.symbol === '$') {
        state.currency = DEFAULT_CURRENCY;
      }
    });
  },
});

export const { setCurrency, updateSettings, resetSettings } = settingsSlice.actions;

export default settingsSlice.reducer;
