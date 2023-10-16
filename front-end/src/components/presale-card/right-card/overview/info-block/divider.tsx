import { BlockStatus } from '..';

interface DividerProps {
  status: BlockStatus;
}

export default function Divider({ status }: DividerProps): React.ReactElement {
  return (
    <div
      className={`border-l-2 py-6 relative left-4 ${
        status === BlockStatus.Incomplete ? 'border-gray-500 opacity-30' : 'border-green-500'
      }`}
    />
  );
}
