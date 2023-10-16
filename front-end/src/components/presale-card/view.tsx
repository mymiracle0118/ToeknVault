import { LeftCard, RightCard } from '.';

export default function View(): JSX.Element {
  return (
    <div className='flex justify-center items-center'>
      <div className='bg-black bg-opacity-30 border-1 border-purple-themed-light rounded-lg'>
        <div className='backdrop-filter backdrop-grayscale backdrop-blur-md backdrop-contrast-200'>
          <div className='flex justify-center items-center p-8'>
            <div className='mr-4'>
              <LeftCard />
            </div>
            <div className='ml-4'>
              <RightCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
