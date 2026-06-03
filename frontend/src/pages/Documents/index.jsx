import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@components/common/FileUpload';
import Button from '@components/common/Button';
import { getAllDocuments, deleteDocument } from '@services/documentService';
import { extractOCR } from '@services/ocrService';
import { checkTampering } from '@services/tamperingService';
import { validateOCRData, validateDataLocally } from '@services/validateService';
import { getUserInfo, clearUserInfo } from '@services/userFormService';
import styles from './Documents.module.css';

const DocumentsPage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [ocrLoading, setOcrLoading] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [tamperingLoading, setTamperingLoading] = useState({});
  const [tamperingResults, setTamperingResults] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [validateLoading, setValidateLoading] = useState({});
  const [validationResults, setValidationResults] = useState({});

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllDocuments();
      setDocuments(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user info exists, if not redirect to form
    const info = getUserInfo();
    if (!info) {
      navigate('/user-form');
      return;
    }
    setUserInfo(info);
    fetchDocuments();
  }, [navigate]);

  const handleUploadSuccess = (document) => {
    setSuccessMessage(`Document "${document.originalName}" uploaded successfully!`);
    setTimeout(() => setSuccessMessage(null), 5000);
    fetchDocuments(); // Refresh list
  };

  const handleUploadError = (errorMsg) => {
    setError(errorMsg);
    setTimeout(() => setError(null), 5000);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteDocument(id);
      setSuccessMessage('Document deleted successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
      fetchDocuments();
    } catch (err) {
      setError(err.message || 'Failed to delete document');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleExtractOCR = async (docId, docName) => {
    setOcrLoading((prev) => ({ ...prev, [docId]: true }));
    setError(null);

    try {
      const response = await extractOCR(docId);

      setOcrResults((prev) => ({
        ...prev,
        [docId]: {
          documentType: response.data.documentType,
          extractedData: response.data.extractedData,
          confidence: response.data.confidence,
          cached: response.data.cached,
          model: response.data.model,
        },
      }));

      setSuccessMessage(
        `OCR extraction completed for "${docName}"${
          response.data.cached ? ' (cached)' : ''
        }`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.message || 'OCR extraction failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setOcrLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleCheckTampering = async (docId, docName) => {
    setTamperingLoading((prev) => ({ ...prev, [docId]: true }));
    setError(null);

    try {
      const response = await checkTampering(docId);

      setTamperingResults((prev) => ({
        ...prev,
        [docId]: {
          safe: response.data.safe,
          riskScore: response.data.riskScore,
          riskLevel: response.data.riskLevel,
          checks: response.data.checks,
          summary: response.data.summary,
          cached: response.data.cached,
        },
      }));

      setSuccessMessage(
        `PDF tampering check completed for "${docName}"${
          response.data.cached ? ' (cached)' : ''
        }`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.message || 'PDF tampering check failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setTamperingLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleValidateOCR = async (docId, docName) => {
    if (!ocrResults[docId]) {
      setError('Please extract OCR data first');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (!userInfo) {
      setError('User information not available');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setValidateLoading((prev) => ({ ...prev, [docId]: true }));
    setError(null);

    try {
      // Call backend validation
      const response = await validateOCRData(
        docId,
        userInfo,
        ocrResults[docId]
      );

      setValidationResults((prev) => ({
        ...prev,
        [docId]: response.data,
      }));

      setSuccessMessage(
        `Validation completed for "${docName}"`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.message || 'Validation failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setValidateLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleEditUserInfo = () => {
    clearUserInfo();
    navigate('/user-form');
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Document Upload</h1>
      <p className={styles.subtitle}>
        Upload images (JPEG, PNG, GIF, WEBP) or PDF documents.
      </p>

      {userInfo && (
        <div className={styles.userInfoCard}>
          <div className={styles.userInfoHeader}>
            <div>
              <h3 className={styles.userInfoTitle}>User Information</h3>
              <p className={styles.userInfoName}>{userInfo.username}</p>
            </div>
            <button
              onClick={handleEditUserInfo}
              className={styles.editBtn}
              title="Edit user information"
            >
              ✏️ Edit
            </button>
          </div>
          <div className={styles.userInfoDetails}>
            <div className={styles.userInfoItem}>
              <span className={styles.label}>Mobile:</span>
              <span>{userInfo.mobile}</span>
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.label}>DOB:</span>
              <span>{new Date(userInfo.dob).toLocaleDateString()}</span>
            </div>
            <div className={styles.userInfoItem}>
              <span className={styles.label}>Address:</span>
              <span>{userInfo.address}</span>
            </div>
          </div>
        </div>
      )}

      {successMessage && (
        <div className={styles.alert} data-type="success">
          {successMessage}
        </div>
      )}

      {error && (
        <div className={styles.alert} data-type="error">
          {error}
        </div>
      )}

      <div className={styles.uploadSection}>
        <FileUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
        />
      </div>

      <div className={styles.documentsSection}>
        <h2 className={styles.sectionTitle}>Uploaded Documents</h2>
        
        {loading ? (
          <p className={styles.loading}>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className={styles.empty}>No documents uploaded yet.</p>
        ) : (
          <div className={styles.grid}>
            {documents.map((doc) => (
              <div key={doc.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.badge}>{doc.category}</span>
                  <button
                    onClick={() => handleDelete(doc.id, doc.originalName)}
                    className={styles.deleteBtn}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
                <h3 className={styles.cardTitle}>{doc.originalName}</h3>
                <p className={styles.cardMeta}>
                  <strong>Size:</strong> {doc.sizeFormatted}
                </p>
                <p className={styles.cardMeta}>
                  <strong>Type:</strong> {doc.mimetype}
                </p>
                <p className={styles.cardMeta}>
                  <strong>Uploaded:</strong>{' '}
                  {new Date(doc.uploadedAt).toLocaleString()}
                </p>

                <div className={styles.cardActions}>
                  <a
                    href={`http://localhost:5000/uploads/${doc.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.viewLink}
                  >
                    View Document →
                  </a>
                  <button
                    onClick={() => handleExtractOCR(doc.id, doc.originalName)}
                    disabled={ocrLoading[doc.id]}
                    className={styles.ocrBtn}
                  >
                    {ocrLoading[doc.id] ? '🔄 Extracting...' : '🔍 Extract OCR'}
                  </button>
                  {ocrResults[doc.id] && (
                    <button
                      onClick={() => handleValidateOCR(doc.id, doc.originalName)}
                      disabled={validateLoading[doc.id]}
                      className={styles.validateBtn}
                    >
                      {validateLoading[doc.id] ? '🔄 Validating...' : '✓ Validate Data'}
                    </button>
                  )}
                  {doc.mimetype === 'application/pdf' && (
                    <button
                      onClick={() => handleCheckTampering(doc.id, doc.originalName)}
                      disabled={tamperingLoading[doc.id]}
                      className={styles.tamperingBtn}
                    >
                      {tamperingLoading[doc.id] ? '🔄 Checking...' : '🔐 Check Security'}
                    </button>
                  )}
                </div>

                {ocrResults[doc.id] && (
                  <div className={styles.ocrResult}>
                    <div className={styles.ocrHeader}>
                      <div className={styles.headerTitle}>
                        <strong>📄 Extracted Data</strong>
                        <span className={styles.docTypeBadge}>
                          {ocrResults[doc.id].documentType}
                        </span>
                      </div>
                      <div className={styles.headerBadges}>
                        {ocrResults[doc.id].cached && (
                          <span className={styles.cachedBadge}>Cached</span>
                        )}
                        <span className={`${styles.confidenceBadge} ${styles[ocrResults[doc.id].confidence]}`}>
                          {ocrResults[doc.id].confidence}
                        </span>
                      </div>
                    </div>
                    <div className={styles.ocrData}>
                      {Object.keys(ocrResults[doc.id].extractedData).length > 0 ? (
                        <div className={styles.dataGrid}>
                          {Object.entries(ocrResults[doc.id].extractedData).map(([key, value]) => (
                            <div key={key} className={styles.dataItem}>
                              <span className={styles.dataKey}>{key}:</span>
                              <span className={styles.dataValue}>
                                {typeof value === 'object'
                                  ? JSON.stringify(value, null, 2)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={styles.noData}>No meaningful data extracted</p>
                      )}
                    </div>
                    <div className={styles.ocrMeta}>
                      Model: {ocrResults[doc.id].model}
                    </div>
                  </div>
                )}

                {/* Validation Results */}
                {validationResults[doc.id] && (
                  <div className={`${styles.validationResult} ${styles[validationResults[doc.id].isValid ? 'valid' : 'invalid']}`}>
                    <div className={styles.validationHeader}>
                      <div className={styles.headerTitle}>
                        <span className={styles.validationIcon}>
                          {validationResults[doc.id].isValid ? '✅' : '⚠️'}
                        </span>
                        <strong>Data Validation</strong>
                      </div>
                      <span className={styles.confidenceBadge}>
                        {validationResults[doc.id].overallConfidence}% Match
                      </span>
                    </div>
                    <div className={styles.validationData}>
                      {Object.entries(validationResults[doc.id].matches).map(([field, matched]) => (
                        <div key={field} className={`${styles.validationItem} ${matched ? styles.match : styles.nomatch}`}>
                          <span className={styles.fieldName}>{field}:</span>
                          <span className={styles.fieldStatus}>
                            {matched ? '✓ Matched' : '✗ Not Matched'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.validationStatus}>
                      {validationResults[doc.id].isValid ?
                        'Data validation successful - All critical fields matched' :
                        'Data validation incomplete - Some fields did not match'
                      }
                    </div>
                  </div>
                )}

                {/* PDF Tampering Results */}
                {tamperingResults[doc.id] && (
                  <div className={`${styles.tamperingAlert} ${styles[tamperingResults[doc.id].riskLevel]}`}>
                    <div className={styles.tamperingHeader}>
                      <div className={styles.headerTitle}>
                        <span className={styles.tamperingIcon}>
                          {tamperingResults[doc.id].safe ? '✅' : '⚠️'}
                        </span>
                        <strong>Security Check</strong>
                      </div>
                      <div className={styles.headerBadges}>
                        {tamperingResults[doc.id].cached && (
                          <span className={styles.cachedBadge}>Cached</span>
                        )}
                        <span className={styles.riskBadge}>
                          {tamperingResults[doc.id].riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className={styles.tamperingSummary}>
                      {tamperingResults[doc.id].summary}
                    </p>
                    <div className={styles.riskScore}>
                      Risk Score: {tamperingResults[doc.id].riskScore}/100
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
