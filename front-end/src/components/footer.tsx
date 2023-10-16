import {
  FaMediumM as Medium,
  FaDiscord as Discord,
  FaTwitter as Twitter,
  FaRedditAlien as Reddit,
} from 'react-icons/fa';

export default function Footer(): JSX.Element {
  return (
    <footer className='sticky bottom-0 m-8 z-1'>
      <div className='flex flex-col items-center opacity-30'>
        <div className='flex items-center text-xl2'>
          <Medium className='mx-1' />
          <Discord className='mx-1' />
          <Twitter className='mx-1' />
          <Reddit className='mx-1' />
          <p className=' mx-4'>© 2021 Seeded Network</p>
        </div>
      </div>
    </footer>
  );
}
