import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AtivacaoGate from '@/components/AtivacaoGate';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <AtivacaoGate>
    <App />
  </AtivacaoGate>
);