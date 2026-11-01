import React, { useState, useEffect } from 'react';
import { DeepstashApp } from './components/DeepstashApp';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  const [currentView, setCurrentView] = useState<'consumer' | 'admin'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#/admin' ||
        hash.startsWith('#/admin')
      ) {
        return 'admin';
      }
    }
    return 'consumer';
  });

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (
        path === '/admin' ||
        path.startsWith('/admin/') ||
        hash === '#/admin' ||
        hash.startsWith('#/admin')
      ) {
        setCurrentView('admin');
      } else {
        setCurrentView('consumer');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigateToAdmin = () => {
    window.history.pushState({}, '', '/admin');
    setCurrentView('admin');
  };

  const navigateToConsumer = () => {
    window.history.pushState({}, '', '/');
    setCurrentView('consumer');
  };

  if (currentView === 'admin') {
    return <AdminPortal onBackToConsumer={navigateToConsumer} />;
  }

  return <DeepstashApp onOpenAdmin={navigateToAdmin} />;
}
