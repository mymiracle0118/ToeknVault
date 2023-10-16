import { BlockStatus } from '..';

interface InfoTextProps {
  status: BlockStatus;
  title: string;
  children: React.ReactNode;
}

export default function InfoText({ status, title, children }: InfoTextProps): React.ReactElement {
  return (
    <div className='relative text-left'>
      {status === BlockStatus.Incomplete ? (
        <div className='text-gray-500 opacity-30'>
          <h3 className='text-sm text'>{title}</h3>
          <div className='text-xs'>{children}</div>
        </div>
      ) : (
        <div>
          <h3 className='text-sm'>{title}</h3>
          <div className='text-xs text-gray-500'>{children}</div>
        </div>
      )}
    </div>
  );
}
