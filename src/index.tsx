
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    const errorDiv = document.createElement('div');
    errorDiv.style.color = '#ff5757';
    errorDiv.style.padding = '20px';
    errorDiv.style.background = '#0f1219';
    errorDiv.innerText = 'Critical Error: Root element not found. Please check index.html.';
    document.body.appendChild(errorDiv);
  } else {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  }
} catch (error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.color = '#ff5757';
  errorDiv.style.padding = '20px';
  errorDiv.style.background = '#0f1219';
  errorDiv.innerText = 'Critical Mounting Error: ' + (error instanceof Error ? error.message : String(error));
  document.body.appendChild(errorDiv);
}

