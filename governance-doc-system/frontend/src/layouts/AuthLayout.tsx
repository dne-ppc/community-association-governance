import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const BackgroundBox = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
}));

const AuthLayout: React.FC = () => {
  return (
    <BackgroundBox>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" fontWeight="bold" color="primary">
              Governance Docs
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Community Association Document Management
            </Typography>
          </Box>
          <Outlet />
        </Paper>
      </Container>
    </BackgroundBox>
  );
};

export default AuthLayout;