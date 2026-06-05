import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllUsers, deleteUser } from '@services/userFormService';
import Button from '@components/common/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { DataGrid } from '@mui/x-data-grid';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import DeleteIcon from '@mui/icons-material/Delete';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const HomePage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      setUsers(response.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}" and all associated documents?`)) return;
    try {
      await deleteUser(id);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const columns = [
    {
      field: 'username',
      headerName: 'User Full Name',
      flex: 1,
      minWidth: 150,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon sx={{ fontSize: 20, color: 'primary.main', opacity: 0.7 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'mobile',
      headerName: 'Mobile',
      width: 130,
    },
    {
      field: 'dob',
      headerName: 'DOB',
      width: 120,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString('en-IN') : '-',
    },
    {
      field: 'pan',
      headerName: 'PAN',
      width: 120,
    },
    {
      field: 'documentCount',
      headerName: 'Documents',
      width: 120,
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip
          icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
          label={params.value}
          size="small"
          color={params.value > 0 ? 'primary' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      width: 170,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: (params) => (
        <Tooltip title="Delete user">
          <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteUser(params.id, params.row.username); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Users</Typography>
          <Typography variant="body2" color="text.secondary">
            {users.length > 0
              ? `${users.length} user${users.length !== 1 ? 's' : ''} registered`
              : 'No users yet. Create your first user to get started.'}
          </Typography>
        </Box>
        <Button onClick={() => navigate('/user-form')} startIcon={<PersonAddIcon />}>
          Create User
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : users.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <PersonIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" gutterBottom color="text.secondary">No Users Yet</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Create a user to start uploading and analyzing documents.
            </Typography>
            <Button onClick={() => navigate('/user-form')} startIcon={<PersonAddIcon />}>
              Create User
            </Button>
          </Box>
        ) : (
          <DataGrid
            rows={users}
            columns={columns}
            getRowId={(row) => row.id}
            getRowHeight={() => 72}
            disableRowSelectionOnClick
            autoHeight
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
              sorting: { sortModel: [{ field: 'createdAt', sort: 'desc' }] },
            }}
            onRowClick={(params) => navigate(`/documents?userId=${params.id}`)}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': { py: 1.5, px: 2, display: 'flex', alignItems: 'center', cursor: 'pointer' },
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: 'grey.50',
                borderBottom: 2,
                borderColor: 'divider',
                minHeight: '56px !important',
                maxHeight: '56px !important',
              },
              '& .MuiDataGrid-columnHeader': { py: 1.5 },
              '& .MuiDataGrid-row': { cursor: 'pointer' },
            }}
          />
        )}
      </Paper>
    </Container>
  );
};

export default HomePage;