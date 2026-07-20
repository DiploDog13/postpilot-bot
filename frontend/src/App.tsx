import React from 'react';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import './index.css';

function App() {
  const [currentPage, setCurrentPage] = React.useState<'dashboard' | 'settings'>('dashboard');

  return (
    <div className="app">
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'settings' && <Settings />}
      
      <nav className="bottom-nav">
        <button
          className={`nav-button ${currentPage === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentPage('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-button ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => setCurrentPage('settings')}
        >
          ⚙️ Settings
        </button>
      </nav>
    </div>
  );
}

export default App;
