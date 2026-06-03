import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@components/common/Button';
import { saveUserInfo, getUserInfo } from '@services/userFormService';
import styles from './UserForm.module.css';

const UserFormPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    mobile: '',
    dob: '',
    address: '',
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load existing user info if available
    const existingData = getUserInfo();
    if (existingData) {
      setFormData(existingData);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (!formData.mobile.trim()) {
      setError('Mobile number is required');
      return false;
    }
    if (!/^[0-9]{10}$/.test(formData.mobile)) {
      setError('Mobile number must be 10 digits');
      return false;
    }
    if (!formData.dob) {
      setError('Date of birth is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!validateForm()) return;

    try {
      setLoading(true);
      saveUserInfo(formData);
      setSuccessMessage('User information saved successfully!');
      setTimeout(() => {
        navigate('/documents');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to save user information');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.formSection}>
        <h1 className={styles.title}>User Information</h1>
        <p className={styles.subtitle}>
          Please provide your information before uploading documents
        </p>

        {error && (
          <div className={styles.alert} data-type="error">
            {error}
          </div>
        )}

        {successMessage && (
          <div className={styles.alert} data-type="success">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Enter your full name"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="mobile" className={styles.label}>
              Mobile Number
            </label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="10 digit mobile number"
              disabled={loading}
              maxLength="10"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="dob" className={styles.label}>
              Date of Birth
            </label>
            <input
              type="date"
              id="dob"
              name="dob"
              value={formData.dob}
              onChange={handleInputChange}
              className={styles.input}
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="address" className={styles.label}>
              Address
            </label>
            <textarea
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Enter your address"
              disabled={loading}
              rows="4"
            />
          </div>

          <div className={styles.actions}>
            <Button type="submit" loading={loading}>
              Continue to Documents
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default UserFormPage;
