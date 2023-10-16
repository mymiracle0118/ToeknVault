import { BlockStatus } from '..';
import InfoCircle from './circle';
import Divider from './divider';
import InfoText from './text';

interface InfoBlockProps {
  status: BlockStatus;
  ordering: number;
  title: string;
  children: React.ReactNode;
}

export default function InfoBlock({ status, ordering, title, children }: InfoBlockProps): React.ReactElement {
  return (
    <div>
      {ordering !== 1 ? <Divider status={status} /> : <></>}
      <div className='flex'>
        <InfoCircle status={status} char={ordering.toString()} />
        <div className='relative left-4 top-3'>
          <InfoText status={status} title={title} children={children} />
        </div>
      </div>
    </div>
  );
}
