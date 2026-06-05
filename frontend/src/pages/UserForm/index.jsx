import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@components/common/Button';
import { createUser, saveUserInfo, getUserInfo } from '@services/userFormService';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';

const UserFormPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    mobile: '',
    dob: '',
    pan: '',
    salary: '',
    address: '',
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.username.trim()) { setError('User full name is required'); return false; }
    if (!formData.mobile.trim()) { setError('Mobile number is required'); return false; }
    if (!/^[0-9]{10}$/.test(formData.mobile)) { setError('Mobile number must be 10 digits'); return false; }
    if (!formData.dob) { setError('Date of birth is required'); return false; }
    if (!formData.pan.trim()) { setError('PAN number is required'); return false; }
    if (!/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(formData.pan)) { setError('PAN must be 5 letters + 4 digits + 1 letter (e.g., AAAPZ1234C)'); return false; }
    if (!formData.salary.trim()) { setError('Salary is required'); return false; }
    if (!/^\d+(\.\d{1,2})?$/.test(formData.salary)) { setError('Salary must be a valid number (e.g., 50000 or 50000.50)'); return false; }
    if (!formData.address.trim()) { setError('Address is required'); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null); setSuccessMessage(null);
    if (!validateForm()) return;
    try {
      setLoading(true);
      const response = await createUser(formData);
      const createdUser = response.data;

      saveUserInfo(createdUser);

      setSuccessMessage('User created successfully!');
      setTimeout(() => { navigate('/documents'); }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to save user information');
    } finally { setLoading(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          User Information
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Please provide your information before uploading documents
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label="User Full Name"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            disabled={loading}
            fullWidth
            required
          />
          <TextField
            label="Mobile Number"
            name="mobile"
            value={formData.mobile}
            onChange={handleInputChange}
            placeholder="10 digit mobile number"
            disabled={loading}
            inputProps={{ maxLength: 10 }}
            fullWidth
            required
          />
          <TextField
            label="Date of Birth"
            name="dob"
            type="date"
            value={formData.dob}
            onChange={handleInputChange}
            disabled={loading}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
          />
          <TextField
            label="PAN Number"
            name="pan"
            value={formData.pan}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setFormData((prev) => ({ ...prev, pan: val }));
              setError(null);
            }}
            placeholder="e.g., AAAPZ1234C"
            disabled={loading}
            inputProps={{ maxLength: 10 }}
            fullWidth
            required
          />
          <TextField
            label="Monthly Salary (₹)"
            name="salary"
            value={formData.salary}
            onChange={handleInputChange}
            placeholder="e.g., 50000"
            disabled={loading}
            fullWidth
            required
          />
          <TextField
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter your address"
            disabled={loading}
            multiline
            rows={4}
            fullWidth
            required
          />
          <Box sx={{ mt: 1 }}>
            <Button type="submit" loading={loading}>
              Continue to Documents
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserFormPage;