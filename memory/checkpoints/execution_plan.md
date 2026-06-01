# ServiceNow-BYOK Execution Plan

**Product:** ServiceNow Bring Your Own Key (BYOK) Validator  
**Scope:** x_servicenow_byok  
**Document Version:** 2.0  
**Last Updated:** 2026-06-01

## Executive Summary

This execution plan provides step-by-step instructions for deploying, configuring, testing, and maintaining the ServiceNow-BYOK application. It covers installation, configuration, validation, and ongoing operations.

---

## Phase 1: Pre-Installation

### 1.1 Prerequisites Verification

**Instance Requirements:**
- [ ] ServiceNow Australia release (2026) or later
- [ ] Admin access to instance
- [ ] Outbound internet access enabled
- [ ] Firewall allows HTTPS to:
  - `*.openai.azure.com`
  - `*.amazonaws.com` (Bedrock endpoints)
  - `*.googleapis.com` (Vertex AI endpoints)
  - `*.cloud.ibm.com` (watsonx endpoints)

**Plugin Requirements:**
- [ ] Generative AI Controller (`comedic_ai_controller`) - **REQUIRED**
- [ ] REST API (`com.rest.api`) - **REQUIRED**
- [ ] Credentials (`com.credentials`) - **REQUIRED**
- [ ] Scheduled Jobs (`com.scheduled_jobs`) - Recommended
- [ ] Email Notifications (`com.email_notifications`) - Recommended

**Verification Script:**
```javascript
// Run in Background Scripts (sys.scripts.do)
var plugins = ['comedic_ai_controller', 'com.rest.api', 'com.credentials'];
var missing = [];
plugins.forEach(function(pid) {
    var gr = new GlideRecord('sys_plugin');
    gr.addQuery('id', pid);
    if (!gr.query().next()) {
        missing.push(pid);
    }
});
if (missing.length > 0) {
    gs.error('Missing plugins: ' + missing.join(', '));
} else {
    gs.info('All required plugins are active');
}
```

### 1.2 Credential Preparation

Before installation, prepare credentials for each AI provider you plan to configure:

| Provider | Credential Type | Preparation Steps |
|----------|-----------------|-------------------|
| Azure OpenAI | API Key | 1. Create Azure OpenAI resource<br>2. Deploy a model<br>3. Copy key from Keys & Endpoint page |
| AWS Bedrock | IAM Credentials | 1. Create IAM user with Bedrock access<br>2. Generate access key and secret key<br>3. Note your AWS region |
| Google Vertex AI | Service Account | 1. Create GCP project<br>2. Enable Vertex AI API<br>3. Create service account<br>4. Download JSON key file |
| IBM watsonx | IAM API Key | 1. Create IBM Cloud account<br>2. Create watsonx resource<br>3. Generate API key from IAM |

**Store credentials in ServiceNow:**
1. Navigate to **Credentials** (`sys_credential.list`)
2. Click **New**
3. Enter credential details (type: Basic Auth or API Key)
4. Set ACL to restrict access
5. Note the sys_id for later use

---

## Phase 2: Installation

### 2.1 Install Application

**Method A: Update Set (Recommended)**
1. Navigate to **Update Sets** (`sys_update_set.list`)
2. Select or create update set: `ServiceNow-BYOK Installation`
3. Import update set XML from release package
4. Preview and resolve any conflicts
5. Commit update set

**Method B: Scoped Application Import**
1. Navigate to **Applications** (`sys_app.list`)
2. Click **Import Application**
3. Upload application ZIP file
4. Select scope: `x_servicenow_byok`
5. Click **Import**
6. Wait for import completion (2-5 minutes)

### 2.2 Post-Installation Verification

**Run verification checklist:**
```javascript
// Background Script verification
var checks = {
    tables: ['x_servicenow_byok_config', 'x_servicenow_byok_log'],
    roles: ['x_servicenow_byok.admin', 'x_servicenow_byok.user', 'x_servicenow_byok.api_user'],
    scriptIncludes: ['BYOKValidator', 'BYOKConfigLoader', 'BYOKLogger', 'BYOKNotification']
};

var results = {};
checks.tables.forEach(function(table) {
    var gr = new GlideRecord(table);
    results[table] = gr.isValid() ? 'OK' : 'MISSING';
});
checks.roles.forEach(function(role) {
    var gr = new GlideRecord('sys_user_role');
    gr.addQuery('name', role);
    results[role] = gr.query().next() ? 'OK' : 'MISSING';
});
checks.scriptIncludes.forEach(function(si) {
    var gr = new GlideRecord('sys_script_include');
    gr.addQuery('name', si);
    gr.addQuery('scope', 'x_servicenow_byok');
    results[si] = gr.query().next() ? 'OK' : 'MISSING';
});

gs.info(JSON.stringify(results, null, 2));
```

**Expected output:** All items should show 'OK'

### 2.3 Configure Roles

**Assign roles to administrators:**
1. Navigate to **Users** (`sys_user.list`)
2. Open admin user record
3. Go to **Roles** related list
4. Add roles:
   - `x_servicenow_byok.admin` - For primary administrators
   - `x_servicenow_byok.user` - For viewers/auditors
5. Save

---

## Phase 3: Configuration

### 3.1 Create Provider Configuration

**For each AI provider:**

1. Navigate to **BYOK Configurations** (`x_servicenow_byok_config.list`)
2. Click **New**
3. Fill in the form:

| Field | Value | Example |
|-------|-------|---------|
| Provider Type | Select provider | `Azure OpenAI` |
| Configuration Name | Descriptive name | `Production Azure OpenAI` |
| Endpoint URL | Provider endpoint | `https://myresource.openai.azure.com/...` |
| Credential | Select from credentials | `Azure-Prod-Key` |
| Active | Checked | ✓ |
| Validation Interval | Hours between auto-validation | `6` |

4. Click **Submit**
5. Click **Validate Now** to test immediately

### 3.2 Configure Scheduled Validation

**Enable automated validation:**
1. Navigate to **Scheduled Jobs** (`sys_scheduler.list`)
2. Find: `BYOK - Periodic Validation`
3. Open the record
4. Configure:
   - **Run**: Every 6 hours (or custom schedule)
   - **Active**: true
   - **Run as**: System user with admin role
5. Save

### 3.3 Configure Notifications

**Set up failure alerts:**
1. Navigate to **Email Notifications** (`sysevent_email_action.list`)
2. Find: `BYOK - Validation Failed`
3. Open and configure:
   - **Recipients**: BYOK admin distribution list
   - **When to send**: When validation result changes to 'fail'
   - **Subject**: `[BYOK ALERT] Validation Failed - {config_name}`
4. Test notification using **Send Test Email** button

---

## Phase 4: Testing

### 4.1 Functional Testing

**Test each provider type:**

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Azure OpenAI Validation | Create config, click Validate Now | Validation passes, log entry created |
| AWS Bedrock Validation | Create config, click Validate Now | Validation passes, log entry created |
| Google Vertex AI Validation | Create config, click Validate Now | Validation passes, log entry created |
| IBM watsonx Validation | Create config, click Validate Now | Validation passes, log entry created |
| Invalid Credential Test | Use wrong API key, validate | Validation fails with auth error |
| Invalid Endpoint Test | Use wrong URL, validate | Validation fails with connection error |
| Timeout Test | Use non-responsive endpoint | Validation times out gracefully |

### 4.2 REST API Testing

**Test all endpoints:**

```bash
# List all configurations
curl -X GET "https://<instance>.service-now.com/api/x_servicenow_byok/config" \
  -H "Authorization: Basic <base64_credentials>"

# Validate single configuration
curl -X POST "https://<instance>.service-now.com/api/x_servicenow_byok/validate/{sys_id}" \
  -H "Authorization: Basic <base64_credentials>"

# Get overall status
curl -X GET "https://<instance>.service-now.com/api/x_servicenow_byok/status" \
  -H "Authorization: Basic <base64_credentials>"

# Generate report
curl -X GET "https://<instance>.service-now.com/api/x_servicenow_byok/report" \
  -H "Authorization: Basic <base64_credentials>"
```

### 4.3 Performance Testing

**Load test validation:**
1. Create 10 test configurations (mix of provider types)
2. Run validate-all operation
3. Measure total execution time
4. Expected: < 30 seconds for 10 configurations
5. Monitor instance CPU during test

---

## Phase 5: Go-Live

### 5.1 Production Deployment Checklist

- [ ] All prerequisite plugins installed
- [ ] Application installed and verified
- [ ] Roles assigned to administrators
- [ ] All production provider configurations created
- [ ] Scheduled validation enabled
- [ ] Notifications configured and tested
- [ ] Runbook documented and accessible
- [ ] Support team trained on application
- [ ] Backup/rollback procedure documented

### 5.2 Go-Live Validation

**Immediate post-deployment checks:**
1. Verify all configurations show 'active' status
2. Run manual validation on all configs
3. Confirm logs are being created
4. Test one notification delivery
5. Verify scheduled job is queued

---

## Phase 6: Operations

### 6.1 Daily Operations

| Task | Frequency | Owner |
|------|-----------|-------|
| Review validation failures | Daily | BYOK Admin |
| Check scheduled job status | Daily | Platform Admin |
| Monitor notification queue | Daily | Platform Admin |

### 6.2 Weekly Operations

| Task | Frequency | Owner |
|------|-----------|-------|
| Review validation trends | Weekly | BYOK Admin |
| Check log table size | Weekly | Platform Admin |
| Verify credential expiry dates | Weekly | Security Team |

### 6.3 Monthly Operations

| Task | Frequency | Owner |
|------|-----------|-------|
| Full validation report review | Monthly | Platform Owner |
| ACL audit | Monthly | Security Team |
| Performance benchmark | Monthly | Platform Admin |
| Update documentation | Monthly | BYOK Admin |

---

## Phase 7: Troubleshooting

### 7.1 Common Issues

| Issue | Symptom | Resolution |
|-------|---------|------------|
| Validation fails immediately | Error: "Plugin not found" | Install Generative AI Controller plugin |
| Validation times out | Error: "Timeout after 30s" | Check network connectivity, verify endpoint URL |
| No notifications received | Alerts not arriving | Check email configuration, test notification |
| Config form shows blank | Form not loading | Clear browser cache, verify ACL access |
| Scheduled job not running | Job status: Ready | Check job active flag, verify run-as user |

### 7.2 Diagnostic Commands

```javascript
// Check validation history for a config
var configSysId = '<config_sys_id>';
var log = new GlideRecord('x_servicenow_byok_log');
log.addQuery('config_id', configSysId);
log.orderByDesc('validation_timestamp');
log.setLimit(10);
log.query();
while (log.next()) {
    gs.info(log.validation_timestamp + ': ' + log.result + ' - ' + log.error_message);
}

// Check scheduled job status
var job = new GlideRecord('sys_scheduler');
job.addQuery('name', 'BYOK - Periodic Validation');
if (job.query().next()) {
    gs.info('Job active: ' + job.active);
    gs.info('Last run: ' + job.last_run);
    gs.info('Next run: ' + job.next_action);
}

// Check credential reference
var config = new GlideRecord('x_servicenow_byok_config');
if (config.get('<config_sys_id>')) {
    gs.info('Credential sys_id: ' + config.credential_ref);
}
```

---

## Phase 8: Maintenance

### 8.1 Upgrade Procedure

**When new version available:**
1. Review release notes for breaking changes
2. Test upgrade in sub-production instance
3. Backup current configuration (export configs to CSV)
4. Install new version via update set
5. Run post-upgrade verification script
6. Validate all configurations
7. Monitor for 24 hours before declaring success

### 8.2 Backup Procedure

**Backup configurations:**
1. Navigate to **BYOK Configurations**
2. Right-click header → **Export** → CSV
3. Save to secure location
4. Repeat for **BYOK Logs** (if retention allows)

**Restore configurations:**
1. Navigate to **BYOK Configurations**
2. Right-click header → **Import**
3. Upload CSV file
4. Verify imported records

### 8.3 Decommission Procedure

**To remove application:**
1. Export all configurations for archive
2. Disable scheduled job
3. Delete all configuration records
4. Delete all log records (or archive first)
5. Remove application via **Applications** module
6. Remove custom roles from users
7. Delete update set (if not needed for audit)

---

## Appendix A: Configuration Templates

### Azure OpenAI Template
```
Provider Type: Azure OpenAI
Endpoint: https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2024-02-15-preview
Credential: Azure-<environment>-Key
Validation Interval: 6 hours
```

### AWS Bedrock Template
```
Provider Type: AWS Bedrock
Endpoint: https://bedrock.<region>.amazonaws.com/model/<model-id>/invoke
Credential: AWS-<environment>-Credentials
Validation Interval: 6 hours
```

### Google Vertex AI Template
```
Provider Type: Google Vertex AI
Endpoint: https://<region>-aiplatform.googleapis.com/v1/projects/<project>/locations/<location>/publishers/google/models/<model>:predict
Credential: GCP-<environment>-ServiceAccount
Validation Interval: 6 hours
```

### IBM watsonx Template
```
Provider Type: IBM watsonx
Endpoint: https://<region>.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-09-01
Credential: IBM-<environment>-APIKey
Validation Interval: 6 hours
```

---

## Appendix B: Contact Information

| Role | Contact | Escalation |
|------|---------|------------|
| BYOK Admin | byok-admin@company.com | Platform Owner |
| Platform Admin | platform-admin@company.com | IT Director |
| Security Team | security@company.com | CISO |
| Vendor Support | servicenow-support@vendor.com | Account Manager |
