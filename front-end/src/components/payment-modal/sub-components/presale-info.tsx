import { Header } from '.';

export default function PresaleInfo(): React.ReactElement {
  return (
    <div className='flex flex-col font-thin text-sm'>
      <div className='py-6 text-left'>
        <Header>PRESALE INFO</Header>
      </div>
      <div className='flex justify-between items-center'>
        <p>Min allocation</p>
        <p>100 USDC</p>
      </div>
      <div className='flex py-2 justify-between items-center'>
        <p>Max allocation</p>
        <p>2000 USDC</p>
      </div>
    </div>
  );
}
