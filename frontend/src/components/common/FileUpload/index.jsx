import React, { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ClearIcon from '@mui/icons-material/Clear';

const FileUpload = ({ onUploadSuccess, onUploadError, selectedDocumentType }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/webp','application/pdf'];
  const MAX_SIZE = 10 * 1024 * 1024;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WEBP) and PDF are allowed.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('File size exceeds 10MB limit.');
      return;
    }
    setError(null);
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) { setError('Please select a file first.'); return; }
    if (!selectedDocumentType) { setError('Please select a document type first.'); return; }
    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', selectedDocumentType);
    setUploading(true); setError(null);
    try {
      const response = await fetch('/api/v1/documents/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Upload failed');
      setSelectedFile(null); setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess?.(result.data);
    } catch (err) {
      const errorMsg = err.message || 'Failed to upload document';
      setError(errorMsg); onUploadError?.(errorMsg);
    } finally { setUploading(false); }
  };

  const handleClear = () => {
    setSelectedFile(null); setPreview(null); setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
      <Box
        sx={{
          border: '2px dashed',
          borderColor: selectedFile ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          bgcolor: selectedFile ? 'primary.50' : 'grey.50',
          cursor: 'pointer',
          '&:hover': { borderColor: 'primary.light', bgcolor: 'primary.50' },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={uploading}
        />
        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="body1" color="text.secondary" gutterBottom>
          {selectedFile ? selectedFile.name : 'Click to select a file'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Images or PDF (max 10MB)
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {selectedFile && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Selected:</strong> {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </Typography>
        </Box>
      )}

      {preview && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Box
            component="img"
            src={preview}
            alt="Preview"
            sx={{ maxHeight: 200, maxWidth: '100%', borderRadius: 1, objectFit: 'contain' }}
          />
        </Box>
      )}

      {uploading && <LinearProgress sx={{ mt: 2 }} />}

      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          startIcon={<CloudUploadIcon />}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleClear}
          disabled={!selectedFile || uploading}
          startIcon={<ClearIcon />}
        >
          Clear
        </Button>
      </Box>
    </Paper>
  );
};

export default FileUpload;