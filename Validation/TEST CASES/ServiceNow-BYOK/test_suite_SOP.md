# Test Suite SOP: ServiceNow-BYOK Validator

**Product:** ServiceNow Bring Your Own Key (BYOK) Validator  
**Scope:** x_servicenow_byok  
**Author:** Vladimir Kapustin  
**License:** AGPL-3.0  
**Version:** 2.0  
**Last Updated:** 2026-06-01

---

## Overview

This Standard Operating Procedure (SOP) defines the complete test suite for validating the ServiceNow-BYOK application. The test suite covers functional validation, security testing, performance benchmarks, and edge case handling.

**Test Philosophy:** Test in isolation first, then integration, then production-like scenarios. Every test must be repeatable, automated, and produce clear PASS/FAIL results.

---

## Test Environment Setup

### Prerequisites

| Requirement | Value | Verification |
|-------------|-------|--------------|
| ServiceNow Instance | Australia release (dev362840 or equivalent) | `gs.getProperty('glide.build.version')` |
| Admin Access | admin user with x_servicenow_byok.admin role | Verify in user record |
| Test Plugins | Generative AI Controller, REST API, Credentials | Plugin list check |
| Test Data | 4 test credential records (one per provider type) | sys_credential.list |
| Network Access | Outbound HTTPS to AI provider endpoints | curl test from instance |

### Test Data Preparation

**Create test credentials before running tests:**

```javascript
// Background Script to create test credentials
var creds = [
    {name: 'TEST-Azure-Key', type: 'api_key'},
    {name: 'TEST-AWS-Creds', type: 'basic_auth'},
    {name: 'TEST-GCP-SA', type: 'oauth'},
    {name: 'TEST-IBM-Key', type: 'api_key'}
];

creds.forEach(function(c) {
    var gr = new GlideRecord('sys_credential');
    gr.initialize();
    gr.name = c.name;
    gr.type = c.type;
    // Note: In real tests, set actual credential values
    gr.insert();
    gs.info('Created credential: ' + c.name + ' (sys_id: ' + gr.getUniqueValue() + ')');
});
```

### Test Configuration Records

**Create one config per provider type:**

| Config Name | Provider Type | Credential | Purpose |
|-------------|---------------|------------|---------|
| TEST-Azure-Config | Azure OpenAI | TEST-Azure-Key | Azure validation tests |
| TEST-AWS-Config | AWS Bedrock | TEST-AWS-Creds | AWS validation tests |
| TEST-GCP-Config | Google Vertex AI | TEST-GCP-SA | Google validation tests |
| TEST-IBM-Config | IBM watsonx | TEST-IBM-Key | IBM validation tests |

---

## Test Scenarios (12 Total)

### P0 Critical Tests (Must Pass)

#### Test 1: test_plugin_active

**Purpose:** Verify required plugins are installed and active.

**Steps:**
1. Query sys_plugin table for required plugin IDs
2. Check each plugin's installed and active status
3. Assert all plugins are present and active

**Required Plugins:**
- `comedic_ai_controller` (Generative AI Controller)
- `com.rest.api` (REST API)
- `com.credentials` (Credentials)

**Expected Result:** All 3 plugins return `installed=true` and `active=true`

**Failure Mode:** Missing plugin → Block all further testing, fail immediately

**Automation:**
```javascript
function test_plugin_active() {
    var required = ['comedic_ai_controller', 'com.rest.api', 'com.credentials'];
    var failed = [];
    required.forEach(function(pid) {
        var gr = new GlideRecord('sys_plugin');
        gr.addQuery('id', pid);
        if (!gr.query().next() || !gr.active) {
            failed.push(pid);
        }
    });
    return failed.length === 0 ? 'PASS' : 'FAIL: Missing ' + failed.join(',');
}
```

---

#### Test 2: test_role_assigned

**Purpose:** Verify required roles exist and are assignable.

**Steps:**
1. Query sys_user_role for BYOK roles
2. Verify role hierarchy is correct
3. Test role assignment to test user

**Required Roles:**
- `x_servicenow_byok.admin`
- `x_servicenow_byok.user`
- `x_servicenow_byok.api_user`

**Expected Result:** All 3 roles exist, admin role includes user role

**Failure Mode:** Missing role → ACL tests will fail, block further testing

**Automation:**
```javascript
function test_role_assigned() {
    var roles = ['x_servicenow_byok.admin', 'x_servicenow_byok.user', 'x_servicenow_byok.api_user'];
    var missing = [];
    roles.forEach(function(r) {
        var gr = new GlideRecord('sys_user_role');
        gr.addQuery('name', r);
        if (!gr.query().next()) {
            missing.push(r);
        }
    });
    return missing.length === 0 ? 'PASS' : 'FAIL: Missing ' + missing.join(',');
}
```

---

#### Test 3: test_config_load

**Purpose:** Verify configuration records can be created and loaded.

**Steps:**
1. Create new config record with valid data
2. Read back the record
3. Verify all fields are correctly stored
4. Delete test record

**Test Data:**
- Provider Type: Azure OpenAI
- Name: TEST-Config-Load
- Endpoint: Valid Azure endpoint format
- Credential: TEST-Azure-Key sys_id

**Expected Result:** Record creates successfully, all fields readable

**Failure Mode:** Table missing, ACL blocks, or field type mismatch

**Automation:**
```javascript
function test_config_load() {
    var config = new GlideRecord('x_servicenow_byok_config');
    config.initialize();
    config.provider_type = 'azure_openai';
    config.name = 'TEST-Config-Load';
    config.endpoint_url = 'https://test.openai.azure.com/test';
    // Would need actual credential sys_id in real test
    var sysId = config.insert();
    
    var read = new GlideRecord('x_servicenow_byok_config');
    if (read.get(sysId)) {
        read.deleteRecord();
        return read.provider_type == 'azure_openai' ? 'PASS' : 'FAIL: Field mismatch';
    }
    return 'FAIL: Could not read back record';
}
```

---

#### Test 4: test_rest_api

**Purpose:** Verify REST API endpoints are accessible and functional.

**Steps:**
1. GET /api/x_servicenow_byok/config - List configs
2. POST /api/x_servicenow_byok/validate/{id} - Trigger validation
3. GET /api/x_servicenow_byok/status - Get overall status
4. Verify response format and status codes

**Expected Result:** All endpoints return 200 OK with valid JSON

**Failure Mode:** 404 (endpoint missing), 401 (auth failure), 500 (server error)

**Test Script:** Run from external test harness with admin credentials

---

### P1 High Priority Tests

#### Test 5: test_report_generate

**Purpose:** Verify compliance report generation produces valid output.

**Steps:**
1. Call GET /api/x_servicenow_byok/report
2. Verify report contains all required sections
3. Check report format (JSON structure)
4. Validate data accuracy against source tables

**Expected Result:** Report includes config summary, validation history, risk assessment

**Failure Mode:** Empty report, missing sections, data mismatch

---

#### Test 6: test_empty_data

**Purpose:** Verify application handles empty data gracefully.

**Steps:**
1. Clear all config records (or test on empty instance)
2. Call validate-all endpoint
3. Call list-configs endpoint
4. Verify no errors, appropriate empty-state messages

**Expected Result:** Returns empty array, no errors, status shows "No configurations"

**Failure Mode:** Null pointer errors, 500 responses, undefined behavior

---

#### Test 7: test_error_recovery

**Purpose:** Verify application recovers gracefully from API failures.

**Steps:**
1. Create config with invalid endpoint
2. Run validation
3. Verify error is logged, not thrown
4. Verify application remains functional for other configs

**Expected Result:** Validation fails with clear error, other configs unaffected

**Failure Mode:** Unhandled exception, application crash, cascading failures

---

#### Test 8: test_performance_50concurrent

**Purpose:** Verify performance under load.

**Steps:**
1. Create 50 test configurations
2. Run validate-all operation
3. Measure total execution time
4. Monitor instance CPU and memory

**Expected Result:** Completes in < 5 minutes, CPU < 80%, no timeouts

**Failure Mode:** Timeout, resource exhaustion, incomplete validation

---

### P2 Edge Case Tests

#### Test 9: test_auth_failure

**Purpose:** Verify authentication failures are handled correctly.

**Steps:**
1. Create config with invalid credential
2. Run validation
3. Verify specific auth error message
4. Verify no credential data exposed in logs

**Expected Result:** Returns "Authentication failed" without exposing key details

**Failure Mode:** Generic error, credential leakage, unclear diagnosis

---

#### Test 10: test_delta_scan

**Purpose:** Verify incremental validation only checks changed configs.

**Steps:**
1. Run full validation
2. Modify one config
3. Run validation again
4. Verify only modified config is re-validated

**Expected Result:** Second run is faster, only modified config validated

**Failure Mode:** Full re-validation every time, no delta detection

---

#### Test 11: test_boundary_maxrecords

**Purpose:** Verify behavior at maximum supported scale.

**Steps:**
1. Create 100 configurations (max supported)
2. Run validate-all
3. Verify all are processed
4. Verify no data loss or truncation

**Expected Result:** All 100 configs validated, results complete

**Failure Mode:** Truncation, timeout, memory exhaustion

---

#### Test 12: test_timeout_handling

**Purpose:** Verify timeout handling for slow providers.

**Steps:**
1. Create config pointing to slow/non-responsive endpoint
2. Run validation with 30s timeout
3. Verify timeout occurs gracefully
4. Verify appropriate error message

**Expected Result:** Times out after 30s, logs timeout error, continues other validations

**Failure Mode:** Hangs indefinitely, crashes, no error logged

---

## Test Execution Schedule

| Phase | Tests | Frequency | Owner |
|-------|-------|-----------|-------|
| Pre-Deployment | 1-4 | Every deployment | QA Engineer |
| Post-Deployment | 1-8 | After each deploy | Platform Admin |
| Weekly Regression | 1-12 | Weekly | QA Engineer |
| Performance Benchmark | 8, 11 | Monthly | Performance Team |

---

## Pass/Fail Criteria

**Overall Suite Pass:** All P0 tests PASS, ≥ 90% of P1/P2 tests PASS

**P0 Failure:** Block deployment, immediate fix required

**P1 Failure:** Document risk, schedule fix within 7 days

**P2 Failure:** Document risk, schedule fix within 30 days

---

## Test Result Documentation

**For each test run, record:**
- Test execution timestamp
- Instance version and patch level
- Test executor name
- Pass/Fail status for each test
- Failure details (error messages, screenshots)
- Environment notes (network issues, known problems)

**Store results in:** `Validation/TEST RESULTS/{date}/test_results.md`

---

## Test Maintenance

**Update test suite when:**
- New provider types added
- API endpoints change
- Performance requirements updated
- New edge cases discovered in production

**Review frequency:** Quarterly

---

## Appendix: Test Data Cleanup

**After testing, clean up test data:**

```javascript
// Delete test configurations
var config = new GlideRecord('x_servicenow_byok_config');
config.addQuery('name', 'STARTSWITH', 'TEST-');
config.query();
while (config.next()) {
    config.deleteRecord();
}

// Delete test logs
var log = new GlideRecord('x_servicenow_byok_log');
log.addQuery('config_id', 'IN', '<test_config_sys_ids>');
log.query();
while (log.next()) {
    log.deleteRecord();
}

// Delete test credentials (careful!)
var cred = new GlideRecord('sys_credential');
cred.addQuery('name', 'STARTSWITH', 'TEST-');
cred.query();
while (cred.next()) {
    cred.deleteRecord();
}

gs.info('Test data cleanup complete');
```
