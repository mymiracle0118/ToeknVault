import { combineReducers } from '@reduxjs/toolkit';

import showPaymentModalSlice from './show-payement-modal';
import presaleEndDateSlice from './presale-end-date';
import lockEndDateSlice from './lock-end-date';

export { showPaymentModal } from './show-payement-modal';
export { presaleEndDate } from './presale-end-date';
export { lockEndDate } from './lock-end-date';

const rootReducer = combineReducers({
  showPaymentModal: showPaymentModalSlice.reducer,
  presaleEndDate: presaleEndDateSlice.reducer,
  lockEndDate: lockEndDateSlice.reducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
