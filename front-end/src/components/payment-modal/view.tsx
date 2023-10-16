import { useState } from 'react';
import { ParentElementProps } from '.';
import { PaymentForm, PresaleInfo, SubmitButton, WalletBalance, Top } from './sub-components';
import store from '../../store';

const Container = ({ children }: ParentElementProps): JSX.Element => (
  <div className='fixed justify-center items-center w-full z-20'>
    <div className='flex flex-col justify-center items-center'>
      <div className='backdrop-filter backdrop-grayscale backdrop-blur-md backdrop-contrast-200'>
        <div className='border-1 rounded-2xl bg-modal border-modal-border bg-opacity-90 border-opacity-70'>
          {children}
        </div>
      </div>
    </div>
  </div>
);

export default function PaymentModal(): React.ReactElement {
  const [show, setShow] = useState<Boolean>(store.getState().showPaymentModal.show);

  store.subscribe(() => setShow(store.getState().showPaymentModal.show));

  return show ? (
    <Container>
      <Top onClick={() => setShow(false)} />
      <div className='p-8'>
        <WalletBalance />
        <PaymentForm />
        <PresaleInfo />
        <SubmitButton />
      </div>
    </Container>
  ) : (
    <></>
  );
}
