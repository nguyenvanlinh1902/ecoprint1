import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Button, Grid, TextField, Alert,
  LinearProgress, List, ListItem, ListItemText, Divider,
  Link as MuiLink, CircularProgress, Step, Stepper, StepLabel
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import api from '@/api';

const steps = ['Upload CSV File', 'Validate Data', 'Review & Confirm'];

const ImportOrdersPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [batchId, setBatchId] = useState(null);
  
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Check if file is CSV
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file');
      return;
    }
    
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setError('');
  };
  
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/api/orders/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Store validation results and batch ID
      setValidationResults(response.data.data.validationResults);
      setBatchId(response.data.data.batchId);
      
      // Move to the next step
      setActiveStep(1);
    } catch (error) {
      /* error removed */
      setError(error.response?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmBatch = async () => {
    try {
      setLoading(true);
      setError('');
      
      await api.post(`/api/batch-imports/${batchId}/confirm`);
      
      // Move to the final step
      setActiveStep(2);
    } catch (error) {
      /* error removed */
      setError(error.response?.data?.message || 'Failed to confirm batch. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadTemplate = () => {
    // Create CSV template
    const header = 'product_id,quantity,recipient_name,address,city,state,zip_code,phone,shipping_method,additional_requirements\n';
    const example = 'product123,5,John Doe,123 Main St,New York,NY,10001,1234567890,standard,Please gift wrap\n';
    const csvContent = header + example;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'order_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Upload CSV File
            </Typography>
            
            <Typography paragraph>
              Import multiple orders at once by uploading a CSV file with order details.
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <MuiLink 
                component="button"
                variant="body2"
                onClick={downloadTemplate}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <DownloadIcon fontSize="small" sx={{ mr: 0.5 }} />
                Download CSV Template
              </MuiLink>
            </Box>
            
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              sx={{ mb: 3 }}
            >
              Select File
              <input
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            
            {fileName && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <FileIcon sx={{ mr: 1 }} />
                <Typography>{fileName}</Typography>
              </Box>
            )}
            
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}
            
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={!file || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Upload & Validate'}
            </Button>
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Validation Results
            </Typography>
            
            {validationResults && (
              <Box>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {validationResults.valid}
                      </Typography>
                      <Typography variant="body2">Valid Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {validationResults.invalid}
                      </Typography>
                      <Typography variant="body2">Invalid Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4">
                        {validationResults.total}
                      </Typography>
                      <Typography variant="body2">Total Records</Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle1" gutterBottom>
                  Issues Found:
                </Typography>
                
                {validationResults.issues && validationResults.issues.length > 0 ? (
                  <List dense>
                    {validationResults.issues.map((issue, index) => (
                      <React.Fragment key={index}>
                        <ListItem>
                          <ListItemText
                            primary={`Row ${issue.row}: ${issue.message}`}
                            secondary={issue.details}
                          />
                        </ListItem>
                        {index < validationResults.issues.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                ) : (
                  <Typography>No issues found.</Typography>
                )}
                
                <Box sx={{ mt: 3 }}>
                  <Typography paragraph>
                    Proceeding will create {validationResults.valid} orders from valid records.
                    {validationResults.invalid > 0 && ' Invalid records will be skipped.'}
                  </Typography>
                  
                  <Button
                    variant="contained"
                    onClick={handleConfirmBatch}
                    disabled={loading || validationResults.valid === 0}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Confirm & Create Orders'}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom color="success.main">
              Import Successful!
            </Typography>
            
            <Typography paragraph>
              {validationResults?.valid} orders have been created successfully.
            </Typography>
            
            <Grid container spacing={2} justifyContent="center">
              <Grid item>
                <Button 
                  variant="outlined" 
                  component={Link} 
                  to={`/batch-imports/${batchId}`}
                >
                  View Batch Details
                </Button>
              </Grid>
              <Grid item>
                <Button 
                  variant="contained" 
                  component={Link} 
                  to="/orders"
                >
                  Go to Orders
                </Button>
              </Grid>
            </Grid>
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Import Orders
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        {renderStepContent(activeStep)}
      </Paper>
    </Box>
  );
};

export default ImportOrdersPage; 