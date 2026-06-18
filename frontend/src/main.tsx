import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { App } from './App';
import { queryClient } from './lib/queryClient';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          gutter={8}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0d1530',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '14px',
              backdropFilter: 'blur(12px)',
            },
            success: {
              iconTheme: { primary: '#00d4aa', secondary: '#0d1530' },
              style: {
                border: '1px solid rgba(0,212,170,0.2)',
              },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0d1530' },
              style: {
                border: '1px solid rgba(239,68,68,0.2)',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
