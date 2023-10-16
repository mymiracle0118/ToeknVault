interface PageWrapperProps {
  children: React.ReactNode;
}

export default function PageWrapper({ children }: PageWrapperProps): React.ReactElement {
  return <div className='flex-grow'>{children}</div>;
}
