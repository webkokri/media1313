import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ContentProvider } from './content.jsx';
import { RadioProvider } from './radio.jsx';
import './styles.css';

// The admin ("Studio") is a separate bundle that visitors never download.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));
const isAdmin = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {isAdmin ? (
        <Suspense fallback={null}><AdminApp /></Suspense>
      ) : (
        <ContentProvider>
          <RadioProvider>
            <App />
          </RadioProvider>
        </ContentProvider>
      )}
    </BrowserRouter>
  </React.StrictMode>
);
