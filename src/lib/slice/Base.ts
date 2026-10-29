import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { BaseState, User } from '../../helper/fe.interface';

const initialState: BaseState = {
  token: null,
  user: null,
  roleDetails: null,
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
    },
    setRoleDetails(state, action: PayloadAction<any>) {
      state.roleDetails = action.payload;
    },
    resetAuth(state) {
      state.token = null;
      state.user = null;
      state.roleDetails = null;
    }
  }
});

export const { setToken, setLoggedUser, setRoleDetails, resetAuth } = baseSlice.actions;

export default baseSlice.reducer;
