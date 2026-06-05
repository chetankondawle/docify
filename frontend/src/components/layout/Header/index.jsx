import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

const navLinks = [
  { label: 'Home', to: '/' },
  { label: 'Documents', to: '/documents' },
  { label: 'Demo', to: '/demo' },
];

const Header = () => {
  return (
    <AppBar position="static" sx={{ bgcolor: 'primary.main', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
      <Toolbar sx={{ maxWidth: 1200, width: '100%', mx: 'auto', px: { xs: 2, md: 3 } }}>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            fontWeight: 700,
            color: 'inherit',
            textDecoration: 'none',
            letterSpacing: '-0.5px',
          }}
        >
          TruExtract
        </Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
          {navLinks.map(({ label, to }) => (
            <Button
              key={to}
              component={NavLink}
              to={to}
              sx={{
                color: 'inherit',
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 2,
                '&.active': {
                  bgcolor: '#ffffff',
                  color: 'primary.main',
                },
                '&:hover': {
                  bgcolor: '#ffffff',
                  color: 'primary.main',
                },
              }}
            >
              {label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;