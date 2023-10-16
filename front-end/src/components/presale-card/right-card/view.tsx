import { Overview } from './overview';
import { Timer } from './timer';

export default function View(): JSX.Element {
  return (
    <div>
      <Overview />
      <Timer />
    </div>
  );
}
