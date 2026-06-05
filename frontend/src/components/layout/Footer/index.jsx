import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        bgcolor: 'grey.50',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Divider />
      <Box
        sx={{
          maxWidth: 1200,
          mx: 'auto',
          py: 3,
          px: { xs: 2, md: 3 },
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} TruExtract. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default Footer;