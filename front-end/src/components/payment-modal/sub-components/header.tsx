import { ParentElementProps } from '..';

export default function Header({ children }: ParentElementProps) {
  return <div className='pr-8 text-md font-thin text-gray-500  text-opacity-30'>{children}</div>;
}
