import store from '../../../../store';

export function formatEndDate(): string {
  let endDate = new Date(store.getState().presaleEndDate.date).toISOString().split('-');
  endDate.shift();
  endDate = [endDate[0], endDate[1].split('T')].flat();
  endDate[2] = endDate[2].split(':')[0];

  if (Number(endDate[2]) < 12) {
    if (Number(endDate[2]) < 10) {
      endDate[2] = endDate[2][1];
    }
    endDate[2] = `${endDate[2]}am`;
  } else {
    if (Number(endDate[2]) < 10) {
      endDate[2] = endDate[2][1];
    }
    endDate[2] = `${endDate[2]}pm`;
  }

  return `${endDate.shift()}/${endDate.shift()} ${endDate.shift()} UTC`;
}
