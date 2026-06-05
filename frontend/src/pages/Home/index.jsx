import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllDocuments } from '@services/documentService';
import { getUserInfo } from '@services/userFormService';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { DataGrid } from '@mui/x-data-grid';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ImageIcon from '@mui/icons-material/Image';

const formatDocType = (type) => {
  if (!type) return '';
  return type
    .split('_')
    .map(word => word === 'PAN' ? word : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const StatusChip = ({ label, color }) => (
  <Chip label={label} size="small" color={color} variant="outlined" sx={{ fontWeight: 500, minWidth: 72 }} />
);

const HomePage = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    setUserInfo(getUserInfo());
  }, []);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const response = await getAllDocuments();
        setDocuments(response.data || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch documents');
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  const columns = [
    {
      field: 'originalName',
      headerName: 'Document Name',
      flex: 1.5,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ImageIcon sx={{ fontSize: 20, color: 'primary.main', opacity: 0.7 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'documentType',
      headerName: 'Type',
      width: 140,
      renderCell: (params) =>
        params.value ? (
          <Chip label={formatDocType(params.value)} size="small" color="primary" variant="outlined" />
        ) : (
          <Typography variant="caption" color="text.disabled">Not set</Typography>
        ),
    },
    {
      field: 'sizeFormatted',
      headerName: 'Size',
      width: 90,
      align: 'right',
      headerAlign: 'right',
    },
    {
      field: 'uploadedAt',
      headerName: 'Uploaded At',
      width: 170,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'ocrProcessed',
      headerName: 'OCR Status',
      width: 120,
      renderCell: (params) => {
        const doc = params.row;
        if (doc.ocrError) return <StatusChip label="Failed" color="error" />;
        if (doc.ocrProcessed && doc.ocrData) return <StatusChip label="Extracted" color="success" />;
        return <StatusChip label="Pending" color="default" />;
      },
    },
    {
      field: 'formatValidation',
      headerName: 'Format',
      width: 100,
      renderCell: (params) => {
        const fv = params.value;
        if (!fv) return <StatusChip label="Pending" color="default" />;
        return fv.valid
          ? <StatusChip label="Pass" color="success" />
          : <StatusChip label="Fail" color="error" />;
      },
    },
    {
      field: 'tamperingStatus',
      headerName: 'Security',
      width: 110,
      sortable: false,
      renderCell: (params) => {
        const doc = params.row;
        const tamper = doc.pdfTampering || doc.imageTampering;
        if (!tamper) return <StatusChip label="Pending" color="default" />;
        const color = tamper.riskLevel === 'low' ? 'success' : tamper.riskLevel === 'medium' ? 'warning' : 'error';
        return <StatusChip label={tamper.riskLevel.toUpperCase()} color={color} />;
      },
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Open in Documents">
          <IconButton size="small" color="primary" onClick={() => navigate('/documents')}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">
            {userInfo
              ? `Welcome back, ${userInfo.username} — ${documents.length} document${documents.length !== 1 ? 's' : ''} uploaded`
              : 'Upload your first document to get started'}
          </Typography>
        </Box>
      </Box>

      {/* Error */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Data Grid */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : documents.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <ImageIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="text.secondary">No Documents Yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Head over to the Documents page to upload and analyze your first document.
            </Typography>
          </Box>
        ) : (
          <DataGrid
            rows={documents}
            columns={columns}
            getRowId={(row) => row.id}
            getRowHeight={() => 72}
            disableRowSelectionOnClick
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'uploadedAt', sort: 'desc' }] },
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { py: 1.5, px: 2, display: 'flex', alignItems: 'center' },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'grey.50',
                borderBottom: 2,
                borderColor: 'divider',
                minHeight: '56px !important',
                maxHeight: '56px !important',
              },
              '& .MuiDataGrid-columnHeader': { py: 1.5 },
            }}
          />
        )}
      </Paper>
    </Container>
  );
};

export default HomePage;