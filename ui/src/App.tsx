import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { Header } from './components/layout/Header';
import { DashboardPage } from './pages/DashboardPage';
import { ChangeTrackerPage } from './pages/ChangeTrackerPage';
import { ComparePage } from './pages/ComparePage';

export default function App() {
  const [city, setCity] = useState('Denver');

  return (
    <BrowserRouter>
      <div className="min-h-screen" style={{ background: 'var(--bg-body)' }}>
        <Header city={city} onCityChange={setCity} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<DashboardPage city={city} />} />
            <Route path="/changes" element={<ChangeTrackerPage city={city} />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
