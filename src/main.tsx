import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initDB } from './db.ts';
import { AppearanceProvider } from './components/AppearanceContext.tsx';

// Inicializar base de datos offline local (Moda & Caja)
initDB();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppearanceProvider>
      <App />
    </AppearanceProvider>
  </StrictMode>,
);
