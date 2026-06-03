import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '@components/layout/MainLayout';
import HomePage from '@pages/Home';
import DocumentsPage from '@pages/Documents';
import NotFoundPage from '@pages/NotFound';

const App = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        {/* Add more routes here */}
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
