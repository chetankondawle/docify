import React, { useState, useRef } from 'react';
import styles from './FileUpload.module.css';

/**
 * FileUpload Component
 * Accepts images (JPEG, PNG, GIF, WEBP) and PDF files
 */
const FileUpload = ({ onUploadSuccess, onUploadError, selectedDocumentType }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Only images (JPEG, PNG, GIF, WEBP) and PDF are allowed.');
      return;
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first.');
      return;
    }

    if (!selectedDocumentType) {
      setError('Please select a document type first.');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);
    formData.append('documentType', selectedDocumentType); // Add document type to form data

    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      // Reset state
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onUploadSuccess?.(result.data);
    } catch (err) {
      const errorMsg = err.message || 'Failed to upload document';
      setError(errorMsg);
      onUploadError?.(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.uploadArea}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          onChange={handleFileSelect}
          className={styles.fileInput}
          disabled={uploading}
        />
        <div className={styles.hint}>
          📄 Select an image or PDF (max 10MB)
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {selectedFile && (
        <div className={styles.fileInfo}>
          <p className={styles.fileName}>
            <strong>Selected:</strong> {selectedFile.name}
          </p>
          <p className={styles.fileSize}>
            {(selectedFile.size / 1024).toFixed(2)} KB
          </p>
        </div>
      )}

      {preview && (
        <div className={styles.preview}>
          <img src={preview} alt="Preview" className={styles.previewImage} />
        </div>
      )}

      <div className={styles.actions}>
        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button
          onClick={handleClear}
          disabled={!selectedFile || uploading}
          className={`${styles.btn} ${styles.btnSecondary}`}
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default FileUpload;
