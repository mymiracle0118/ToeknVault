import { createSlice } from '@reduxjs/toolkit';

const presaleEndDateSlice = createSlice({
  name: 'presaleEndDate',
  initialState: {
    date: process.env.REACT_APP_PRESALE_END_DATE!,
  },
  reducers: {},
});

export const presaleEndDate = presaleEndDateSlice.actions;

export default presaleEndDateSlice;
