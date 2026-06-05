import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '@components/layout/MainLayout';
import HomePage from '@pages/Home';
import UserFormPage from '@pages/UserForm';
import DocumentsPage from '@pages/Documents';
import NotFoundPage from '@pages/NotFound';
import ErrorBoundary from '@components/common/ErrorBoundary';
import DemoAboutPage from './pages/DemoAbout';

const App = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/user-form" element={<UserFormPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/demo" element={<DemoAboutPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ErrorBoundary>
  );
};

export default App;
