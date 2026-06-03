import React, { useState, useEffect, useCallback } from 'react';
import FileUpload from '@components/common/FileUpload'; // Assuming this component can be modified
import { getAllDocuments, deleteDocument } from '@services/documentService';
// Import new functions and update existing ones
import { extractOCR, extractStructuredData, getDocumentTypes } from '@services/ocrService'; 
import { checkTampering } from '@services/tamperingService';
import styles from './Documents.module.css';

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // OCR states
  const [ocrLoading, setOcrLoading] = useState({});
  const [ocrResults, setOcrResults] = useState({});

  // Tampering check states
  const [tamperingLoading, setTamperingLoading] = useState({});
  const [tamperingResults, setTamperingResults] = useState({});

  // State for document types fetched from backend
  const [allAvailableDocumentTypes, setAllAvailableDocumentTypes] = useState([]);
  // State for the document type selected specifically for upload
  const [selectedTypeForUpload, setSelectedTypeForUpload] = useState('');

  // Fetch all documents
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllDocuments();
      // Ensure the response data includes documentType if it was stored during upload
      setDocuments(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Fetch available document types when component mounts
  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await getDocumentTypes();
        setAllAvailableDocumentTypes(response.data.documentTypes || []); 
      } catch (err) {
        console.error("Error fetching document types:", err);
        setError("Failed to load document types. Please check the backend service.");
      }
    };
    fetchTypes();
  }, []);

  // --- Handlers ---

  const handleUploadSuccess = (document) => {
    // Assuming the backend returns the newly created document object, including its assigned type.
    // The document object should ideally have a 'documentType' field now.
    setSuccessMessage(`Document "${document.originalName}" uploaded successfully!`);
    setTimeout(() => setSuccessMessage(null), 5000);
    fetchDocuments(); // Refresh list to show the new document with its type
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

    // Find the document to get its stored documentType
    const document = documents.find(doc => doc.id === docId);

    if (!document) {
      setError('Document not found');
      setOcrLoading((prev) => ({ ...prev, [docId]: false }));
      return;
    }

    // Check if document has a documentType stored
    if (!document.documentType) {
      setError('Document type not specified. Please re-upload the document with a document type.');
      setTimeout(() => setError(null), 5000);
      setOcrLoading((prev) => ({ ...prev, [docId]: false }));
      return;
    }

    try {
      // Use structured extraction with the document's stored type
      const response = await extractStructuredData(docId, document.documentType);

      setOcrResults((prev) => ({
        ...prev,
        [docId]: {
          documentType: response.data.documentType,
          extractedData: response.data.extractedData || {},
          model: response.data.model,
        },
      }));

      setSuccessMessage(
        `OCR extraction completed for "${docName}" as ${document.documentType}`
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

  // Handler for when a document type is selected for upload
  const handleDocumentTypeForUploadChange = (type) => {
    setSelectedTypeForUpload(type);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Document Management</h1>
      <p className={styles.subtitle}>
        Manage your uploaded documents, extract information, and check security.
      </p>

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

      {/* --- Upload Section with Document Type Selector --- */}
      <div className={styles.uploadSection}>
        {/* Document Type Selector for Upload */}
        <div className={styles.uploadTypeSelector}>
          <label htmlFor="uploadDocumentType" className={styles.uploadLabel}>
            Select Type for Upload:
          </label>
          <select
            id="uploadDocumentType"
            value={selectedTypeForUpload}
            onChange={(e) => handleDocumentTypeForUploadChange(e.target.value)}
            // Disable if loading docs or if no types are available yet
            disabled={loading || allAvailableDocumentTypes.length === 0} 
            className={styles.uploadSelect}
          >
            {allAvailableDocumentTypes.length === 0 ? (
              <option value="">Loading types...</option>
            ) : (
              <>
                <option value="">-- Select Type --</option>
                {allAvailableDocumentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type} {/* Display as ALL_CAPS_UNDERSCORE */}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* File Upload Component */}
        <FileUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          selectedDocumentType={selectedTypeForUpload} // Pass the selected document type
        />
      </div>

      {/* --- Uploaded Documents Section --- */}
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
                  {/* Display the document type here, if available */}
                  {doc.documentType && ( 
                    <span className={styles.docTypeBadgeUploaded}>{doc.documentType}</span>
                  )}
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
                  
                  {/* OCR Extraction Button - uses documentType from upload */}
                  <button
                    onClick={() => handleExtractOCR(doc.id, doc.originalName)}
                    disabled={ocrLoading[doc.id]}
                    className={styles.ocrBtn}
                  >
                    {ocrLoading[doc.id] ? '🔄 Extracting...' : '🔍 Extract OCR'}
                  </button>

                  {/* PDF Tampering Check Button */}
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

                {/* Display OCR Results */}
                {ocrResults[doc.id] && (
                  <div className={styles.ocrResult}>
                    <div className={styles.ocrHeader}>
                      <div className={styles.headerTitle}>
                        <strong>📄 Extracted Data</strong>
                        <span className={styles.docTypeBadge}>
                          {ocrResults[doc.id].documentType}
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




