import Content from './content';
export default function View(): JSX.Element {
  return (
    <div className='dashboard-layout'>
    <main className=''>
          <Content />
    </main>
    </div>
  );
}
