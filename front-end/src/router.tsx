import { BrowserRouter, Switch, Route } from 'react-router-dom';
import { Presale, NotFound, UnderConstruction, Lending } from './pages';
import { PageWrapper } from './wrappers';

export default function Router(): JSX.Element {
  return (
    <BrowserRouter>
      <PageWrapper>
        <Switch>
          <Route exact path='/' key='HOME' component={Presale} />
          <Route exact path='/presale' key='PRESALE' component={Presale} />
          <Route exact path='/lending' key='LENDING' component={Lending} />
          <Route exact path='/staking' key='STAKING' component={UnderConstruction} />
          <Route exact path='/incubation' key='INCUBATION' component={UnderConstruction} />
          <Route path='*' key='NOT_FOUND' component={NotFound} />
        </Switch>
      </PageWrapper>
    </BrowserRouter>
  );
}
