import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA (Professional Implementation)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use relative path for registration to ensure compatibility with base URL
    navigator.serviceWorker.register('sw.js')
      .then(registration => {
        console.log('eDrive HQ: ServiceWorker active at:', registration.scope);
      })
      .catch(error => {
        console.warn('eDrive HQ: ServiceWorker registration skipped:', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Critical: Could not find root element to mount eDrive application.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);