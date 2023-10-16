import { InfoBlock } from './info-block';
import { BlockStatus } from '.';
import { formatEndDate } from './util';

export default function Overview(): React.ReactElement {
  return (
    <div className='flex flex-col mb-12'>
      <InfoBlock status={BlockStatus.Complete} ordering={1} title='Preparation'>
        <p>Seeded project is launched.</p>
        <p>
          Read the presale article{' '}
          <u className='text-green-500'>
            <a href='https://seeded.network/'>here</a>
          </u>
        </p>
      </InfoBlock>
      <InfoBlock status={BlockStatus.Active} ordering={2} title='Presale Open'>
        <p>Presale is now live.</p>
        <p>Access is open to investors!</p>
        <p>End date: {formatEndDate()}</p>
      </InfoBlock>
      <InfoBlock status={BlockStatus.Incomplete} ordering={3} title='End of the presalew'>
        <p>Presale is now closed.</p>
        <p>Thanks to all the investors!</p>
      </InfoBlock>
    </div>
  );
}
