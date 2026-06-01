# Regression Test Cases: ServiceNow-BYOK Validator

**Product:** ServiceNow Bring Your Own Key (BYOK) Validator  
**Scope:** x_servicenow_byok  
**Author:** Vladimir Kapustin  
**License:** AGPL-3.0  
**Version:** 2.0  
**Last Updated:** 2026-06-01

---

## Overview

This document defines regression test cases to ensure that existing functionality continues to work correctly after code changes, configuration updates, or platform upgrades. Regression tests focus on stability, consistency, and backward compatibility.

**Regression Testing Philosophy:** Every bug fix and feature addition should add at least one regression test case. Run regression suite before every deployment.

---

## Regression Test Categories

| Category | Focus Area | Test Count | Priority |
|----------|------------|------------|----------|
| Data Integrity | Configuration persistence, log accuracy | 4 | P0 |
| API Stability | REST endpoint consistency | 3 | P0 |
| Security | ACL enforcement, credential protection | 3 | P0 |
| Performance | Execution time, resource usage | 2 | P1 |
| Integration | Plugin dependencies, cross-scope access | 2 | P1 |

---

## Test Cases

### REG-001: Idempotent Execution

**Purpose:** Verify that running validation multiple times produces consistent results.

**Precondition:** At least one active BYOK configuration exists.

**Steps:**
1. Record current validation result for config `TEST-Config-1`
2. Run validation on same config
3. Run validation again (third time)
4. Compare all three results

**Expected Results:**
- All three runs produce identical `validation_result` field values
- Log entries show consistent timestamps and results
- No duplicate log entries created
- Config `last_validated` timestamp updates each run

**Failure Indicators:**
- Different validation results across runs
- Missing or duplicate log entries
- Timestamp not updating

**Automation Script:**
```javascript
function reg_001_idempotent_execution() {
    var config = new GlideRecord('x_servicenow_byok_config');
    config.addQuery('name', 'TEST-Config-1');
    if (!config.query().next()) return 'SKIP: No test config';
    
    var results = [];
    for (var i = 0; i < 3; i++) {
        var validator = new BYOKValidator();
        var result = validator.validateProvider(config.getUniqueValue());
        results.push(result.status);
    }
    
    if (results[0] === results[1] && results[1] === results[2]) {
        return 'PASS';
    }
    return 'FAIL: Inconsistent results: ' + results.join(', ');
}
```

**Pass Criteria:** All 3 runs return identical status

**Historical Failures:** None recorded

---

### REG-002: Report Format Consistency

**Purpose:** Verify that compliance reports maintain consistent structure across runs.

**Precondition:** At least 2 BYOK configurations exist with validation history.

**Steps:**
1. Generate compliance report (GET /api/x_servicenow_byok/report)
2. Store report structure (keys, nested objects)
3. Wait 1 hour (or after next scheduled validation)
4. Generate report again
5. Compare structure (not values)

**Expected Results:**
- Same top-level keys present
- Same nested object structure
- Same data types for each field
- Array ordering consistent

**Failure Indicators:**
- Missing keys in second report
- New unexpected keys
- Type changes (string → number, etc.)
- Array order changes without data changes

**Pass Criteria:** Structure match ≥ 100%

**Historical Failures:** None recorded

---

### REG-003: Role Assignment Idempotency

**Purpose:** Verify that assigning roles multiple times doesn't create duplicates or errors.

**Precondition:** Test user exists without BYOK roles.

**Steps:**
1. Assign `x_servicenow_byok.admin` role to test user
2. Assign same role again (duplicate attempt)
3. Assign `x_servicenow_byok.user` role
4. Query user's roles
5. Remove all BYOK roles
6. Repeat steps 1-4

**Expected Results:**
- No duplicate role assignments
- No errors on duplicate assignment attempt
- Role count consistent across cycles
- User can access application after assignment

**Failure Indicators:**
- Duplicate role records in sys_user_has_role
- Error messages on second assignment
- Role count increases unexpectedly
- Access denied after assignment

**Automation Script:**
```javascript
function reg_003_role_idempotency() {
    var user = new GlideRecord('sys_user');
    user.addQuery('user_name', 'test.byok.user');
    if (!user.query().next()) return 'SKIP: No test user';
    
    var role = new GlideRecord('sys_user_role');
    role.addQuery('name', 'x_servicenow_byok.admin');
    if (!role.query().next()) return 'FAIL: Role missing';
    
    // Try to assign twice
    var ur1 = new GlideRecord('sys_user_has_role');
    ur1.initialize();
    ur1.user = user.getUniqueValue();
    ur1.role = role.getUniqueValue();
    var id1 = ur1.insert();
    
    var ur2 = new GlideRecord('sys_user_has_role');
    ur2.initialize();
    ur2.user = user.getUniqueValue();
    ur2.role = role.getUniqueValue();
    var id2 = ur2.insert();
    
    // Check for duplicates
    var check = new GlideRecord('sys_user_has_role');
    check.addQuery('user', user.getUniqueValue());
    check.addQuery('role', role.getUniqueValue());
    var count = 0;
    check.query();
    while (check.next()) count++;
    
    if (count === 1) return 'PASS';
    return 'FAIL: Found ' + count + ' duplicate role assignments';
}
```

**Pass Criteria:** Exactly 1 role assignment per unique user+role combination

**Historical Failures:** None recorded

---

### REG-004: Configuration Persistence

**Purpose:** Verify that configurations survive instance restart and cache clears.

**Precondition:** At least one BYOK configuration exists.

**Steps:**
1. Record configuration details (sys_id, field values)
2. Clear server cache (`gs.flushCache()`)
3. Read configuration again
4. Compare with original values

**Expected Results:**
- All field values identical
- sys_id unchanged
- Related records (logs) still accessible
- No data corruption

**Failure Indicators:**
- Field values changed or empty
- sys_id changed (record recreated)
- Related records orphaned
- Encoding errors in text fields

**Pass Criteria:** 100% field value match

**Historical Failures:** None recorded

---

### REG-005: REST API Response Schema

**Purpose:** Verify that REST API endpoints maintain consistent response schemas.

**Precondition:** REST API plugin active, at least one config exists.

**Steps:**
1. Call each REST endpoint
2. Record response schema (keys, types, nesting)
3. Compare against documented schema
4. Verify no unexpected fields added

**Endpoints to Test:**
- `GET /api/x_servicenow_byok/config`
- `POST /api/x_servicenow_byok/validate/{id}`
- `GET /api/x_servicenow_byok/status`
- `GET /api/x_servicenow_byok/report`

**Expected Schema:**
```json
{
  "result": {
    "configs": [
      {
        "sys_id": "string",
        "name": "string",
        "provider_type": "string",
        "status": "string",
        "last_validated": "string"
      }
    ],
    "summary": {
      "total": "number",
      "active": "number",
      "failed": "number"
    }
  }
}
```

**Failure Indicators:**
- Missing required fields
- Type mismatches (string vs number)
- Unexpected nested objects
- Null values where objects expected

**Pass Criteria:** Schema match ≥ 95%

**Historical Failures:** None recorded

---

### REG-006: ACL Enforcement After Update

**Purpose:** Verify that ACLs continue to enforce access control after code updates.

**Precondition:** Test users with different roles exist.

**Steps:**
1. Login as user with `x_servicenow_byok.user` role (read-only)
2. Attempt to read config list - should succeed
3. Attempt to create new config - should fail
4. Attempt to update existing config - should fail
5. Attempt to delete config - should fail
6. Login as admin user
7. Repeat steps 2-5 - all should succeed

**Expected Results:**
- Read-only user can read but not write
- Admin user can read and write
- ACL errors are logged
- No unauthorized access

**Failure Indicators:**
- Read-only user can write
- Admin user cannot write
- No ACL errors logged on denied access
- Direct table access bypasses ACL

**Pass Criteria:** Access control enforced 100%

**Historical Failures:** None recorded

---

### REG-007: Credential Non-Exposure

**Purpose:** Verify that credentials are never exposed in logs, API responses, or UI.

**Precondition:** Configuration with credential reference exists.

**Steps:**
1. Call REST API to get config details
2. Check response for credential values
3. Query log table for validation results
4. Check logs for credential data
5. Open config form in UI
6. Check form for exposed credential values

**Expected Results:**
- API response shows credential sys_id only, not value
- Logs show credential reference only
- UI masks credential field
- No plaintext credentials in any output

**Failure Indicators:**
- API response includes credential value
- Logs contain API keys or secrets
- UI shows plaintext credential
- Error messages include credential details

**Automation Script:**
```javascript
function reg_007_credential_exposure() {
    // Check REST response
    var api = new GlideAPI();
    var response = api.get('/api/x_servicenow_byok/config');
    if (response.indexOf('password') > -1 || response.indexOf('key') > -1) {
        return 'FAIL: Credential data in API response';
    }
    
    // Check logs
    var log = new GlideRecord('x_servicenow_byok_log');
    log.setLimit(10);
    log.query();
    while (log.next()) {
        if (log.error_message.indexOf('key') > -1) {
            return 'FAIL: Credential data in logs';
        }
    }
    
    return 'PASS';
}
```

**Pass Criteria:** Zero credential exposure incidents

**Historical Failures:** None recorded

---

### REG-008: Scheduled Job Reliability

**Purpose:** Verify that scheduled validation job runs reliably after instance restarts.

**Precondition:** Scheduled job configured and active.

**Steps:**
1. Record next scheduled run time
2. Note current job state
3. Simulate instance restart (or wait for maintenance window)
4. After restart, verify job is still active
5. Verify next run time is correct
6. Wait for job execution
7. Verify validation ran and logs created

**Expected Results:**
- Job remains active after restart
- Next run time calculated correctly
- Job executes on schedule
- Logs created for each validation

**Failure Indicators:**
- Job inactive after restart
- Next run time in past or far future
- Job skipped execution
- No logs created

**Pass Criteria:** Job survives restart and executes on schedule

**Historical Failures:** None recorded

---

### REG-009: Error Message Consistency

**Purpose:** Verify that error messages are consistent and actionable across all failure scenarios.

**Precondition:** Test configurations with known failure modes.

**Steps:**
1. Trigger authentication failure (invalid credential)
2. Record error message
3. Trigger timeout failure (non-responsive endpoint)
4. Record error message
5. Trigger validation failure (invalid endpoint)
6. Record error message
7. Compare message format and clarity

**Expected Results:**
- All errors follow format: `[BYOK-{code}] {description}: {action}`
- Messages are actionable (tell user what to do)
- No stack traces exposed to users
- Consistent terminology

**Example Messages:**
- `[BYOK-AUTH-001] Authentication failed: Verify API key is valid and not expired`
- `[BYOK-TIMEOUT-001] Request timeout: Check network connectivity and endpoint URL`
- `[BYOK-CONFIG-001] Invalid configuration: Required field 'endpoint_url' is empty`

**Failure Indicators:**
- Generic "An error occurred" messages
- Stack traces in user-facing output
- Inconsistent error code format
- Messages without actionable guidance

**Pass Criteria:** All errors follow format and are actionable

**Historical Failures:** None recorded

---

### REG-010: Upgrade Compatibility

**Purpose:** Verify that application continues to function after ServiceNow platform upgrade.

**Precondition:** Application installed and functional.

**Steps:**
1. Record current functionality baseline (all tests pass)
2. Apply ServiceNow platform patch/upgrade
3. Run full test suite
4. Compare results with baseline
5. Document any breaking changes

**Expected Results:**
- All P0 tests continue to pass
- No new errors in application logs
- API responses maintain compatibility
- UI forms render correctly

**Failure Indicators:**
- Previously passing tests now fail
- New errors in logs
- API schema changes
- UI rendering issues

**Pass Criteria:** ≥ 95% test pass rate maintained after upgrade

**Historical Failures:** None recorded

---

## Regression Test Schedule

| Test Suite | Frequency | Trigger | Owner |
|------------|-----------|---------|-------|
| P0 Core (REG-001 to REG-004) | Every deployment | Pre-deployment gate | QA Engineer |
| P1 Extended (REG-005 to REG-008) | Weekly | Automated cron | Platform Admin |
| Full Suite (REG-001 to REG-010) | Monthly | Release cycle | QA Lead |
| Post-Incident | After any production issue | Ad-hoc | Support Team |

---

## Regression Test Results Log

| Date | Suite | Pass Rate | Failures | Notes |
|------|-------|-----------|----------|-------|
| 2026-06-01 | Initial | N/A | N/A | Baseline created |

---

## Maintenance

**Add new regression tests when:**
- Bug is fixed (add test for the bug)
- Feature is added (add test for feature)
- Customer reports issue (add test to prevent recurrence)

**Review frequency:** Quarterly

**Retirement criteria:** Test no longer relevant due to feature deprecation
