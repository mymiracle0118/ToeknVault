import React from 'react';
import ProgressBar from 'react-customizable-progressbar';

// #d526fb
// #70EC9D
// #222231
// #3B3B58
// #1E1E2E

export default function CompletionDiagram(): React.ReactElement {
  // TODO: pull from contract
  const progress = 75;
  const raised = 305000;
  const hardCap = 400000;

  return (
    <div>
      <div className='h-60'>
        <ProgressBar progress={progress} radius={100} strokeColor='#d526fb' trackStrokeColor='#28272C'>
          <div className='relative bottom-40'>
            <p className='text-xs text-gray-500'>in progress</p>
            <p className='text-lg font-bold'>{`$${raised.toLocaleString()}`}</p>
          </div>
        </ProgressBar>
      </div>
      <div className='relative bottom-16 z-10'>
        <div className='p-4 rounded-md bg-gray-700 bg-opacity-70'>
          <div className='flex justify-between items-center text-xs'>
            <p className='text-gray-300'>Hard cap</p>
            <p className='text-green-300'>{`$${hardCap.toLocaleString()}`}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
