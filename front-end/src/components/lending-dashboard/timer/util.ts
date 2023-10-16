import store from '../../../store';
import moment from 'moment';
export type Time = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function getTimeLeft(): Time | undefined {
  const countDownDate = new Date(store.getState().lockEndDate.date).getTime();
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

export function timeToEnd(endedAt : number){
  const now = moment().unix()
  const ended = {days : 0, hours : 0, minutes : 0, seconds : 0}
  let delta = endedAt - now
  if(delta<=0) return ended;
  const days = Math.floor(delta/86400)
  delta -= days*86400
  const hours = Math.floor(delta/3600)%24
  delta -= hours*3600
  const minutes = Math.floor(delta/60)%60
  delta -= minutes*60
  const seconds = Math.floor(delta%60)

  return {days,hours,minutes,seconds}
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
