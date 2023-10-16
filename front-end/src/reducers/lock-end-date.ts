import { createSlice } from '@reduxjs/toolkit';

const lockEndDateSlice = createSlice({
  name: 'lockEndDate',
  initialState: {
    date: process.env.REACT_APP_LOCK_END_DATE!,
  },
  reducers: {},
});

export const lockEndDate = lockEndDateSlice.actions;

export default lockEndDateSlice;
