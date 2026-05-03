import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    username: localStorage.getItem('fusion_username') || null,
    role: localStorage.getItem('fusion_role') || null,
    isAuthenticated: !!localStorage.getItem('fusion_access_token'),
  },
  reducers: {
    setUser(state, action) {
      state.username = action.payload.username;
      state.role = action.payload.role || 'admin';
      state.isAuthenticated = true;
      localStorage.setItem('fusion_username', action.payload.username);
      localStorage.setItem('fusion_role', action.payload.role || 'admin');
    },
    clearUser(state) {
      state.username = null;
      state.role = null;
      state.isAuthenticated = false;
      ['fusion_access_token','fusion_refresh_token','fusion_username','fusion_role'].forEach(k => localStorage.removeItem(k));
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
