import React from 'react';
import { createRoot } from 'react-dom/client';
import './App.css';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Player app: #root element not found in index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
