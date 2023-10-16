import { Formik } from 'formik';

interface ValidMessageProps {
  valid: boolean;
}

function PaymentField(): React.ReactElement {
  return (
    <Formik
      initialValues={{ amount: 0 }}
      validate={(values) => {
        const errors: any = {};
        if (!values.amount) {
          errors.amount = 'Required';
        } else if (values.amount < 100 || values.amount > 2000) {
          errors.amount = 'Invalid amount';
        }

        return errors;
      }}
      onSubmit={(values, { setSubmitting }) => setSubmitting(false)}>
      {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => {
        <form onSubmit={handleSubmit}>
          <input
            type='number'
            name='amount'
            onChange={handleChange}
            onBlur={handleBlur}
            value={values.amount}
            placeholder='0'
          />
          {errors.amount && touched.amount && errors.amount}
        </form>;
      }}
    </Formik>
  );
}

function ValidMessage({ valid }: ValidMessageProps): JSX.Element {
  return (
    <div className='text-sm'>
      {valid ? <p className='text-green-500'>VALID AMOUNT</p> : <p className='text-red-500'>INVALID AMOUNT</p>}
    </div>
  );
}

export default function PaymentForm(): JSX.Element {
  return (
    <div className='flex flex-col justify-between items-center'>
      <div className='rounded-xl border-1 bg-modal-form border-modal-border'>
        <div className='flex my-2 p-2 justify-center items-center'>
          <div className='pl-2 text-right'>
            <PaymentField />
            <p className='text-2xl'>USDC</p>
            {/* <p className='text-xs text-gray-500'>{`~$${conversion}`}</p> */}
          </div>
        </div>
      </div>
      <div className='float-left'>
        <ValidMessage valid={true} />
      </div>
    </div>
  );
}
