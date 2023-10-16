import { useEffect, useState } from 'react';
import { getTimeLeft,timeToEnd, normalize, Time } from './util';

interface TimeAtomProps {
  time: number;
  tag: string;
}

function TimeAtom({ time, tag }: TimeAtomProps): React.ReactElement {
  return (
    <div className='col-span-2'>
      <p className='text-2xl font-bold'>{normalize(time)}</p>
      <p className='text-xs font-thin text-gray-500'>{tag}</p>
    </div>
  );
}

function Divider(): React.ReactElement {
  return <p className='text-gray-500'>:</p>;
}

export default function Timer(props : any): React.ReactElement {
  const {endedAt} = props;
  const [time, setTime] = useState<Time | undefined>(timeToEnd(endedAt));

  useEffect(() => {
    setTimeout(() => {
      setTime(timeToEnd(endedAt));
    }, 1000);
  });

  if (!time) {
    return <h3 className='pb-2 time-font mt-12'>LOCK PERIOD ENDED</h3>;
  }

  return (
    <div>
      <h3 className='pb-2 time-font mt-12'>TIME LEFT</h3>
      <div className='grid grid-cols-11 gap-0 justify-center w-2/3 m-left'>
        <TimeAtom time={time.days} tag='Days' />
        <Divider />
        <TimeAtom time={time.hours} tag='Hours' />
        <Divider />
        <TimeAtom time={time.minutes} tag='Minutes' />
        <Divider />
        <TimeAtom time={time.seconds} tag='Seconds' />
      </div>
    </div>
  );
}
