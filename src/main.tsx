import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const theme = localStorage.getItem('personal-budget-theme') ?? 'cozy';
document.documentElement.dataset.theme = theme === 'light' ? 'cozy' : theme === 'dark' ? 'darkFantasy' : theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
