import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress harmless ResizeObserver loop error in dev mode (Chrome bug)
const origError = console.error;
console.error = (...args: any[]) => {
  if (/ResizeObserver loop/.test(args[0]?.toString() || '')) return;
  origError.call(console, ...args);
};
window.addEventListener('error', (e) => {
  if (/ResizeObserver/.test(e.message)) { e.preventDefault(); e.stopPropagation(); }
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
