import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import firebaseConfig from '../firebase-applet-config.json';

// Tries to load the client ID from the provisioned Firebase config
const clientId = firebaseConfig.oAuthClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  </StrictMode>,
);

