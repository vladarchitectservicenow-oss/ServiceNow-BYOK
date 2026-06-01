# ServiceNow-BYOK Risk Report

**Product:** ServiceNow Bring Your Own Key (BYOK) Validator  
**Scope:** x_servicenow_byok  
**Analysis Date:** 2026-06-01  
**Risk Assessment Version:** 2.0

## Executive Summary

This risk report identifies potential failure modes, security vulnerabilities, operational risks, and mitigation strategies for the ServiceNow-BYOK application. Risks are categorized by severity (P0-P3) and include specific remediation actions.

## Risk Matrix

| Risk ID | Category | Severity | Likelihood | Impact | Risk Score |
|---------|----------|----------|------------|--------|------------|
| R-001 | External API | P0 | Medium | Critical | 8.0 |
| R-002 | Credential Security | P0 | Low | Critical | 6.0 |
| R-003 | Plugin Dependency | P0 | Low | Critical | 6.0 |
| R-004 | Validation Logic | P1 | Medium | High | 6.0 |
| R-005 | Rate Limiting | P1 | High | Medium | 6.0 |
| R-006 | Timeout Handling | P1 | Medium | High | 6.0 |
| R-007 | Data Retention | P2 | Medium | Medium | 4.0 |
| R-008 | ACL Configuration | P1 | Low | High | 4.5 |
| R-009 | Notification Failures | P2 | Medium | Medium | 4.0 |
| R-010 | Upgrade Compatibility | P2 | Low | Medium | 3.0 |
| R-011 | Performance at Scale | P2 | Medium | Medium | 4.0 |
| R-012 | Cross-Scope Access | P1 | Low | High | 4.5 |

---

## P0 Critical Risks

### R-001: External API Unavailability

**Description:** All four supported AI providers (Azure OpenAI, AWS Bedrock, Google Vertex AI, IBM watsonx) are external services. If any provider experiences downtime, validation will fail even when ServiceNow configuration is correct.

**Impact:**
- False positive validation failures
- Administrators may incorrectly modify working configurations
- Loss of confidence in validation system
- Potential production impact if flows depend on validation status

**Likelihood:** Medium (cloud providers typically have 99.9% uptime, but outages occur)

**Detection:**
- Monitor validation failure rate across all providers
- Check for simultaneous failures across multiple configurations
- Review provider status pages

**Mitigation:**
1. Implement retry logic with exponential backoff (3 attempts, 2s/4s/8s delays)
2. Add provider status caching (cache failures for 5 minutes to avoid thundering herd)
3. Include provider status indicator in validation results
4. Document expected failure modes in runbook
5. Add `provider_status` field to config table showing last known provider health

**Residual Risk:** Low (after mitigation)

---

### R-002: Credential Exposure

**Description:** API keys for AI providers are high-value targets. If credentials are exposed through logs, error messages, or misconfigured ACLs, attackers could gain unauthorized access to AI services.

**Impact:**
- Unauthorized AI API usage (financial loss)
- Data exfiltration through AI APIs
- Compliance violations (SOC2, GDPR, HIPAA)
- Reputational damage

**Likelihood:** Low (ServiceNow Credentials table is secure by default)

**Detection:**
- Audit credential access logs
- Monitor for unusual API usage patterns from providers
- Regular ACL configuration reviews

**Mitigation:**
1. NEVER store raw API keys in custom tables (use sys_credential reference only)
2. Restrict x_servicenow_byok_config table access to x_servicenow_byok.admin role only
3. Mask credential values in all UI forms and list views
4. Exclude credential fields from all REST API responses
5. Add credential access logging (who accessed which credential and when)
6. Implement credential rotation reminders (90-day expiry warnings)
7. Use GlideEncrypter for any additional sensitive field storage

**Residual Risk:** Very Low (after mitigation)

---

### R-003: Missing Generative AI Controller Plugin

**Description:** The application requires the Generative AI Controller plugin (`comedic_ai_controller`) which is only available in Australia release and later. If deployed to an instance without this plugin, the application will fail to function.

**Impact:**
- Application installation fails
- Config forms reference non-existent tables/fields
- Validation engine cannot access required APIs
- Complete product non-functionality

**Likelihood:** Low (deployment checklist should catch this)

**Detection:**
- Pre-deployment plugin check script
- Application load-time plugin verification
- Health check endpoint that validates plugin presence

**Mitigation:**
1. Add plugin check to installation wizard (block installation if missing)
2. Include plugin requirement in README and installation guide
3. Add runtime plugin verification in application onLoad
4. Create health check REST endpoint that returns plugin status
5. Provide clear error message with plugin installation instructions

**Residual Risk:** Very Low (after mitigation)

---

## P1 High Risks

### R-004: Incomplete Validation Logic

**Description:** Validation logic may not cover all edge cases for each provider type, leading to false positives (reporting success when configuration is broken) or false negatives (reporting failure when configuration works).

**Impact:**
- Misleading validation results
- Production failures despite "passing" validation
- Wasted troubleshooting time on false failures

**Likelihood:** Medium (complex API interactions)

**Detection:**
- Compare validation results against actual flow execution
- Monitor for patterns of validation pass followed by runtime failure
- Regular test suite expansion

**Mitigation:**
1. Implement comprehensive test suite covering all provider types
2. Add validation confidence scoring (not just pass/fail)
3. Include multiple test scenarios per provider (auth, endpoint, permissions)
4. Log detailed validation steps for troubleshooting
5. Add "test in production" mode that runs actual AI request
6. Create validation scenario library from real customer configurations

**Residual Risk:** Medium (requires ongoing maintenance)

---

### R-005: Provider Rate Limiting

**Description:** AI providers enforce rate limits. Running validation too frequently (especially validate-all operations) can trigger rate limiting, causing validation failures and potentially blocking production AI usage.

**Impact:**
- Validation failures due to rate limits, not configuration issues
- Potential impact on production AI flows sharing same credentials
- Temporary account suspension in extreme cases

**Likelihood:** High (rate limits vary by provider and subscription tier)

**Detection:**
- Monitor HTTP 429 responses from providers
- Track validation frequency per credential
- Alert on rate limit warnings in provider responses

**Mitigation:**
1. Implement rate limit awareness in validation engine
2. Add configurable validation intervals per provider
3. Respect Retry-After headers from provider responses
4. Add rate limit status to validation results
5. Implement validation queuing to spread load
6. Document recommended validation frequency per provider tier
7. Add "validate now" override for emergency use (with warning)

**Residual Risk:** Medium (depends on customer usage patterns)

---

### R-006: Timeout Handling

**Description:** External API calls can timeout due to network issues, provider slowness, or large payloads. Improper timeout handling can leave configurations in unknown state or cause application hangs.

**Impact:**
- Incomplete validation results
- Scheduled job timeouts affecting other jobs
- Poor user experience with long wait times
- Potential resource exhaustion

**Likelihood:** Medium (network variability)

**Detection:**
- Monitor validation duration distribution
- Alert on validations exceeding threshold
- Track timeout frequency per provider

**Mitigation:**
1. Set explicit timeout (30 seconds) for all provider API calls
2. Implement graceful timeout handling with clear error messages
3. Add timeout configuration via system properties
4. Log timeout events separately from validation failures
5. Implement async validation for long-running scenarios
6. Add timeout budget tracking in scheduled job

**Residual Risk:** Low (after mitigation)

---

### R-008: ACL Misconfiguration

**Description:** Incorrect Access Control Rules could expose sensitive configuration data or allow unauthorized users to modify provider configurations.

**Impact:**
- Credential exposure
- Unauthorized configuration changes
- Compliance violations

**Likelihood:** Low (ACLs are well-documented)

**Detection:**
- Regular ACL audits
- Monitor for unauthorized access attempts
- Include ACL check in health scan

**Mitigation:**
1. Document required ACLs in installation guide
2. Include ACL verification in post-install checklist
3. Add ACL health check to validation engine
4. Create automated ACL test suite
5. Use role-based ACLs (not user-specific)

**Residual Risk:** Low (after mitigation)

---

### R-012: Cross-Scope Access Issues

**Description:** The application may need to access tables or APIs in other scopes (Credentials, Scheduled Jobs). Missing cross-scope privileges cause silent failures where queries return empty results.

**Impact:**
- Validation appears to succeed but uses wrong data
- Credential retrieval fails silently
- Scheduled jobs don't execute

**Likelihood:** Low (standard ServiceNow pattern)

**Detection:**
- Test all cross-scope operations during QA
- Include cross-scope checks in test suite
- Monitor for empty result sets

**Mitigation:**
1. Document all cross-scope dependencies
2. Include cross-scope grants in update set
3. Add cross-scope access verification to health check
4. Test in clean PDI without existing grants

**Residual Risk:** Low (after mitigation)

---

## P2 Medium Risks

### R-007: Log Data Retention

**Description:** Validation logs accumulate over time. Without proper retention policy, the log table can grow large, impacting performance and storage costs.

**Impact:**
- Database bloat
- Slower query performance
- Increased storage costs

**Likelihood:** Medium (automatic without intervention)

**Detection:**
- Monitor log table row count
- Track table size growth rate
- Alert when retention threshold approached

**Mitigation:**
1. Implement automatic 90-day retention policy via business rule
2. Add log archival option for compliance requirements
3. Provide log cleanup utility script
4. Document retention configuration in admin guide
5. Add table size to health check dashboard

**Residual Risk:** Low (after mitigation)

---

### R-009: Notification Delivery Failures

**Description:** Email notifications for validation failures may not be delivered due to email configuration issues, recipient changes, or notification system problems.

**Impact:**
- Administrators unaware of critical failures
- Extended downtime before detection
- Compliance gaps

**Likelihood:** Medium (email systems are complex)

**Detection:**
- Monitor notification queue
- Test notifications periodically
- Track notification delivery rate

**Mitigation:**
1. Implement notification health check (weekly test email)
2. Add fallback notification channel (in-app alert)
3. Document notification configuration requirements
4. Include notification test in post-install checklist
5. Add notification delivery logging

**Residual Risk:** Medium (external email system dependency)

---

### R-010: Upgrade Compatibility

**Description:** Future ServiceNow releases may change Generative AI Controller APIs, credential storage, or REST framework in ways that break application functionality.

**Impact:**
- Application breaks after upgrade
- Validation produces incorrect results
- Migration effort required

**Likelihood:** Low (ServiceNow maintains backward compatibility)

**Detection:**
- Review release notes for AI-related changes
- Test in sub-production before upgrade
- Monitor for deprecation warnings

**Mitigation:**
1. Follow ServiceNow deprecation policies
2. Test against preview releases when available
3. Maintain upgrade runbook with rollback steps
4. Subscribe to ServiceNow release announcements
5. Build upgrade testing into release cycle

**Residual Risk:** Low (after mitigation)

---

### R-011: Performance at Scale

**Description:** Instances with many provider configurations (50+) may experience slow validation cycles, especially when running validate-all operations.

**Impact:**
- Long validation durations
- Scheduled job overlaps
- Poor user experience

**Likelihood:** Medium (depends on customer size)

**Detection:**
- Monitor validation duration vs config count
- Track scheduled job execution time
- Alert on performance degradation

**Mitigation:**
1. Implement parallel validation for multiple providers
2. Add pagination for large config lists
3. Provide incremental validation (validate by provider type)
4. Document performance characteristics in admin guide
5. Add performance benchmarks to test suite

**Residual Risk:** Medium (depends on customer scale)

---

## P3 Low Risks

### R-013: UI Localization Gaps

**Description:** Application UI is English-only. Non-English instances may have inconsistent user experience.

**Impact:**
- Confusion for non-English users
- Support ticket volume
- Limited market appeal

**Likelihood:** High (no localization implemented)

**Mitigation:**
1. Document English-only limitation
2. Add localization to roadmap
3. Use translation-friendly field labels

**Residual Risk:** Low (documented limitation)

---

## Risk Acceptance

| Risk ID | Accepted By | Acceptance Date | Review Date | Notes |
|---------|-------------|-----------------|-------------|-------|
| R-005 | Product Owner | 2026-06-01 | 2026-09-01 | Rate limiting is provider-dependent |
| R-009 | Product Owner | 2026-06-01 | 2026-09-01 | Email delivery outside app control |
| R-011 | Product Owner | 2026-06-01 | 2026-09-01 | Scale limits documented |

## Conclusion

ServiceNow-BYOK has 3 P0 critical risks (all mitigated to Low residual), 5 P1 high risks, and 4 P2 medium risks. The most significant residual risks are external dependencies (provider availability, rate limiting, email delivery) which cannot be fully eliminated but are documented and monitored.

**Overall Risk Assessment:** ACCEPTABLE with documented mitigations.
