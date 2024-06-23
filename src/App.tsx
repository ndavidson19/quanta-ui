import React from 'react';
import StrategyBuilderPage from './pages/StrategyBuilderPage';

const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">QuantForge</h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 py-8">
        <StrategyBuilderPage />
      </main>
      <footer className="bg-gray-800 text-white">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm">&copy; 2023 QuantForge. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;