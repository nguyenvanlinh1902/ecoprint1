import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, TextField, Button, Divider, 
  FormControlLabel, Switch, Alert, CircularProgress, Tab, Tabs,
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { api } from '../../helpers';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    supportEmail: '',
    supportPhone: '',
    maintenanceMode: false,
    signupEnabled: true,
    requireApproval: true
  });
  
  // Email settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: ''
  });
  
  // Email template settings
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateContent, setTemplateContent] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  
  // API Key management
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false);
  const [selectedKeyId, setSelectedKeyId] = useState(null);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch general settings
        const generalResponse = await api.get('/api/admin/settings/general');
        setGeneralSettings(generalResponse.data.data);
        
        // Fetch email settings
        const emailResponse = await api.get('/api/admin/settings/email');
        setEmailSettings(emailResponse.data.data);
        
        // Fetch email templates
        const templatesResponse = await api.get('/api/admin/settings/email-templates');
        setEmailTemplates(templatesResponse.data.data);
        
        // Fetch API keys
        const apiKeysResponse = await api.get('/api/admin/settings/api-keys');
        setApiKeys(apiKeysResponse.data.data);
        
      } catch (error) {
        /* error removed */
        setError('Failed to load settings. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleGeneralInputChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSwitchChange = (e) => {
    const { name, checked } = e.target;
    setGeneralSettings((prev) => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleEmailInputChange = (e) => {
    const { name, value } = e.target;
    setEmailSettings((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveGeneralSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await api.put('/api/admin/settings/general', generalSettings);
      
      setSuccess('General settings saved successfully.');
    } catch (error) {
      /* error removed */
      setError('Failed to save general settings. Please try again later.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSaveEmailSettings = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await api.put('/api/admin/settings/email', emailSettings);
      
      setSuccess('Email settings saved successfully.');
    } catch (error) {
      /* error removed */
      setError('Failed to save email settings. Please try again later.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleTestEmailConnection = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await api.post('/api/admin/settings/email/test', emailSettings);
      
      setSuccess('Email connection test successful!');
    } catch (error) {
      /* error removed */
      setError('Email connection test failed. Please check your settings.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleTemplateSelect = async (template) => {
    try {
      setLoading(true);
      setSelectedTemplate(template);
      
      const response = await api.get(`/api/admin/settings/email-templates/${template.id}`);
      setTemplateContent(response.data.data.content);
      setTemplateSubject(response.data.data.subject);
      
      setTemplateDialogOpen(true);
    } catch (error) {
      /* error removed */
      setError('Failed to load email template. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      
      await api.put(`/api/admin/settings/email-templates/${selectedTemplate.id}`, {
        subject: templateSubject,
        content: templateContent
      });
      
      // Update the template in the list
      setEmailTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id ? { ...t, subject: templateSubject } : t
      ));
      
      setTemplateDialogOpen(false);
      setSuccess('Email template saved successfully.');
    } catch (error) {
      /* error removed */
      setError('Failed to save email template. Please try again later.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleGenerateApiKey = async () => {
    try {
      setSaving(true);
      
      const response = await api.post('/api/admin/settings/api-keys', {
        name: newKeyName
      });
      
      setGeneratedKey(response.data.data.key);
      setApiKeys([...apiKeys, response.data.data]);
      setNewKeyName('');
      setKeyDialogOpen(true);
    } catch (error) {
      /* error removed */
      setError('Failed to generate API key. Please try again later.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleDeleteKey = (keyId) => {
    setSelectedKeyId(keyId);
    setConfirmDeleteDialog(true);
  };
  
  const confirmDeleteKey = async () => {
    try {
      await api.delete(`/api/admin/settings/api-keys/${selectedKeyId}`);
      
      setApiKeys(apiKeys.filter(key => key.id !== selectedKeyId));
      setConfirmDeleteDialog(false);
      setSuccess('API key deleted successfully.');
    } catch (error) {
      /* error removed */
      setError('Failed to delete API key. Please try again later.');
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="settings tabs">
          <Tab label="General" id="settings-tab-0" aria-controls="settings-tabpanel-0" />
          <Tab label="Email" id="settings-tab-1" aria-controls="settings-tabpanel-1" />
          <Tab label="Email Templates" id="settings-tab-2" aria-controls="settings-tabpanel-2" />
          <Tab label="API Keys" id="settings-tab-3" aria-controls="settings-tabpanel-3" />
        </Tabs>
        
        {/* General Settings */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Company Name"
                name="companyName"
                value={generalSettings.companyName}
                onChange={handleGeneralInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Support Email"
                name="supportEmail"
                value={generalSettings.supportEmail}
                onChange={handleGeneralInputChange}
                fullWidth
                margin="normal"
                type="email"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="Support Phone"
                name="supportPhone"
                value={generalSettings.supportPhone}
                onChange={handleGeneralInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalSettings.maintenanceMode}
                    onChange={handleSwitchChange}
                    name="maintenanceMode"
                    color="primary"
                  />
                }
                label="Maintenance Mode"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                When enabled, the site will show a maintenance message to all non-admin users.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalSettings.signupEnabled}
                    onChange={handleSwitchChange}
                    name="signupEnabled"
                    color="primary"
                  />
                }
                label="Allow New Registrations"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                When disabled, new users won't be able to register on the platform.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={generalSettings.requireApproval}
                    onChange={handleSwitchChange}
                    name="requireApproval"
                    color="primary"
                  />
                }
                label="Require Admin Approval for New Users"
              />
              <Typography variant="caption" color="text.secondary" display="block">
                When enabled, new user accounts will require admin approval before they can log in.
              </Typography>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveGeneralSettings}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : 'Save Settings'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Email Settings */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="SMTP Host"
                name="smtpHost"
                value={emailSettings.smtpHost}
                onChange={handleEmailInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="SMTP Port"
                name="smtpPort"
                value={emailSettings.smtpPort}
                onChange={handleEmailInputChange}
                fullWidth
                margin="normal"
                type="number"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="SMTP Username"
                name="smtpUsername"
                value={emailSettings.smtpUsername}
                onChange={handleEmailInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="SMTP Password"
                name="smtpPassword"
                value={emailSettings.smtpPassword}
                onChange={handleEmailInputChange}
                fullWidth
                margin="normal"
                type="password"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="From Email"
                name="fromEmail"
                value={emailSettings.fromEmail}
                onChange={handleEmailInputChange}
                fullWidth
                margin="normal"
                type="email"
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                label="From Name"
                name="fromName"
                value={emailSettings.fromName}
                onChange={handleEmailInputChange}
                fullWidth
                margin="normal"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleTestEmailConnection}
                  disabled={saving}
                >
                  Test Connection
                </Button>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveEmailSettings}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={24} /> : 'Save Settings'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Email Templates */}
        <TabPanel value={activeTab} index={2}>
          <Typography paragraph>
            Customize email templates sent to users for various system events. Click on a template to edit.
          </Typography>
          
          <List>
            {emailTemplates.map((template) => (
              <ListItem 
                key={template.id} 
                button 
                onClick={() => handleTemplateSelect(template)}
                divider
              >
                <ListItemText 
                  primary={template.name} 
                  secondary={template.description}
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>
        
        {/* API Keys */}
        <TabPanel value={activeTab} index={3}>
          <Typography paragraph>
            API keys allow external applications to access the system's API.
            Keep your API keys secure and never share them publicly.
          </Typography>
          
          <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-end' }}>
            <TextField
              label="API Key Name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              sx={{ mr: 2, flexGrow: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleGenerateApiKey}
              disabled={!newKeyName.trim() || saving}
            >
              Generate New Key
            </Button>
          </Box>
          
          <Paper variant="outlined">
            <List>
              {apiKeys.length > 0 ? (
                apiKeys.map((key) => (
                  <ListItem key={key.id} divider>
                    <ListItemText
                      primary={key.name}
                      secondary={`Created: ${new Date(key.createdAt).toLocaleDateString()} • Last used: ${key.lastUsed ? new Date(key.lastUsed).toLocaleString() : 'Never'}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" onClick={() => handleDeleteKey(key.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              ) : (
                <ListItem>
                  <ListItemText primary="No API keys have been created yet." />
                </ListItem>
              )}
            </List>
          </Paper>
        </TabPanel>
      </Paper>
      
      {/* API Key Dialog */}
      <Dialog
        open={keyDialogOpen}
        onClose={() => setKeyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>API Key Generated</DialogTitle>
        <DialogContent>
          <DialogContentText paragraph>
            Your new API key has been generated. Please copy it now as it will not be shown again.
          </DialogContentText>
          
          <TextField
            value={generatedKey}
            fullWidth
            variant="outlined"
            InputProps={{
              readOnly: true,
              sx: { fontFamily: 'monospace' }
            }}
            margin="normal"
          />
          
          <DialogContentText sx={{ mt: 2, color: 'warning.main' }}>
            Important: Store this key securely. For security reasons, we don't store the complete key and can't display it again.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Email Template Dialog */}
      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Email Template: {selectedTemplate?.name}</DialogTitle>
        <DialogContent>
          <TextField
            label="Subject"
            value={templateSubject}
            onChange={(e) => setTemplateSubject(e.target.value)}
            fullWidth
            margin="normal"
          />
          
          <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
            Template Content
          </Typography>
          
          <TextField
            multiline
            rows={12}
            value={templateContent}
            onChange={(e) => setTemplateContent(e.target.value)}
            fullWidth
            variant="outlined"
            placeholder="Email HTML content"
          />
          
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Available Variables</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" component="div">
                <ul>
                  <li><code>{{userName}}</code> - User's name</li>
                  <li><code>{{userEmail}}</code> - User's email</li>
                  <li><code>{{companyName}}</code> - Company name</li>
                  <li><code>{{orderId}}</code> - Order ID (in order-related emails)</li>
                  <li><code>{{orderStatus}}</code> - Order status (in order-related emails)</li>
                  <li><code>{{loginLink}}</code> - Login link (in welcome emails)</li>
                  <li><code>{{resetLink}}</code> - Password reset link (in reset password emails)</li>
                </ul>
              </Typography>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveTemplate} 
            variant="contained" 
            color="primary"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save Template'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete API Key Confirmation Dialog */}
      <Dialog
        open={confirmDeleteDialog}
        onClose={() => setConfirmDeleteDialog(false)}
      >
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this API key? This action cannot be undone and any applications using this key will no longer be able to access the API.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteDialog(false)}>Cancel</Button>
          <Button onClick={confirmDeleteKey} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsPage; 