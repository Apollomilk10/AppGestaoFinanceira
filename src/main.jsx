import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { CategoriesProvider } from './context/CategoriesContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <CategoriesProvider>
      <App />
    </CategoriesProvider>
  </React.StrictMode>
);
