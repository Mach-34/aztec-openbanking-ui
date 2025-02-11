import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AztecProvider } from './contexts/AztecContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AztecProvider>
      <App />
    </AztecProvider>
  </StrictMode>
);
