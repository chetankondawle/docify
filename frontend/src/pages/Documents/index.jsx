import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@components/common/FileUpload';
import Button from '@components/common/Button';
import { getAllDocuments, deleteDocument } from '@services/documentService';
import { extractOCR, extractStructuredData, getDocumentTypes } from '@services/ocrService';
import { checkTampering, checkImageTampering } from '@services/tamperingService';
import { validateDocument, validateDocuments } from '@services/validateService';
import { getUserInfo, clearUserInfo } from '@services/userFormService';
import styles from './Documents.module.css';

const DocumentsPage = () => {
  const navigate = useNavigate();
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
  const [userInfo, setUserInfo] = useState(null);
  const [validateLoading, setValidateLoading] = useState({});
  const [validationResults, setValidationResults] = useState({});
  const [selectedDocForValidation, setSelectedDocForValidation] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [crossValidationLoading, setCrossValidationLoading] = useState(false);
  const [crossValidationError, setCrossValidationError] = useState(null);
  const [crossValidationSuccess, setCrossValidationSuccess] = useState(false);

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
    // Check if user info exists, if not redirect to form
    const info = getUserInfo();
    if (!info) {
      navigate('/user-form');
      return;
    }
    setUserInfo(info);
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


  const handleCheckTampering = async (docId, docName, mimetype) => {
    setTamperingLoading((prev) => ({ ...prev, [docId]: true }));
    setError(null);

    const isImage = typeof mimetype === 'string' && mimetype.startsWith('image/');
    const isPdf = mimetype === 'application/pdf';

    if (!isImage && !isPdf) {
      setError('Security check is only supported for PDF and image files');
      setTimeout(() => setError(null), 5000);
      setTamperingLoading((prev) => ({ ...prev, [docId]: false }));
      return;
    }

    try {
      const response = isImage
        ? await checkImageTampering(docId)
        : await checkTampering(docId);

      setTamperingResults((prev) => ({
        ...prev,
        [docId]: {
          safe: response.data.safe,
          riskScore: response.data.riskScore,
          riskLevel: response.data.riskLevel,
          format: response.data.format,
          checks: response.data.checks,
          aiAnalysis: response.data.aiAnalysis || null,
          summary: response.data.summary,
          cached: response.data.cached,
        },
      }));

      setSuccessMessage(
        `${isImage ? 'Image' : 'PDF'} security check completed for "${docName}"${
          response.data.cached ? ' (cached)' : ''
        }`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.message || 'Security check failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setTamperingLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  // Handler for when a document type is selected for upload
  const handleDocumentTypeForUploadChange = (type) => {
    setSelectedTypeForUpload(type);
  };

  const handleValidateOCR = async (docId, docName) => {
    const doc = documents.find(d => d.id === docId);

    // Return validation errors to be displayed inline, not at top
    if (!ocrResults[docId]) {
      return { error: 'Please extract OCR data first before validating' };
    }

    if (!userInfo) {
      return { error: 'User information not available. Please fill the user form first.' };
    }

    if (!doc || !doc.documentType) {
      return { error: 'Document type not found. Please re-upload with a document type selected.' };
    }

    setValidateLoading((prev) => ({ ...prev, [docId]: true }));
    setSelectedDocForValidation(docId); // Set this document as selected

    try {
      // Call backend validation with document type
      const response = await validateDocument(
        docId,
        doc.documentType,
        ocrResults[docId].extractedData,
        userInfo
      );

      setValidationResults((prev) => ({
        ...prev,
        [docId]: response.data,
      }));

      setSuccessMessage(
        `✓ Validation completed for "${docName}"`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      return { success: true };
    } catch (err) {
      return { error: err.message || 'Validation failed. Please try again.' };
    } finally {
      setValidateLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleEditUserInfo = () => {
    clearUserInfo();
    navigate('/user-form');
  };

  const handleCrossValidateAll = async () => {
    setCrossValidationError(null);
    setCrossValidationSuccess(false);

    if (!userInfo) {
      setCrossValidationError('User information not available. Please fill the user form first.');
      return;
    }

    const documentsWithOCR = documents.filter(doc => ocrResults[doc.id] && doc.documentType);

    if (documentsWithOCR.length < 2) {
      setCrossValidationError('Please extract OCR data from at least 2 documents before cross-validation.');
      return;
    }

    setCrossValidationLoading(true);

    try {
      // Prepare data for cross-validation - backend expects array format
      const documentsArray = documentsWithOCR.map(doc => ({
        documentId: doc.id,
        documentType: doc.documentType,
        extractedData: ocrResults[doc.id].extractedData,
      }));

      const response = await validateDocuments(documentsArray, userInfo);

      // Store cross-validation results
      setValidationResults(prev => ({
        ...prev,
        __crossValidation__: response.data,
      }));

      setCrossValidationSuccess(true);
      // Auto-hide success message after 5 seconds
      setTimeout(() => setCrossValidationSuccess(false), 5000);
    } catch (err) {
      setCrossValidationError(err.message || 'Cross-validation failed. Please try again.');
    } finally {
      setCrossValidationLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeaderSection}>
        <div className={styles.pageHeaderContent}>
          <div className={styles.pageHeaderIcon}>📋</div>
          <div>
            <h1 className={styles.pageTitle}>Document Validation Center</h1>
            <p className={styles.pageSubtitle}>
              Upload, extract, and validate your documents seamlessly
            </p>
          </div>
        </div>
      </div>

      {userInfo && (
        <div className={styles.userBanner}>
          <div className={styles.bannerLeft}>
            <div className={styles.userAvatar}>
              <span className={styles.avatarIcon}>👤</span>
            </div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{userInfo.username}</div>
              <div className={styles.userMeta}>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon}>📱</span>
                  {userInfo.mobile}
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon}>📅</span>
                  {new Date(userInfo.dob).toLocaleDateString()}
                </span>
                <span className={styles.metaItem}>
                  <span className={styles.metaIcon}>📍</span>
                  {userInfo.address}
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleEditUserInfo} className={styles.editUserBtn}>
            <span className={styles.editIcon}>✏️</span>
            Edit Info
          </button>
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
      <div className={styles.documentsMainSection}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Uploaded Documents</h2>
            <p className={styles.sectionSubtitle}>
              {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>

          {documents.length > 1 && (
            <div className={styles.crossValidateContainer}>
              <button
                onClick={handleCrossValidateAll}
                disabled={Object.keys(ocrResults).length < 2 || crossValidationLoading}
                className={styles.crossValidateBtn}
              >
                {crossValidationLoading ? (
                  <>
                    <span className={styles.crossSpinner}>⏳</span>
                    Validating...
                  </>
                ) : (
                  <>
                    <span className={styles.crossIcon}>🔄</span>
                    Cross-Validate All Documents
                  </>
                )}
              </button>

              {crossValidationSuccess && (
                <div className={styles.crossValidationSuccessBox}>
                  <span className={styles.successIcon}>✓</span>
                  <div>
                    <p className={styles.successTitle}>Cross-Validation Complete!</p>
                    <p className={styles.successText}>
                      All documents have been validated. Check results below.
                    </p>
                  </div>
                </div>
              )}

              {crossValidationError && (
                <div className={styles.crossValidationErrorBox}>
                  <span className={styles.errorIcon}>⚠️</span>
                  <div>
                    <p className={styles.errorTitle}>Cannot Cross-Validate</p>
                    <p className={styles.errorText}>{crossValidationError}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p className={styles.loading}>Loading documents...</p>
        ) : documents.length === 0 ? (
          <div className={styles.emptyDocuments}>
            <div className={styles.emptyIcon}>📂</div>
            <p className={styles.emptyTitle}>No Documents Yet</p>
            <p className={styles.emptyText}>Upload your first document to get started</p>
          </div>
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

                  {/* Tampering Check Button (PDF or Image) */}
                  {(doc.mimetype === 'application/pdf' || (doc.mimetype && doc.mimetype.startsWith('image/'))) && (
                    <button
                      onClick={() => handleCheckTampering(doc.id, doc.originalName, doc.mimetype)}
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

                    {/* Validate Button - After OCR Results */}
                    <div className={styles.validateSection}>
                      <button
                        onClick={async () => {
                          const result = await handleValidateOCR(doc.id, doc.originalName);
                          // Error handling is done inside the function
                        }}
                        disabled={validateLoading[doc.id]}
                        className={styles.validateDocBtn}
                      >
                        {validateLoading[doc.id] ? (
                          <>
                            <span className={styles.btnSpinner}>⏳</span>
                            Validating...
                          </>
                        ) : (
                          <>
                            <span className={styles.btnIcon}>✓</span>
                            Validate Against User Info
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Validation Results for this document */}
                {validationResults[doc.id] && (
                  <div className={styles.validationResultCard}>
                    <div className={styles.validationCardHeader}>
                      <span className={`${styles.validationStatusBadge} ${validationResults[doc.id].status === 'VALID' ? styles.statusValid : styles.statusInvalid}`}>
                        {validationResults[doc.id].status === 'VALID' ? '✓ Valid' : '⚠ Needs Review'}
                      </span>
                      <span className={styles.confidenceScore}>
                        {validationResults[doc.id].summary?.averageConfidence || 0}% Confidence
                      </span>
                    </div>

                    <div className={styles.fieldsValidation}>
                      {validationResults[doc.id].fieldResults &&
                        Object.entries(validationResults[doc.id].fieldResults).map(([fieldKey, field]) => (
                          <div key={fieldKey} className={`${styles.fieldValidationRow} ${field.matched ? styles.matched : styles.notMatched}`}>
                            <div className={styles.fieldInfo}>
                              <span className={styles.checkIcon}>
                                {field.matched ? '✓' : '✗'}
                              </span>
                              <div className={styles.fieldData}>
                                <div className={styles.fieldLabel}>{field.label}</div>
                                <div className={styles.fieldValue}>{field.ocrValue || 'N/A'}</div>
                              </div>
                            </div>
                            <div className={styles.confidenceBadge}>
                              {field.confidence}%
                            </div>
                          </div>
                        ))
                      }
                    </div>

                    <div className={styles.validationSummary}>
                      <span className={styles.summaryText}>
                        {validationResults[doc.id].summary?.matchedFields || 0} of {validationResults[doc.id].summary?.totalFields || 0} fields matched
                      </span>
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
                      {tamperingResults[doc.id].format && (
                        <span className={styles.formatBadge}>
                          {tamperingResults[doc.id].format.toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* AI Analysis (Gemini) — image only */}
                    {tamperingResults[doc.id].aiAnalysis &&
                      tamperingResults[doc.id].aiAnalysis.success && (
                        <div className={styles.aiSection}>
                          <div className={styles.aiHeader}>
                            <span className={styles.aiTitle}>🤖 AI Forensic Analysis</span>
                            <div className={styles.headerBadges}>
                              <span
                                className={`${styles.verdictBadge} ${
                                  styles[tamperingResults[doc.id].aiAnalysis.verdict] || ''
                                }`}
                              >
                                {(tamperingResults[doc.id].aiAnalysis.verdict || 'unknown').replace('_', ' ')}
                              </span>
                              {tamperingResults[doc.id].aiAnalysis.confidence && (
                                <span
                                  className={`${styles.confidenceBadge} ${
                                    styles[tamperingResults[doc.id].aiAnalysis.confidence] || ''
                                  }`}
                                >
                                  {tamperingResults[doc.id].aiAnalysis.confidence}
                                </span>
                              )}
                            </div>
                          </div>
                          {tamperingResults[doc.id].aiAnalysis.explanation && (
                            <p className={styles.aiExplanation}>
                              {tamperingResults[doc.id].aiAnalysis.explanation}
                            </p>
                          )}
                          {tamperingResults[doc.id].aiAnalysis.visualFindings &&
                            tamperingResults[doc.id].aiAnalysis.visualFindings.length > 0 && (
                              <div className={styles.aiFindingsBlock}>
                                <div className={styles.aiFindingsLabel}>Visual findings:</div>
                                <ul className={styles.aiFindingsList}>
                                  {tamperingResults[doc.id].aiAnalysis.visualFindings.map((f, i) => (
                                    <li key={i}>{f}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          {tamperingResults[doc.id].aiAnalysis.regionsOfConcern &&
                            tamperingResults[doc.id].aiAnalysis.regionsOfConcern.length > 0 && (
                              <div className={styles.aiFindingsBlock}>
                                <div className={styles.aiFindingsLabel}>Regions of concern:</div>
                                <ul className={styles.aiFindingsList}>
                                  {tamperingResults[doc.id].aiAnalysis.regionsOfConcern.map((r, i) => (
                                    <li key={i}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}


        {/* Cross-Validation Results Section */}
        {validationResults.__crossValidation__ && (
          <div className={styles.crossValidationSection}>
            <div className={styles.crossValidationHeader}>
              <h3 className={styles.crossValidationTitle}>
                <span className={styles.crossIcon}>🔄</span>
                Cross-Document Validation Results
              </h3>
            </div>

            {validationResults.__crossValidation__.crossDocumentIssues &&
             validationResults.__crossValidation__.crossDocumentIssues.length > 0 ? (
              <div className={styles.crossValidationIssues}>
                {validationResults.__crossValidation__.crossDocumentIssues.map((issue, idx) => (
                  <div key={idx} className={`${styles.issueCard} ${styles[`severity${issue.severity}`]}`}>
                    <div className={styles.issueHeader}>
                      <span className={styles.issueIcon}>⚠️</span>
                      <div className={styles.issueInfo}>
                        <div className={styles.issueField}>{issue.field}</div>
                        <div className={styles.issueSeverity}>{issue.severity} Priority</div>
                      </div>
                    </div>
                    <div className={styles.issueMessage}>{issue.message}</div>
                    {issue.details && (
                      <div className={styles.issueDetails}>
                        {Object.entries(issue.details).map(([value, docIds]) => (
                          <div key={value} className={styles.detailRow}>
                            <span className={styles.detailValue}>"{value}"</span>
                            <span className={styles.detailDocs}>
                              found in: {Array.isArray(docIds) ? docIds.join(', ') : docIds}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.crossValidationSuccess}>
                <span className={styles.successIcon}>✓</span>
                <div>
                  <div className={styles.successTitle}>All Documents Consistent</div>
                  <div className={styles.successText}>
                    No inconsistencies found across {Object.keys(validationResults.__crossValidation__.validations || {}).length} documents
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
