import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const mountedRef = useRef(true);
  const timersRef = useRef([]);

  const safeTimeout = (fn, ms) => {
    const id = setTimeout(() => {
      if (mountedRef.current) fn();
    }, ms);
    timersRef.current.push(id);
    return id;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);
  
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
  const [activeTab, setActiveTab] = useState(0);

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
    safeTimeout(() => setSuccessMessage(null), 5000);
    fetchDocuments(); // Refresh list to show the new document with its type
  };

  const handleUploadError = (errorMsg) => {
    setError(errorMsg);
    safeTimeout(() => setError(null), 5000);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await deleteDocument(id);
      setSuccessMessage('Document deleted successfully');
      safeTimeout(() => setSuccessMessage(null), 5000);
      fetchDocuments();
    } catch (err) {
      setError(err.message || 'Failed to delete document');
      safeTimeout(() => setError(null), 5000);
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
      safeTimeout(() => setError(null), 5000);
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
          quality: response.data.quality || null,
        },
      }));

      setSuccessMessage(
        `OCR extraction completed for "${docName}" as ${document.documentType}`
      );
      safeTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.message || 'OCR extraction failed');
      safeTimeout(() => setError(null), 5000);
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
      safeTimeout(() => setError(null), 5000);
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
      safeTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err.message || 'Security check failed');
      safeTimeout(() => setError(null), 5000);
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
      safeTimeout(() => setSuccessMessage(null), 5000);

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
      safeTimeout(() => setCrossValidationSuccess(false), 5000);
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
        {/* Tab Bar */}
        {documents.length > 0 && (
          <div className={styles.tabBar}>
            {documents.map((doc, idx) => (
              <button
                key={doc.id}
                onClick={() => setActiveTab(idx)}
                className={`${styles.tab} ${activeTab === idx ? styles.tabActive : ''}`}
              >
                <span className={styles.tabIcon}>
                  {doc.mimetype === 'application/pdf' ? '📄' : '🖼️'}
                </span>
                <span className={styles.tabLabel}>{doc.originalName}</span>
                {doc.documentType && (
                  <span className={styles.tabDocType}>{doc.documentType}</span>
                )}
                {tamperingResults[doc.id] && (
                  <span className={`${styles.tabStatus} ${tamperingResults[doc.id].safe ? styles.tabStatusSafe : styles.tabStatusUnsafe}`}>
                    {tamperingResults[doc.id].safe ? '✓' : '⚠'}
                  </span>
                )}
              </button>
            ))}
            {documents.length > 1 && (
              <button
                onClick={handleCrossValidateAll}
                disabled={Object.keys(ocrResults).length < 2 || crossValidationLoading}
                className={`${styles.tab} ${styles.tabCrossValidate}`}
                title="Cross-validate all documents"
              >
                {crossValidationLoading ? (
                  <><span className={styles.crossSpinner}>⏳</span> Validating...</>
                ) : (
                  <><span className={styles.crossIcon}>🔄</span> Cross-Validate</>
                )}
              </button>
            )}
          </div>
        )}
        {crossValidationError && (
          <div className={styles.crossErrorBar}>{crossValidationError}</div>
        )}

        {/* Active Document Panel */}
        {documents.length > 0 && documents[activeTab] && (() => {
          const doc = documents[activeTab];
          return (
            <div className={styles.splitPanel} key={doc.id}>
              {/* Left: Document Preview */}
              <div className={styles.previewPanel}>
                <div className={styles.previewHeader}>
                  <strong>{doc.originalName}</strong>
                </div>
                <div className={styles.previewContent}>
                  {doc.mimetype && doc.mimetype.startsWith('image/') ? (
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000'}/uploads/${doc.filename}`}
                      alt={doc.originalName}
                      className={styles.previewImage}
                    />
                  ) : (
                    <div className={styles.previewPlaceholder}>
                      <span className={styles.previewPdfIcon}>📄</span>
                      <p>{doc.originalName}</p>
                    </div>
                  )}
                </div>
                <div className={styles.previewMeta}>
                  <span><strong>Size:</strong> {doc.sizeFormatted}</span>
                  <span><strong>Type:</strong> {doc.mimetype}</span>
                  {doc.documentType && <span className={styles.previewDocType}>{doc.documentType}</span>}
                </div>
                <div className={styles.previewActions}>
                  <a
                    href={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000'}/uploads/${doc.filename}`}
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
                  {(doc.mimetype === 'application/pdf' || (doc.mimetype && doc.mimetype.startsWith('image/'))) && (
                    <button
                      onClick={() => handleCheckTampering(doc.id, doc.originalName, doc.mimetype)}
                      disabled={tamperingLoading[doc.id]}
                      className={styles.tamperingBtn}
                    >
                      {tamperingLoading[doc.id] ? '🔄 Checking...' : '🔐 Check Security'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(doc.id, doc.originalName)}
                    className={styles.deleteBtn}
                    title="Delete"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>

              {/* Right: Data + Security Panel */}
              <div className={styles.dataPanel}>
                {/* OCR Results */}
                {ocrResults[doc.id] && (
                  <div className={styles.dataCard}>
                    <div className={styles.dataCardHeader}>
                      <span>📄 Extracted Data</span>
                      {ocrResults[doc.id].documentType && (
                        <span className={styles.docTypeBadge}>{ocrResults[doc.id].documentType}</span>
                      )}
                    </div>
                    <div className={styles.dataCardBody}>
                      {Object.keys(ocrResults[doc.id].extractedData).length > 0 ? (
                        ocrResults[doc.id].documentType === 'SALARY_SLIP' &&
                        (Array.isArray(ocrResults[doc.id].extractedData.earnings) ||
                         Array.isArray(ocrResults[doc.id].extractedData.deductions)) ? (
                          <div className={styles.salarySlip}>
                            {ocrResults[doc.id].extractedData.employeeName && (
                              <div className={styles.salaryInfoRow}>
                                <span className={styles.salaryInfoLabel}>Employee:</span>
                                <span className={styles.salaryInfoValue}>{ocrResults[doc.id].extractedData.employeeName}</span>
                              </div>
                            )}
                            {ocrResults[doc.id].extractedData.employeeId && (
                              <div className={styles.salaryInfoRow}>
                                <span className={styles.salaryInfoLabel}>Employee ID:</span>
                                <span className={styles.salaryInfoValue}>{ocrResults[doc.id].extractedData.employeeId}</span>
                              </div>
                            )}
                            {ocrResults[doc.id].extractedData.monthYear && (
                              <div className={styles.salaryInfoRow}>
                                <span className={styles.salaryInfoLabel}>Period:</span>
                                <span className={styles.salaryInfoValue}>{ocrResults[doc.id].extractedData.monthYear}</span>
                              </div>
                            )}
                            {Array.isArray(ocrResults[doc.id].extractedData.earnings) && (
                              <div className={styles.salaryTableSection}>
                                <h4 className={styles.salaryTableTitle}>Earnings</h4>
                                <table className={styles.salaryTable}>
                                  <thead><tr><th className={styles.salaryThLeft}>Component</th><th className={styles.salaryThRight}>Amount</th></tr></thead>
                                  <tbody>
                                    {ocrResults[doc.id].extractedData.earnings.map((item, i) => (
                                      <tr key={i}><td className={styles.salaryTdLeft}>{item.component}</td><td className={styles.salaryTdRight}>{typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}</td></tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            {Array.isArray(ocrResults[doc.id].extractedData.deductions) && (
                              <div className={styles.salaryTableSection}>
                                <h4 className={styles.salaryTableTitle}>Deductions</h4>
                                <table className={styles.salaryTable}>
                                  <thead><tr><th className={styles.salaryThLeft}>Component</th><th className={styles.salaryThRight}>Amount</th></tr></thead>
                                  <tbody>
                                    {ocrResults[doc.id].extractedData.deductions.map((item, i) => (
                                      <tr key={i}><td className={styles.salaryTdLeft}>{item.component}</td><td className={styles.salaryTdRight}>{typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}</td></tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                            <div className={styles.salaryTotals}>
                              {ocrResults[doc.id].extractedData.totalEarnings != null && (
                                <div className={styles.salaryTotalRow}><span className={styles.salaryTotalLabel}>Total Earnings</span><span className={styles.salaryTotalValue}>{typeof ocrResults[doc.id].extractedData.totalEarnings === 'number' ? ocrResults[doc.id].extractedData.totalEarnings.toLocaleString() : ocrResults[doc.id].extractedData.totalEarnings}</span></div>
                              )}
                              {ocrResults[doc.id].extractedData.totalDeductions != null && (
                                <div className={styles.salaryTotalRow}><span className={styles.salaryTotalLabel}>Total Deductions</span><span className={styles.salaryTotalValue}>{typeof ocrResults[doc.id].extractedData.totalDeductions === 'number' ? ocrResults[doc.id].extractedData.totalDeductions.toLocaleString() : ocrResults[doc.id].extractedData.totalDeductions}</span></div>
                              )}
                              {ocrResults[doc.id].extractedData.netSalary != null && (
                                <div className={`${styles.salaryTotalRow} ${styles.salaryNetRow}`}><span className={styles.salaryTotalLabel}>Net Salary</span><span className={styles.salaryTotalValue}>{typeof ocrResults[doc.id].extractedData.netSalary === 'number' ? ocrResults[doc.id].extractedData.netSalary.toLocaleString() : ocrResults[doc.id].extractedData.netSalary}</span></div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className={styles.dataGrid}>
                            {Object.entries(ocrResults[doc.id].extractedData).map(([key, value]) => (
                              <div key={key} className={styles.dataItem}>
                                <span className={styles.dataKey}>{key}:</span>
                                <span className={styles.dataValue}>
                                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      ) : (
                        <p className={styles.noData}>No meaningful data extracted</p>
                      )}
                    </div>
                    <div className={styles.dataCardFooter}>
                      <span className={styles.ocrModel}>Model: {ocrResults[doc.id].model}</span>
                      <button
                        onClick={async () => { await handleValidateOCR(doc.id, doc.originalName); }}
                        disabled={validateLoading[doc.id]}
                        className={styles.validateDocBtn}
                      >
                        {validateLoading[doc.id] ? '⏳ Validating...' : '✓ Validate'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Validation Results */}
                {validationResults[doc.id] && (
                  <div className={styles.dataCard}>
                    <div className={styles.dataCardHeader}>
                      <span>✓ Validation Results</span>
                      <span className={`${styles.validationBadge} ${validationResults[doc.id].status === 'VALID' ? styles.statusValid : styles.statusInvalid}`}>
                        {validationResults[doc.id].status === 'VALID' ? 'VALID' : 'NEEDS REVIEW'}
                      </span>
                    </div>
                    <div className={styles.dataCardBody}>
                      <div className={styles.validationStats}>
                        <span className={styles.validationStat}>
                          <strong>{validationResults[doc.id].summary?.matchedFields || 0}</strong> / {validationResults[doc.id].summary?.totalFields || 0} fields matched
                        </span>
                        <span className={styles.validationConfidence}>
                          {validationResults[doc.id].summary?.averageConfidence || 0}% confidence
                        </span>
                      </div>
                      <div className={styles.validationFields}>
                        {validationResults[doc.id].fieldResults &&
                          Object.entries(validationResults[doc.id].fieldResults).map(([fieldKey, field]) => (
                            <div key={fieldKey} className={`${styles.validationField} ${field.matched ? styles.fieldMatched : styles.fieldUnmatched}`}>
                              <span className={styles.fieldIcon}>{field.matched ? '✓' : '✗'}</span>
                              <div className={styles.fieldContent}>
                                <span className={styles.fieldName}>{field.label}</span>
                                <span className={styles.fieldOcrValue}>{field.ocrValue || 'N/A'}</span>
                              </div>
                              <span className={styles.fieldConfidence}>{field.confidence}%</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Check */}
                {tamperingResults[doc.id] && (
                  <div className={styles.securityCard}>
                    <div className={styles.securityHeader}>
                      <div className={styles.securityTitleRow}>
                        <span className={styles.securityIcon}>{tamperingResults[doc.id].safe ? '✅' : '⚠️'}</span>
                        <strong>Security Check</strong>
                      </div>
                      <div className={styles.securityBadges}>
                        {tamperingResults[doc.id].cached && <span className={styles.cachedBadge}>Cached</span>}
                        <span className={`${styles.riskBadge} ${styles[`risk${tamperingResults[doc.id].riskLevel}`]}`}>
                          {tamperingResults[doc.id].riskLevel.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className={styles.riskGauge}>
                      <div className={styles.riskGaugeScoreRow}>
                        <span className={styles.riskGaugeSide}>Safe</span>
                        <span className={`${styles.riskGaugeBadge} ${styles[`badge${tamperingResults[doc.id].riskLevel}`]}`}>
                          {tamperingResults[doc.id].riskScore}
                        </span>
                        <span className={styles.riskGaugeSide}>High</span>
                      </div>
                      <div className={styles.riskGaugeBar}>
                        <div className={`${styles.riskGaugeFill} ${styles.gaugeFill} ${styles[`gauge${tamperingResults[doc.id].riskLevel}`]}`}
                          style={{ width: `${Math.min(tamperingResults[doc.id].riskScore, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className={styles.securitySummary}>{tamperingResults[doc.id].summary}</p>

                    {tamperingResults[doc.id].checks && (
                      <div className={styles.securityChecks}>
                        {Object.entries(tamperingResults[doc.id].checks).map(([key, check]) => (
                          <div key={key} className={`${styles.securityCheckItem} ${check.passed ? styles.checkPass : styles.checkFail}`}>
                            <span className={styles.checkIcon}>{check.passed ? '✓' : '✗'}</span>
                            <div className={styles.checkInfo}>
                              <span className={styles.checkName}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                              <span className={styles.checkMessage}>{check.message}</span>
                            </div>
                            {check.risk > 0 && <span className={styles.checkRisk}>+{check.risk}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {tamperingResults[doc.id].referenceComparison?.used && (
                      <div className={styles.refSection}>
                        <div className={styles.refHeader}>
                          <span>📋 Reference Comparison</span>
                          <span className={styles.refCountBadge}>{tamperingResults[doc.id].referenceComparison.referenceCount} samples</span>
                        </div>
                        {tamperingResults[doc.id].referenceComparison.similarityScore !== null && (
                          <div className={styles.refSimilarityBar}>
                            <div className={styles.refSimFill} style={{ width: `${tamperingResults[doc.id].referenceComparison.similarityScore}%` }} />
                            <span className={styles.refSimLabel}>{tamperingResults[doc.id].referenceComparison.similarityScore}% match</span>
                          </div>
                        )}
                        {tamperingResults[doc.id].referenceComparison.discrepancies?.length > 0 && (
                          <ul className={styles.refDiscList}>
                            {tamperingResults[doc.id].referenceComparison.discrepancies.map((d, i) => <li key={i}>{d}</li>)}
                          </ul>
                        )}
                      </div>
                    )}

                    {tamperingResults[doc.id].aiAnalysis?.success && (
                      <div className={styles.aiSection}>
                        <div className={styles.aiHeader}>
                          <span>🤖 AI Forensic Analysis</span>
                          <div className={styles.aiBadges}>
                            <span className={`${styles.verdictBadge} ${styles[tamperingResults[doc.id].aiAnalysis.verdict] || ''}`}>
                              {(tamperingResults[doc.id].aiAnalysis.verdict || 'unknown').replace('_', ' ')}
                            </span>
                            <span className={`${styles.confBadge} ${styles[tamperingResults[doc.id].aiAnalysis.confidence] || ''}`}>
                              {tamperingResults[doc.id].aiAnalysis.confidence}
                            </span>
                          </div>
                        </div>
                        {tamperingResults[doc.id].aiAnalysis.explanation && (
                          <p className={styles.aiExplanation}>{tamperingResults[doc.id].aiAnalysis.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!ocrResults[doc.id] && !tamperingResults[doc.id] && !validationResults[doc.id] && (
                  <div className={styles.dataEmpty}>
                    <span className={styles.dataEmptyIcon}>📋</span>
                    <p>Select an action above to analyze this document</p>
                    <div className={styles.dataEmptyHints}>
                      <span>🔍 Extract OCR to read text data</span>
                      <span>🔐 Check Security for tampering analysis</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Empty state */}
        {documents.length === 0 && (
          <div className={styles.emptyDocuments}>
            <div className={styles.emptyIcon}>📂</div>
            <p className={styles.emptyTitle}>No Documents Yet</p>
            <p className={styles.emptyText}>Upload your first document to get started</p>
          </div>
        )}
      </div>

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
    
  );
};

export default DocumentsPage;
