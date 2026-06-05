import React from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Header from '../Header';
import Footer from '../Footer';

const MainLayout = () => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Box
        component="main"
        sx={{
          flex: 1,
          maxWidth: 1200,
          width: '100%',
          mx: 'auto',
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 4 },
        }}
      >
        <Outlet />
      </Box>
      <Footer />
    </Box>
  );
};

export default MainLayout;