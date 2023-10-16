import React from 'react';

interface TopProps {
  onClick: () => void;
}

export default function Top({ onClick }: TopProps): React.ReactElement {
  return (
    <div>
      <div className='grid grid-cols-10'>
        <span className='col-span-9' />
        <button className='flex justify-end' onClick={onClick}>
          <span className='border-r-1 border-modal-border' />
          <p className='mx-3 my-1 text-red-500'>x</p>
        </button>
      </div>
      <hr className='w-full  border-modal-border border-opacity-70' />
    </div>
  );
}
