import React from 'react';
import { Link } from 'react-router-dom';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const NotFoundPage = () => {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <Typography
        variant="h1"
        sx={{ fontSize: '6rem', fontWeight: 800, color: 'primary.main', lineHeight: 1 }}
      >
        404
      </Typography>
      <Typography variant="h4" gutterBottom sx={{ mt: 2 }}>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </Typography>
      <Button
        component={Link}
        to="/"
        variant="contained"
        startIcon={<ArrowBackIcon />}
      >
        Back to Home
      </Button>
    </Container>
  );
};

export default NotFoundPage;