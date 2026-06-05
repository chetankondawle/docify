import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import ThemeConfig from '@fyndna/theme-ui';
import App from './App';
import './assets/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeConfig>
        <App />
      </ThemeConfig>
    </BrowserRouter>
  </React.StrictMode>
);