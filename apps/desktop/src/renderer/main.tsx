import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { NotificationCard } from './components/NotificationCard';
import './styles/index.css';

const isNotification = window.location.hash.startsWith('#notification');

if (isNotification) {
  document.documentElement.classList.add('notification-window');
  document.body.classList.add('notification-window');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {isNotification ? <NotificationCard /> : <App />}
  </React.StrictMode>
);
