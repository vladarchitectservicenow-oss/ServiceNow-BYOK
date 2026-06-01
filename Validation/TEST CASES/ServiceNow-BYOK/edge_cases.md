# Edge Case Test Cases: ServiceNow-BYOK Validator

**Product:** ServiceNow Bring Your Own Key (BYOK) Validator  
**Scope:** x_servicenow_byok  
**Author:** Vladimir Kapustin  
**License:** AGPL-3.0  
**Version:** 2.0  
**Last Updated:** 2026-06-01

---

## Overview

This document defines edge case test scenarios that explore boundary conditions, unusual inputs, failure modes, and unexpected usage patterns. Edge cases often reveal bugs that standard testing misses.

**Edge Case Philosophy:** Test what users *could* do, not just what they *should* do. Assume users will find creative ways to break things.

---

## Edge Case Categories

| Category | Focus | Test Count | Discovery Rate |
|----------|-------|------------|----------------|
| Empty/Null Data | Missing inputs, blank fields | 4 | High |
| Boundary Values | Maximums, minimums, limits | 3 | Medium |
| Timing/Race | Concurrency, timeouts, sequences | 3 | Medium |
| Invalid Inputs | Malformed data, wrong types | 3 | High |
| Environmental | Missing deps, network issues | 3 | Medium |

---

## Test Cases

### EDGE-001: Empty Configuration Table

**Purpose:** Verify application handles zero configuration records gracefully.

**Scenario:** Fresh installation with no configurations created yet.

**Steps:**
1. Ensure `x_servicenow_byok_config` table has zero records
2. Call `GET /api/x_servicenow_byok/config`
3. Call `POST /api/x_servicenow_byok/validate` (validate-all)
4. Call `GET /api/x_servicenow_byok/status`
5. Check scheduled job execution

**Expected Results:**
- List endpoint returns empty array `[]`
- Validate-all completes immediately with "No configurations to validate"
- Status shows `total: 0, active: 0, failed: 0`
- Scheduled job completes without errors
- No errors in application logs

**Failure Indicators:**
- Null pointer exceptions
- Division by zero errors
- "undefined" in responses
- Scheduled job fails

**Automation Script:**
```javascript
function edge_001_empty_table() {
    var config = new GlideRecord('x_servicenow_byok_config');
    config.query();
    var count = config.getRowCount();
    if (count !== 0) return 'SKIP: Table not empty';
    
    var validator = new BYOKValidator();
    var result = validator.validateAll();
    
    if (result.message && result.message.indexOf('No configurations') > -1) {
        return 'PASS';
    }
    return 'FAIL: Unexpected result: ' + JSON.stringify(result);
}
```

**Pass Criteria:** Graceful handling with appropriate messages

**Severity if Failed:** Medium (affects fresh installations)

---

### EDGE-002: Null Credential Reference

**Purpose:** Verify behavior when configuration has null/empty credential reference.

**Scenario:** Configuration created but credential not assigned.

**Steps:**
1. Create configuration record
2. Leave `credential_ref` field empty/null
3. Run validation on this config
4. Check error handling

**Expected Results:**
- Validation fails with clear error: "Credential reference is required"
- Error logged with appropriate severity
- No attempt to access null credential
- Config status set to 'error'

**Failure Indicators:**
- Null pointer exception
- Generic "An error occurred" message
- Validation hangs indefinitely
- Credential access attempted on null

**Pass Criteria:** Clear error message, graceful failure

**Severity if Failed:** High (security and stability risk)

---

### EDGE-003: Malformed Endpoint URL

**Purpose:** Verify handling of invalid endpoint URL formats.

**Scenario:** Configuration with malformed or nonsensical endpoint URLs.

**Test URLs:**
- Empty string: `""`
- No protocol: `"api.openai.com/v1"`
- Invalid protocol: `"ftp://api.openai.com"`
- Typos in domain: `"htps://openai.azure.com"` (missing 't')
- Extremely long URL: 2000+ character string
- URL with injection: `"https://evil.com?redirect=//attacker.com"`

**Steps:**
1. Create config with each test URL
2. Run validation
3. Verify error handling

**Expected Results:**
- URL validation catches format errors before network call
- Clear error: "Invalid URL format: [reason]"
- No network calls to invalid URLs
- Config status set to 'error'

**Failure Indicators:**
- Application crashes on URL parsing
- Network calls to malformed URLs
- Unclear error messages
- URL injection vulnerabilities

**Pass Criteria:** All malformed URLs rejected with clear errors

**Severity if Failed:** Medium (usability and potential security)

---

### EDGE-004: Maximum Configurations (Scale Boundary)

**Purpose:** Verify behavior at maximum supported scale.

**Scenario:** Instance with maximum number of configurations.

**Steps:**
1. Create 100 configuration records (or documented maximum)
2. Run validate-all operation
3. Measure execution time
4. Verify all configs processed
5. Check memory usage

**Expected Results:**
- All 100 configs validated
- Execution completes within timeout (5 minutes)
- No memory exhaustion
- All results logged correctly
- No configs skipped

**Failure Indicators:**
- Timeout before completion
- Memory limit exceeded
- Some configs not processed
- Incomplete log entries
- Instance performance degradation

**Pass Criteria:** All configs processed within time limit

**Severity if Failed:** Medium (affects large customers)

---

### EDGE-005: Concurrent Validation Requests

**Purpose:** Verify race condition handling when multiple validations run simultaneously.

**Scenario:** Two users trigger validation on same config at same time.

**Steps:**
1. Create configuration record
2. Trigger validation via REST API (Thread 1)
3. Simultaneously trigger validation via UI button (Thread 2)
4. Compare results
5. Check for duplicate log entries

**Expected Results:**
- Both requests complete without error
- Only one validation actually executes (locking)
- OR both execute independently without conflict
- No duplicate log entries (or clearly marked as concurrent)
- Config status reflects final state accurately

**Failure Indicators:**
- Deadlock (both requests hang)
- Duplicate log entries with same timestamp
- Conflicting status updates
- Lost validation results
- Database constraint violations

**Automation Approach:**
```javascript
// Run in two parallel background scripts
function edge_005_concurrent_a() {
    var validator = new BYOKValidator();
    return validator.validateProvider('<config_sys_id>');
}

function edge_005_concurrent_b() {
    var validator = new BYOKValidator();
    return validator.validateProvider('<config_sys_id>');
}
// Execute both via parallel AJAX calls or scheduled jobs
```

**Pass Criteria:** No deadlocks, consistent final state

**Severity if Failed:** Medium (race conditions in production)

---

### EDGE-006: Validation During Config Update

**Purpose:** Verify behavior when configuration is modified during validation.

**Scenario:** User edits config while validation is running.

**Steps:**
1. Start validation on config (simulate slow provider with delay)
2. While validation running, update config fields
3. Save config changes
4. Wait for validation to complete
5. Check which values were used

**Expected Results:**
- Validation uses snapshot of config at start time
- OR validation detects change and aborts with "Config modified"
- No partial/corrupted state
- Clear indication of which config version was validated

**Failure Indicators:**
- Validation uses mixed old/new values
- Validation crashes on mid-flight changes
- No indication of config version used
- Corrupted log entries

**Pass Criteria:** Consistent behavior, clear versioning

**Severity if Failed:** Low (unlikely user behavior)

---

### EDGE-007: Missing Required Plugin

**Purpose:** Verify graceful degradation when required plugin is missing.

**Scenario:** Application installed but Generative AI Controller plugin not active.

**Steps:**
1. Deactivate `comedic_ai_controller` plugin (on test instance)
2. Attempt to access BYOK application
3. Try to create configuration
4. Try to run validation

**Expected Results:**
- Application shows clear warning: "Required plugin missing"
- Config form shows which fields depend on missing plugin
- Validation fails immediately with plugin error
- Helpful link to plugin installation instructions

**Failure Indicators:**
- Application crashes on load
- Generic errors without root cause
- No guidance on resolution
- Silent failures

**Automation Script:**
```javascript
function edge_007_missing_plugin() {
    var plugin = new GlideRecord('sys_plugin');
    plugin.addQuery('id', 'comedic_ai_controller');
    if (!plugin.query().next() || !plugin.active) {
        // Plugin missing - test error handling
        var validator = new BYOKValidator();
        try {
            var result = validator.validateAll();
            if (result.error && result.error.indexOf('plugin') > -1) {
                return 'PASS';
            }
            return 'FAIL: No plugin error reported';
        } catch (e) {
            return 'FAIL: Unhandled exception: ' + e.message;
        }
    }
    return 'SKIP: Plugin is active';
}
```

**Pass Criteria:** Clear error with resolution guidance

**Severity if Failed:** High (blocks installation)

---

### EDGE-008: Provider Timeout (Network Failure)

**Purpose:** Verify timeout handling for non-responsive providers.

**Scenario:** Configuration points to endpoint that never responds.

**Steps:**
1. Create config with endpoint that drops connections (e.g., `http://10.255.255.1`)
2. Run validation
3. Verify timeout occurs within configured limit
4. Check error message

**Expected Results:**
- Validation times out after 30 seconds (or configured limit)
- Clear error: "Request timeout after 30s"
- No hanging threads
- Other configs continue to validate
- Instance resources not exhausted

**Failure Indicators:**
- Validation hangs indefinitely
- Instance becomes unresponsive
- Other operations affected
- No timeout error logged

**Pass Criteria:** Graceful timeout with clear error

**Severity if Failed:** High (can affect instance stability)

---

### EDGE-009: Special Characters in Configuration

**Purpose:** Verify handling of unicode and special characters.

**Scenario:** Configuration names and values with special characters.

**Test Strings:**
- Unicode: `"测试配置"`, `"Тестовая конфигурация"`, `"🔧 BYOK Config"`
- SQL injection attempt: `"Config'; DROP TABLE x_servicenow_byok_config;--"`
- XSS attempt: `"<script>alert('xss')</script>"`
- HTML entities: `"Config &amp; Settings <test>"`
- Newlines: `"Config\nWith\nNewlines"`
- Extremely long: 1000+ character name

**Steps:**
1. Create configs with each test string as name
2. Verify record saves correctly
3. Run validation
4. Check logs and reports

**Expected Results:**
- All strings saved correctly
- Validation processes normally
- Logs display strings correctly
- No SQL injection executed
- No XSS vulnerabilities
- Reports render correctly

**Failure Indicators:**
- Data corruption on save
- SQL errors
- Script execution in UI
- Display garbling
- Truncation without warning

**Pass Criteria:** All special characters handled safely

**Severity if Failed:** High (security vulnerability)

---

### EDGE-010: Credential Expiry During Validation

**Purpose:** Verify behavior when credential expires mid-validation.

**Scenario:** Credential valid when validation starts, expires during API call.

**Steps:**
1. Create config with credential that will expire soon
2. Start validation
3. Manually expire/revoke credential during validation
4. Observe behavior

**Expected Results:**
- Validation fails with auth error (not timeout or generic)
- Error indicates credential issue
- Config status updated to reflect auth failure
- Suggestion to update credential

**Failure Indicators:**
- Timeout error (misleading)
- Generic "validation failed"
- No indication of credential issue
- Config status unchanged

**Pass Criteria:** Accurate error attribution

**Severity if Failed:** Medium (troubleshooting difficulty)

---

### EDGE-011: Instance in Read-Only Mode

**Purpose:** Verify behavior when instance is in read-only mode (maintenance).

**Scenario:** Validation triggered during instance maintenance window.

**Steps:**
1. Put instance in read-only mode (if possible on test instance)
2. Attempt to create config
3. Attempt to run validation
4. Attempt to write logs

**Expected Results:**
- Clear message: "Instance is in read-only mode"
- Validation skipped or queued
- No errors from failed writes
- Graceful degradation

**Failure Indicators:**
- Write errors thrown
- Application crashes
- No indication of read-only state
- Data corruption attempts

**Pass Criteria:** Graceful handling of read-only state

**Severity if Failed:** Low (rare scenario)

---

### EDGE-012: Log Table Full (Storage Limit)

**Purpose:** Verify behavior when log table approaches storage limits.

**Scenario:** Log table has millions of records (simulated).

**Steps:**
1. Insert large number of log records (or set retention very high)
2. Run new validation
3. Verify log write succeeds or fails gracefully
4. Check for cleanup mechanisms

**Expected Results:**
- Either: Log write succeeds (table handles scale)
- Or: Clear error "Log storage full, contact admin"
- Retention policy kicks in automatically
- Validation still completes (log failure non-blocking)

**Failure Indicators:**
- Validation fails due to log write failure
- No error message
- Instance performance severely degraded
- Silent log loss

**Pass Criteria:** Validation completes, log issue reported separately

**Severity if Failed:** Medium (operational issue)

---

## Edge Case Test Schedule

| Priority | Tests | Frequency | Owner |
|----------|-------|-----------|-------|
| P0 (Security/Stability) | EDGE-002, EDGE-007, EDGE-008, EDGE-009 | Every deployment | QA Lead |
| P1 (Functional) | EDGE-001, EDGE-003, EDGE-005, EDGE-010 | Weekly | QA Engineer |
| P2 (Scale/Performance) | EDGE-004, EDGE-012 | Monthly | Performance Team |
| P3 (Rare Scenarios) | EDGE-006, EDGE-011 | Quarterly | QA Lead |

---

## Edge Case Discovery Process

**New edge cases discovered from:**
- Production incident post-mortems
- Customer support tickets
- Security audit findings
- Penetration testing results
- User behavior analytics

**Add new edge case when:**
- Bug is found in production
- Customer asks "what if..."
- Security team identifies vulnerability
- Performance issue discovered at scale

---

## Edge Case Results Log

| Date | Test | Result | Notes |
|------|------|--------|-------|
| 2026-06-01 | All | Baseline | Initial test creation |

---

## Maintenance

**Review frequency:** Quarterly

**Retirement criteria:** Edge case no longer possible due to architectural changes
