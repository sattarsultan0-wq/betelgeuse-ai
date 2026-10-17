import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './i18n';
import './styles/global.css';
import './styles/interface.css';
import './styles/themes.css';
import './styles/preferences.css';
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <App />
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </React.StrictMode>,
);
