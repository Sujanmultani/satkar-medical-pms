import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import logoAsset from '@/assets/satkar-logo.jpeg';

// Set Satkar Medical official logo as browser tab favicon
try {
  let link = document.querySelector("link[rel*='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'shortcut icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.type = 'image/jpeg';
  link.href = logoAsset;
} catch (err) {
  console.error('Failed to bind favicon:', err);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
