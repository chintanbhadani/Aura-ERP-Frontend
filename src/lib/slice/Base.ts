import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { BaseState, User } from '../../helper/fe.interface';

const initialState: BaseState = {
  token: null,
  user: null,
};

const baseSlice = createSlice({
  name: 'base',
  initialState,
  reducers: {
    setLoggedUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
    },
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
    }
  }
});

export const { setToken, setLoggedUser } = baseSlice.actions;

export default baseSlice.reducer;
