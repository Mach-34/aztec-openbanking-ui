import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { AztecProvider } from './contexts/AztecContext';
import 'react-tooltip/dist/react-tooltip.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AztecProvider>
      <App />
    </AztecProvider>
  </StrictMode>
);
