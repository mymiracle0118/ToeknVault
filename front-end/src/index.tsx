import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { SnackbarProvider } from 'notistack';
import { Header, Footer } from './components';
import { WalletWrapper } from './wrappers';
import Router from './router';
import store from './store';
import './index.css';

function App(): JSX.Element {
  return (
    <React.StrictMode>
      <Provider store={store}>
        <WalletWrapper>
          <SnackbarProvider>
            <div className='flex flex-col min-h-screen text-center'>
              <Header />
              <Router />
              <Footer />
            </div>
          </SnackbarProvider>
        </WalletWrapper>
      </Provider>
    </React.StrictMode>
  );
}

ReactDOM.render(<App />, document.querySelector('#root'));
