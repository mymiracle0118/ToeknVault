// import { ColorWave } from '../assets';
import { PaymentModal, PresaleCard } from '../components';

export default function Presale(): JSX.Element {
  return (
    <main className='container  my-40'>
      {/* <div className='relative scale-50 rotate-180 right-16 top-96'> */}
      {/* <ColorWave /> */}
      {/* </div> */}
      <div className='z-10'>
        <PaymentModal />
        <PresaleCard />
      </div>
      {/* <div className='relative scale-50 left-16 bottom-96'> */}
      {/* <ColorWave /> */}
      {/* </div> */}
    </main>
  );
}
