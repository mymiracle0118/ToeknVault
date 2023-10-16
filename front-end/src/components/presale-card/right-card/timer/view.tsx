import { useEffect, useState } from 'react';
import { getTimeLeft, normalize, Time } from './util';

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
  return <p className='col-span-1  text-gray-500'>:</p>;
}

export default function Timer(): React.ReactElement {
  const [time, setTime] = useState<Time | undefined>(getTimeLeft());

  useEffect(() => {
    setTimeout(() => {
      setTime(getTimeLeft());
    }, 1000);
  });

  if (!time) {
    return <h3 className='text-green-500'>PRESALE ENDED</h3>;
  }

  return (
    <div>
      <h3 className='pb-2 text-xs font-thin text-gray-500'>PRESALE END</h3>
      <div className='grid grid-cols-11 gap-0 justify-between'>
        <TimeAtom time={time.days} tag='Days' />
        <Divider />
        <TimeAtom time={time.hours} tag='Hours' />
        <Divider />
        <TimeAtom time={time.minutes} tag='Seconds' />
        <Divider />
        <TimeAtom time={time.seconds} tag='Minutes' />
      </div>
    </div>
  );
}
