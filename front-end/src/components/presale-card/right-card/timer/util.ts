import store from '../../../../store';

export type Time = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getTimeLeft(): Time | undefined {
  const countDownDate = new Date(store.getState().presaleEndDate.date).getTime();
  const now = new Date().getTime();
  const distance = countDownDate - now;

  if (distance > 0) {
    return {
      days: Math.floor(distance / (1000 * 60 * 60 * 24)),
      hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((distance / 1000 / 60) % 60),
      seconds: Math.floor((distance / 1000) % 60),
    };
  }

  return undefined;
}

export function normalize(n: number): string {
  if (n < 0) {
    return '00';
  } else if (n < 10) {
    return `0${n}`;
  } else {
    return n.toString();
  }
}
