import React from 'react';
import { Chip } from '@mui/material';

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
    case 'completed':
    case 'delivered':
      return 'success';
    case 'pending':
    case 'processing':
      return 'warning';
    case 'inactive':
    case 'cancelled':
    case 'rejected':
      return 'error';
    case 'shipped':
      return 'info';
    default:
      return 'default';
  }
};

const StatusBadge = ({ status, type = 'default' }) => {
  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={getStatusColor(status)}
      size="small"
      variant={type === 'outlined' ? 'outlined' : 'filled'}
    />
  );
};

export default StatusBadge; 