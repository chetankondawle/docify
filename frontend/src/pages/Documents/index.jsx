import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUpload from '@components/common/FileUpload';
import Button from '@components/common/Button';
import Snackbar from '@components/common/Snackbar';
import { getAllDocuments, deleteDocument } from '@services/documentService';
import { extractOCR, extractStructuredData, getDocumentTypes } from '@services/ocrService';
import { checkTampering, checkImageTampering } from '@services/tamperingService';
import { validateDocument, validateDocuments } from '@services/validateService';
import { getUserInfo, clearUserInfo } from '@services/userFormService';

import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const DocumentsPage = () => {
  const navigate = useNavigate();

  const formatDocType = (type) => {
    if (!type) return '';
    return type
      .split('_')
      .map(word => word === 'PAN' ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState(null);
  const mountedRef = useRef(true);
  const timersRef = useRef([]);

  const showSnackbar = (message, type = 'error') => {
    setSnackbar({ message, type });
  };

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

  const [ocrLoading, setOcrLoading] = useState({});
  const [ocrResults, setOcrResults] = useState({});
  const [showOriginal, setShowOriginal] = useState({}); // toggle original vs translated

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
  const [allAvailableDocumentTypes, setAllAvailableDocumentTypes] = useState([]);
  const [selectedTypeForUpload, setSelectedTypeForUpload] = useState('');
  const [activeTab, setActiveTab] = useState(0);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllDocuments();
      setDocuments(response.data || []);
    } catch (err) {
      showSnackbar(err.message || 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const info = getUserInfo();
    if (!info) {
      navigate('/user-form');
      return;
    }
    setUserInfo(info);
    fetchDocuments();
  }, [fetchDocuments]);

  // Make latest tab active and clean up stale results when document list changes
  useEffect(() => {
    setActiveTab(documents.length > 0 ? documents.length - 1 : 0);
    const currentIds = new Set(documents.map((d) => d.id));
    setOcrResults((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => currentIds.has(Number(id)))));
    setTamperingResults((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => currentIds.has(Number(id)))));
    setValidationResults((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => currentIds.has(Number(id)))));
  }, [documents.length]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await getDocumentTypes();
        setAllAvailableDocumentTypes(response.data.documentTypes || []);
      } catch (err) {
        console.error("Error fetching document types:", err);
        showSnackbar("Failed to load document types. Please check the backend service.");
      }
    };
    fetchTypes();
  }, []);

  const handleUploadSuccess = (document) => {
    showSnackbar(`Document "${document.originalName}" uploaded successfully!`, 'success');
    fetchDocuments();
    setSuccessMessage(`Document "${document.originalName}" uploaded successfully!`);
    safeTimeout(() => setSuccessMessage(null), 5000);
    fetchDocuments();
  };

  const handleUploadError = (errorMsg) => {
    showSnackbar(errorMsg);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deleteDocument(id);
      showSnackbar('Document deleted successfully', 'success');
      fetchDocuments();
    } catch (err) {
      showSnackbar(err.message || 'Failed to delete document');
    }
  };

  const handleExtractOCR = async (docId, docName) => {
    setOcrLoading((prev) => ({ ...prev, [docId]: true }));
    setError(null);
    const document = documents.find(doc => doc.id === docId);
    
    if (!document) {
      showSnackbar('Document not found');
      setOcrLoading((prev) => ({ ...prev, [docId]: false }));
      return;
    }

    if (!document.documentType) {
      showSnackbar('Document type not specified. Please re-upload the document with a document type.');
      setOcrLoading((prev) => ({ ...prev, [docId]: false }));
      return;
    }
    try {
      const response = await extractStructuredData(docId, document.documentType);
      setOcrResults((prev) => ({
        ...prev,
        [docId]: {
          documentType: response.data.documentType,
          extractedData: response.data.extractedData || {},
          formatValidation: response.data.formatValidation || null,
          originalExtractedData: response.data.originalExtractedData || null,
          documentLanguage: response.data.documentLanguage || null,
          model: response.data.model,
          quality: response.data.quality || null,
        },
      }));

      showSnackbar(
        `OCR extraction completed for "${docName}" as ${document.documentType}`,
        'success'
      );
      setSuccessMessage(`OCR extraction completed for "${docName}" as ${document.documentType}`);
      safeTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      showSnackbar(err.message || 'OCR extraction failed');
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
      showSnackbar('Security check is only supported for PDF and image files');
      setTamperingLoading((prev) => ({ ...prev, [docId]: false }));
      return;
    }
    try {
      const response = isImage ? await checkImageTampering(docId) : await checkTampering(docId);
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

      showSnackbar(
        `${isImage ? 'Image' : 'PDF'} security check completed for "${docName}"${
          response.data.cached ? ' (cached)' : ''
        }`,
        'success'
      );
      setSuccessMessage(`${isImage ? 'Image' : 'PDF'} security check completed for "${docName}"${response.data.cached ? ' (cached)' : ''}`);
      safeTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      showSnackbar(err.message || 'Security check failed');
    } finally {
      setTamperingLoading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const handleDocumentTypeForUploadChange = (type) => {
    setSelectedTypeForUpload(type);
  };

  const handleValidateOCR = async (docId, docName) => {
    const doc = documents.find(d => d.id === docId);
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
    setSelectedDocForValidation(docId);
    try {
      const response = await validateDocument(docId, doc.documentType, ocrResults[docId].extractedData, userInfo);
      setValidationResults((prev) => ({ ...prev, [docId]: response.data }));
      setSuccessMessage(`✓ Validation completed for "${docName}"`);
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
      const documentsArray = documentsWithOCR.map(doc => ({
        documentId: doc.id,
        documentType: doc.documentType,
        extractedData: ocrResults[doc.id].extractedData,
      }));
      const response = await validateDocuments(documentsArray, userInfo);
      setValidationResults(prev => ({ ...prev, __crossValidation__: response.data }));
      setCrossValidationSuccess(true);
      safeTimeout(() => setCrossValidationSuccess(false), 5000);
    } catch (err) {
      setCrossValidationError(err.message || 'Cross-validation failed. Please try again.');
    } finally {
      setCrossValidationLoading(false);
    }
  };

  const getBaseUrl = () =>
    import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:5000';

  const doc = documents.length > 0 ? documents[activeTab] : null;

  return (
    <Box sx={{ pb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <ImageIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4">Document Validation Center</Typography>
          <Typography variant="body2" color="text.secondary">
            Upload, extract, and validate your documents seamlessly
          </Typography>
        </Box>
      </Box>

      {/* User Banner */}
      {userInfo && (
        <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.light' }}>
            <PersonIcon />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>{userInfo.username}</Typography>
            <Typography variant="body2" color="text.secondary">
              {userInfo.mobile} &middot; {new Date(userInfo.dob).toLocaleDateString()} &middot; {userInfo.address}
            </Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={handleEditUserInfo} startIcon={<EditIcon />}>
            Edit Info
          </Button>
        </Paper>
      )}

      <Snackbar message={snackbar?.message} type={snackbar?.type} onClose={() => setSnackbar(null)} />

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
      {/* Alerts */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

      {/* Upload Section */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="upload-doc-type-label">Select Type for Upload</InputLabel>
            <Select
              labelId="upload-doc-type-label"
              value={selectedTypeForUpload}
              label="Select Type for Upload"
              onChange={(e) => handleDocumentTypeForUploadChange(e.target.value)}
              disabled={loading || allAvailableDocumentTypes.length === 0}
            >
              {allAvailableDocumentTypes.length === 0 ? (
                <MenuItem value="">Loading types...</MenuItem>
              ) : (
                [
                  <MenuItem key="" value="">-- Select Type --</MenuItem>,
                  ...allAvailableDocumentTypes.map((type) => (
                    <MenuItem key={type} value={type}>{formatDocType(type)}</MenuItem>
                  ))
                ]
              )}
            </Select>
          </FormControl>
        </Box>
        <FileUpload
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          selectedDocumentType={selectedTypeForUpload}
        />
      </Paper>

      {/* Documents Section */}
      {loading ? (
        <LinearProgress />
      ) : documents.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <ImageIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
          <Typography variant="h5" gutterBottom>No Documents Yet</Typography>
          <Typography variant="body2" color="text.secondary">Upload your first document to get started</Typography>
        </Paper>
      ) : (
        <Box>
          {/* Tab Bar */}
          <Paper sx={{ mb: 2, borderRadius: 2 }} variant="outlined">
            <Box sx={{ display: 'flex', alignItems: 'center', overflow: 'auto' }}>
              <Tabs
                value={activeTab}
                onChange={(e, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ flex: 1, minHeight: 48 }}
              >
                {documents.map((d) => (
                  <Tab
                    key={d.id}
                    icon={d.mimetype === 'application/pdf' ? <PictureAsPdfIcon /> : <ImageIcon />}
                    iconPosition="start"
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: 180 }}>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 100 }}>
                          {d.originalName}
                        </Typography>
                        {d.documentType && (
                          <Chip label={formatDocType(d.documentType)} size="small" variant="outlined" sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }} />
                        )}
                        {tamperingResults[d.id] && (
                          <Chip
                            label={tamperingResults[d.id].safe ? '✓' : '⚠'}
                            size="small"
                            color={tamperingResults[d.id].safe ? 'success' : 'warning'}
                            sx={{ height: 20, minWidth: 28 }}
                          />
                        )}
                      </Box>
                    }
                    sx={{ minHeight: 48, textTransform: 'none', maxWidth: 220, minWidth: 100, marginRight: '8px' }}
                  />
                ))}
              </Tabs>
              {documents.length > 1 && (
                <Box sx={{ px: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCrossValidateAll}
                    disabled={Object.keys(ocrResults).length < 2 || crossValidationLoading}
                    loading={crossValidationLoading}
                  >
                    Cross-Validate
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>

          {crossValidationError && (
            <Alert severity="warning" sx={{ mb: 2 }}>{crossValidationError}</Alert>
          )}

          {/* Active Document Panel */}
          {doc && (
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
              {/* Left: Preview */}
              <Box sx={{ flex: { md: '0 0 45%' }, width: '100%' }}>
                <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle2" fontWeight={600}>{doc.originalName}</Typography>
                  </Box>
                  <Box sx={{ p: 2, textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {doc.mimetype && doc.mimetype.startsWith('image/') ? (
                      <Box
                        component="img"
                        src={`${getBaseUrl()}/uploads/${doc.filename}`}
                        alt={doc.originalName}
                        sx={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain', borderRadius: 1 }}
                      />
                    ) : (
                      <Box sx={{ textAlign: 'center' }}>
                        <PictureAsPdfIcon sx={{ fontSize: 64, color: 'error.light' }} />
                        <Typography variant="body2">{doc.originalName}</Typography>
                      </Box>
                    )}
                  </Box>
                  <Divider />
                  <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                    <Chip label={`Size: ${doc.sizeFormatted}`} size="small" variant="outlined" />
                    <Chip label={doc.mimetype} size="small" variant="outlined" />
                    {doc.documentType && <Chip label={formatDocType(doc.documentType)} size="small" color="primary" />}
                  </Box>
                  <Divider />
                  <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" variant="outlined" component="a"
                      href={`${getBaseUrl()}/uploads/${doc.filename}`} target="_blank"
                      endIcon={<OpenInNewIcon />}>
                      View
                    </Button>
                    <Button size="small" variant="contained"
                      onClick={() => handleExtractOCR(doc.id, doc.originalName)}
                      disabled={ocrLoading[doc.id]}>
                      {ocrLoading[doc.id] ? 'Extracting...' : 'Extract OCR'}
                    </Button>
                    {(doc.mimetype === 'application/pdf' || (doc.mimetype && doc.mimetype.startsWith('image/'))) && (
                      <Button size="small" variant="outlined" color="warning"
                        onClick={() => handleCheckTampering(doc.id, doc.originalName, doc.mimetype)}
                        disabled={tamperingLoading[doc.id]}>
                        {tamperingLoading[doc.id] ? 'Checking...' : 'Check Security'}
                      </Button>
                    )}
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error"
                        onClick={() => handleDelete(doc.id, doc.originalName)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              </Box>

              {/* Right: Data + Security Panel */}
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* OCR Results */}
                {ocrResults[doc.id] && (() => {
                  const displayData = showOriginal[doc.id] && ocrResults[doc.id].originalExtractedData
                    ? ocrResults[doc.id].originalExtractedData
                    : ocrResults[doc.id].extractedData;
                  return (
                  <Paper sx={{ borderRadius: 2 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">Extracted Data</Typography>
                      {ocrResults[doc.id].documentType && (
                        <Chip label={formatDocType(ocrResults[doc.id].documentType)} size="small" color="primary" />
                      )}
                      {ocrResults[doc.id].documentLanguage && ocrResults[doc.id].documentLanguage !== 'English' && (
                        <span className={styles.langBadge}>{ocrResults[doc.id].documentLanguage}</span>
                      )}
                    </Box>
                    <Box sx={{ p: 2 }}>
                      {Object.keys(displayData).length > 0 ? (
                        ocrResults[doc.id].documentType === 'SALARY_SLIP' &&
                        (Array.isArray(ocrResults[doc.id].extractedData.earnings) ||
                         Array.isArray(ocrResults[doc.id].extractedData.deductions)) ? (
                          <Box>
                            {ocrResults[doc.id].extractedData.employeeName && (
                              <Typography variant="body2"><strong>Employee:</strong> {ocrResults[doc.id].extractedData.employeeName}</Typography>
                            )}
                            {ocrResults[doc.id].extractedData.employeeId && (
                              <Typography variant="body2"><strong>Employee ID:</strong> {ocrResults[doc.id].extractedData.employeeId}</Typography>
                            )}
                            {displayData.monthYear && (
                              <Typography variant="body2"><strong>Period:</strong> {displayData.monthYear}</Typography>
                            )}
                            {Array.isArray(displayData.earnings) && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Earnings</Typography>
                                <TableContainer component={Paper} variant="outlined">
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Component</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {displayData.earnings.map((item, i) => (
                                        <TableRow key={i}>
                                          <TableCell>{item.component}</TableCell>
                                          <TableCell align="right">{typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            )}
                            {Array.isArray(displayData.deductions) && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Deductions</Typography>
                                <TableContainer component={Paper} variant="outlined">
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Component</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {displayData.deductions.map((item, i) => (
                                        <TableRow key={i}>
                                          <TableCell>{item.component}</TableCell>
                                          <TableCell align="right">{typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </Box>
                            )}
                            <Box sx={{ mt: 2, borderTop: 1, borderColor: 'divider', pt: 1 }}>
                              {displayData.totalEarnings != null && (
                                <Typography variant="body2"><strong>Total Earnings:</strong> {typeof displayData.totalEarnings === 'number' ? displayData.totalEarnings.toLocaleString() : displayData.totalEarnings}</Typography>
                              )}
                              {ocrResults[doc.id].extractedData.totalDeductions != null && (
                                <Typography variant="body2"><strong>Total Deductions:</strong> {typeof ocrResults[doc.id].extractedData.totalDeductions === 'number' ? ocrResults[doc.id].extractedData.totalDeductions.toLocaleString() : ocrResults[doc.id].extractedData.totalDeductions}</Typography>
                              )}
                              {ocrResults[doc.id].extractedData.netSalary != null && (
                                <Typography variant="body2" fontWeight={700} color="primary.main"><strong>Net Salary:</strong> {typeof ocrResults[doc.id].extractedData.netSalary === 'number' ? ocrResults[doc.id].extractedData.netSalary.toLocaleString() : ocrResults[doc.id].extractedData.netSalary}</Typography>
                              )}
                            </Box>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                            {Object.entries(ocrResults[doc.id].extractedData).map(([key, value]) => (
                              <Box key={key}>
                                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</Typography>
                                <Typography variant="body2">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )
                      ) : (
                        <Typography variant="body2" color="text.secondary">No meaningful data extracted</Typography>
                      )}

                      {/* Format Validation Results */}
                      {ocrResults[doc.id].formatValidation && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Format Validation
                            <Chip
                              label={ocrResults[doc.id].formatValidation.valid ? 'PASS' : 'FAIL'}
                              size="small"
                              color={ocrResults[doc.id].formatValidation.valid ? 'success' : 'error'}
                              sx={{ ml: 1 }}
                            />
                          </Typography>
                          {Object.entries(ocrResults[doc.id].formatValidation.fieldResults || {}).map(([field, result]) => (
                            <Box key={field} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Chip label={result.valid ? '✓' : '✗'} size="small" color={result.valid ? 'success' : 'error'} sx={{ minWidth: 28 }} />
                              <Box>
                                <Typography variant="caption">{field}: {result.value || 'N/A'}</Typography>
                                {result.errors.length > 0 && result.errors.map((e, i) => (
                                  <Typography key={i} variant="caption" color="error" display="block">{e}</Typography>
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                    <Divider />
                    {/* <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Model: {ocrResults[doc.id].model}</Typography>
                      <Button size="small"
                        onClick={async () => { await handleValidateOCR(doc.id, doc.originalName); }}
                        disabled={validateLoading[doc.id]}>
                        {validateLoading[doc.id] ? 'Validating...' : 'Validate'}
                      </Button>
                    </Box> */}
                  </Paper>
                  );
                })()}

                {/* Validation Results */}
                {validationResults[doc.id] && (
                  <Paper sx={{ borderRadius: 2 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">Validation Results</Typography>
                      <Chip
                        label={validationResults[doc.id].status === 'VALID' ? 'VALID' : 'NEEDS REVIEW'}
                        size="small"
                        color={validationResults[doc.id].status === 'VALID' ? 'success' : 'warning'}
                      />
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Chip label={`${validationResults[doc.id].summary?.matchedFields || 0} / ${validationResults[doc.id].summary?.totalFields || 0} fields matched`} variant="outlined" size="small" />
                        <Chip label={`${validationResults[doc.id].summary?.averageConfidence || 0}% confidence`} variant="outlined" size="small" />
                      </Box>
                      {validationResults[doc.id].fieldResults &&
                        Object.entries(validationResults[doc.id].fieldResults).map(([fieldKey, field]) => (
                          <Box key={fieldKey} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: 1, borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
                            <Chip label={field.matched ? '✓' : '✗'} size="small" color={field.matched ? 'success' : 'error'} sx={{ minWidth: 32 }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={500}>{field.label}</Typography>
                              <Typography variant="caption" color="text.secondary">{field.ocrValue || 'N/A'}</Typography>
                            </Box>
                            <Chip label={`${field.confidence}%`} size="small" variant="outlined" />
                          </Box>
                        ))}
                    </Box>
                  </Paper>
                )}

                {/* Security Check Results */}
                {tamperingResults[doc.id] && (
                  <Paper sx={{ borderRadius: 2 }}>
                    <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">Security Check</Typography>
                      {tamperingResults[doc.id].cached && <Chip label="Cached" size="small" variant="outlined" />}
                      <Chip
                        label={tamperingResults[doc.id].riskLevel}
                        size="small"
                        color={tamperingResults[doc.id].riskLevel === 'low' ? 'success' : tamperingResults[doc.id].riskLevel === 'medium' ? 'warning' : 'error'}
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Safe</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(tamperingResults[doc.id].riskScore, 100)}
                          sx={{
                            flex: 1, height: 8, borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: tamperingResults[doc.id].riskLevel === 'low' ? 'success.main'
                                : tamperingResults[doc.id].riskLevel === 'medium' ? 'warning.main'
                                : 'error.main',
                            },
                          }}
                        />
                        <Chip label={tamperingResults[doc.id].riskScore} size="small" color={tamperingResults[doc.id].riskLevel === 'low' ? 'success' : tamperingResults[doc.id].riskLevel === 'medium' ? 'warning' : 'error'} />
                        <Typography variant="caption" color="text.secondary">High</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{tamperingResults[doc.id].summary}</Typography>

                      {tamperingResults[doc.id].checks && (
                        <Box sx={{ mt: 2 }}>
                          {Object.entries(tamperingResults[doc.id].checks).map(([key, check]) => (
                            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                              <Chip label={check.passed ? '✓' : '✗'} size="small" color={check.passed ? 'success' : 'error'} sx={{ minWidth: 28 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="caption" fontWeight={500} sx={{ textTransform: 'capitalize' }}>{key}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">{check.message}</Typography>
                              </Box>
                              {check.risk > 0 && <Chip label={`+${check.risk}`} size="small" variant="outlined" color="warning" />}
                            </Box>
                          ))}
                        </Box>
                      )}

                      {tamperingResults[doc.id].aiAnalysis?.success && (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={600}>{tamperingResults[doc.id].aiAnalysis.verdict?.replace(/_/g, ' ')}</Typography>
                            <Chip label={tamperingResults[doc.id].aiAnalysis.confidence} size="small" variant="outlined" />
                          </Box>
                          {tamperingResults[doc.id].aiAnalysis.explanation && (
                            <Typography variant="caption" color="text.secondary">{tamperingResults[doc.id].aiAnalysis.explanation}</Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Paper>
                )}

                {/* Empty State */}
                {!ocrResults[doc.id] && !tamperingResults[doc.id] && !validationResults[doc.id] && (
                  <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <ImageIcon sx={{ fontSize: 48, color: 'grey.300', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      Select an action above to analyze this document
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Extract OCR to read text data
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Check Security for tampering analysis
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          )}

          {/* Cross-Validation Results */}
          {validationResults.__crossValidation__ && (
            <Paper sx={{ mt: 3, borderRadius: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">Cross-Document Validation Results</Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {validationResults.__crossValidation__.crossDocumentIssues?.length > 0 ? (
                  validationResults.__crossValidation__.crossDocumentIssues.map((issue, idx) => (
                    <Box key={idx} sx={{ p: 2, mb: 1, border: 1, borderColor: issue.severity === 'HIGH' ? 'error.main' : 'warning.main', borderRadius: 1, bgcolor: issue.severity === 'HIGH' ? 'error.50' : 'warning.50' }}>
                      <Typography variant="subtitle2" color={issue.severity === 'HIGH' ? 'error.dark' : 'warning.dark'}>
                        {issue.field}
                      </Typography>
                      <Typography variant="body2">{issue.message}</Typography>
                      {issue.details && (
                        <Box sx={{ mt: 1 }}>
                          {Object.entries(issue.details).map(([value, docIds]) => (
                            <Typography key={value} variant="caption" display="block">
                              &quot;{value}&quot; found in: {Array.isArray(docIds) ? docIds.join(', ') : docIds}
                            </Typography>
                          ))}
                        </Box>
                      )}
                    </Box>
                  ))
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="h6" color="success.main">✓ All Documents Consistent</Typography>
                    <Typography variant="body2" color="text.secondary">
                      No inconsistencies found across {Object.keys(validationResults.__crossValidation__.validations || {}).length} documents
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DocumentsPage;