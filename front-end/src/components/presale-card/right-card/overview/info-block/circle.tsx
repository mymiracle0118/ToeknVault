import { ThemedHollowCharCircle, ThemedSolidCharCircle } from '../../../..';
import { BlockStatus } from '..';

interface InfoCircleProps {
  status: BlockStatus;
  char: string;
}

export default function InfoCircle({ status, char }: InfoCircleProps): React.ReactElement {
  function renderCircle() {
    switch (status) {
      case BlockStatus.Complete:
        return <ThemedSolidCharCircle char={char} />;
      case BlockStatus.Active:
        return <ThemedHollowCharCircle char={char} />;
      case BlockStatus.Incomplete:
        return (
          <ThemedHollowCharCircle
            char={char}
            borderColor='border-gray-500'
            textColor='text-gray-500'
            className='opacity-30'
          />
        );
    }
  }

  return <div className='py-2'>{renderCircle()}</div>;
}
