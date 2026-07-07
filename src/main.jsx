import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { OrcamentosProvider } from './context/OrcamentosContext.jsx';
import { CategoriesProvider } from './context/CategoriesContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <OrcamentosProvider>
        <CategoriesProvider>
          <App />
        </CategoriesProvider>
      </OrcamentosProvider>
    </AuthProvider>
  </React.StrictMode>
);
