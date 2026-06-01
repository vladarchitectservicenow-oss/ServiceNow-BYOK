# ServiceNow-BYOK Dependency Report

**Product:** ServiceNow Bring Your Own Key (BYOK) Validator  
**Scope:** x_servicenow_byok  
**Analysis Date:** 2026-06-01  
**Analyzer Version:** 2.0

## Executive Summary

This report documents all dependencies for the ServiceNow-BYOK scoped application, including ServiceNow platform dependencies, external API dependencies, required plugins, and integration points. Understanding these dependencies is critical for upgrade planning, migration scenarios, and troubleshooting.

## ServiceNow Platform Dependencies

### Minimum Release Version

| Requirement | Value | Rationale |
|-------------|-------|-----------|
| Minimum Release | Australia (2026) | BYOK features require Generative AI Controller |
| Recommended Release | Australia Patch 3+ | Includes stability fixes for AI provider management |
| Incompatible Releases | Zurich and earlier | No native BYOK support |

### Required System Tables

| Table Name | Type | Purpose | Access Level |
|------------|------|---------|--------------|
| `x_servicenow_byok_config` | Custom | Provider configurations | Read/Write |
| `x_servicenow_byok_log` | Custom | Validation audit trail | Read/Write |
| `sys_credential` | Platform | Secure credential storage | Read (via API) |
| `sys_rest_message` | Platform | REST message definitions | Read |
| `sys_rest_message_fn` | Platform | REST function definitions | Read |
| `sys_job` | Platform | Scheduled job tracking | Read/Write |
| `sysevent_email_action` | Platform | Notification events | Write |
| `sys_scope` | Platform | Application scope metadata | Read |
| `sys_app` | Platform | Application metadata | Read |

### Required Plugins

| Plugin ID | Name | Criticality | Version |
|-----------|------|-------------|---------|
| `comedic_ai_controller` | Generative AI Controller | P0 - Required | Australia |
| `com.rest.api` | REST API | P0 - Required | All releases |
| `com.credentials` | Credentials | P0 - Required | All releases |
| `com.scheduled_jobs` | Scheduled Jobs | P1 - Recommended | All releases |
| `com.email_notifications` | Email Notifications | P1 - Recommended | All releases |
| `com.platform.analytics` | Platform Analytics | P2 - Optional | Australia |

### Required Roles

| Role Name | Purpose | Granted To |
|-----------|---------|------------|
| `x_servicenow_byok.admin` | Full administrative access | Platform admins, integration admins |
| `x_servicenow_byok.user` | Read-only access to configs and logs | Service owners, auditors |
| `x_servicenow_byok.api_user` | REST API access | External monitoring systems |

## External API Dependencies

### Azure OpenAI

| Attribute | Value |
|-----------|-------|
| Endpoint Format | `https://<resource>.openai.azure.com/openai/deployments/<deployment>/chat/completions?api-version=2024-02-15-preview` |
| Authentication | API Key (header: `api-key`) |
| Required Permissions | Cognitive Services OpenAI User |
| Rate Limits | Depends on Azure subscription tier |
| Timeout | 30 seconds recommended |
| Test Method | POST with empty messages array |

### AWS Bedrock

| Attribute | Value |
|-----------|-------|
| Endpoint Format | `https://bedrock.<region>.amazonaws.com/model/<model-id>/invoke` |
| Authentication | AWS SigV4 (IAM credentials) |
| Required Permissions | `bedrock:InvokeModel` |
| Rate Limits | Depends on AWS account limits |
| Timeout | 30 seconds recommended |
| Test Method | POST with minimal prompt |

### Google Vertex AI

| Attribute | Value |
|-----------|-------|
| Endpoint Format | `https://<region>-aiplatform.googleapis.com/v1/projects/<project>/locations/<location>/publishers/google/models/<model>:predict` |
| Authentication | OAuth 2.0 service account |
| Required Permissions | `aiplatform.prediction` |
| Rate Limits | Depends on GCP quota |
| Timeout | 30 seconds recommended |
| Test Method | POST with empty instances array |

### IBM watsonx

| Attribute | Value |
|-----------|-------|
| Endpoint Format | `https://<region>.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-09-01` |
| Authentication | IAM API Key |
| Required Permissions | Watson Machine Learning User |
| Rate Limits | Depends on IBM Cloud tier |
| Timeout | 30 seconds recommended |
| Test Method | POST with minimal input |

## Internal ServiceNow Dependencies

### Script Includes

| Name | Scope | Purpose |
|------|-------|---------|
| `BYOKValidator` | x_servicenow_byok | Main validation engine |
| `BYOKConfigLoader` | x_servicenow_byok | Configuration management |
| `BYOKLogger` | x_servicenow_byok | Audit logging utilities |
| `BYOKNotification` | x_servicenow_byok | Alert and notification handler |

### Business Rules

| Name | Table | When | Purpose |
|------|-------|------|---------|
| `BYOK Config - Validate on Insert` | x_servicenow_byok_config | Before Insert | Auto-validate new configurations |
| `BYOK Config - Update Timestamp` | x_servicenow_byok_config | After Update | Track last modified |
| `BYOK Log - Retention Policy` | x_servicenow_byok_log | Before Insert | Enforce 90-day retention |

### UI Policies

| Name | Table | Purpose |
|------|-------|---------|
| `BYOK Config - Required Fields` | x_servicenow_byok_config | Enforce mandatory fields on form |
| `BYOK Config - Read-only After Validation` | x_servicenow_byok_config | Prevent edits to validated configs |

### Client Scripts

| Name | Table | Type | Purpose |
|------|-------|------|---------|
| `BYOK Config - Provider Change` | x_servicenow_byok_config | onChange | Update endpoint template on provider change |
| `BYOK Config - Validate Button` | x_servicenow_byok_config | onLoad | Show/hide validate button based on status |

### REST Messages

| Name | Endpoint | Method | Purpose |
|------|----------|--------|---------|
| `BYOK - List Configs` | `/api/x_servicenow_byok/config` | GET | Retrieve all configurations |
| `BYOK - Validate Single` | `/api/x_servicenow_byok/validate/{id}` | POST | Trigger single validation |
| `BYOK - Validate All` | `/api/x_servicenow_byok/validate` | POST | Trigger bulk validation |
| `BYOK - Get Status` | `/api/x_servicenow_byok/status` | GET | Overall health status |
| `BYOK - Get Report` | `/api/x_servicenow_byok/report` | GET | Generate compliance report |

### Scheduled Jobs

| Name | Frequency | Script Include | Purpose |
|------|-----------|----------------|---------|
| `BYOK - Periodic Validation` | Every 6 hours | BYOKValidator | Automated validation cycle |

### Notifications

| Name | Event | Recipients | Condition |
|------|-------|------------|-----------|
| `BYOK - Validation Failed` | byok.validation.failed | BYOK Admins | Validation result = fail |
| `BYOK - Credential Expiring` | byok.credential.expiring | BYOK Admins | Days to expiry < 30 |

## Third-Party Library Dependencies

| Library | Version | Purpose | License |
|---------|---------|---------|---------|
| None | N/A | All code is native ServiceNow JavaScript | AGPL-3.0 |

## Upgrade Impact Analysis

### Australia → Next Release ( anticipated 2027)

| Component | Risk Level | Expected Changes | Mitigation |
|-----------|------------|------------------|------------|
| Generative AI Controller | Medium | New provider types may be added | Test validation logic against new providers |
| REST API Framework | Low | Backward compatible | No changes expected |
| Credentials Framework | Low | Security enhancements possible | Review ACL requirements |
| Scheduled Jobs | Low | Performance improvements | Monitor job execution time |

### Zurich → Australia Migration

| Component | Effort | Notes |
|-----------|--------|-------|
| Plugin Installation | 1 hour | Generative AI Controller required |
| Table Creation | 2 hours | 2 custom tables with indexes |
| Role Provisioning | 30 minutes | 3 new roles to assign |
| REST API Configuration | 1 hour | 5 endpoints to configure |
| Scheduled Job Setup | 30 minutes | 1 job to schedule |
| **Total Migration Effort** | **~5 hours** | Excludes testing time |

## Dependency Health Checks

### Pre-Deployment Checklist

- [ ] Generative AI Controller plugin active
- [ ] REST API plugin active
- [ ] Credentials plugin active
- [ ] Instance has outbound internet access
- [ ] Firewall allows HTTPS to Azure/AWS/Google/IBM endpoints
- [ ] Admin user has x_servicenow_byok.admin role
- [ ] Credential records exist for each provider

### Post-Deployment Verification

- [ ] All 2 custom tables created successfully
- [ ] All 3 roles visible in role list
- [ ] All 5 REST endpoints respond
- [ ] Scheduled job appears in scheduled job list
- [ ] Test validation against each provider type succeeds
- [ ] Notifications configured and testable

## Known Dependency Conflicts

| Conflict | Symptom | Resolution |
|----------|---------|------------|
| Missing Generative AI Controller | Tables fail to create, errors on config form | Install plugin before app deployment |
| Credentials plugin disabled | Cannot store API keys securely | Enable plugin or use alternative storage |
| Outbound firewall blocks | Validation timeouts, false failures | Whitelist AI provider endpoints |
| Role not assigned | Users cannot access application forms | Assign x_servicenow_byok.admin role |

## Dependency Monitoring

### Recommended Metrics

| Metric | Threshold | Alert Channel |
|--------|-----------|---------------|
| Validation failure rate | > 10% over 24h | Email to BYOK admins |
| Average validation time | > 5 seconds | Platform analytics dashboard |
| Credential expiry warnings | < 30 days | Email to security team |
| Scheduled job failures | Any failure | Instance health monitor |

## Conclusion

ServiceNow-BYOK has moderate external dependencies (4 AI provider APIs) and standard internal ServiceNow dependencies. The critical path is the Generative AI Controller plugin, which must be installed before deployment. All other dependencies are standard platform features available in Australia release and later.
