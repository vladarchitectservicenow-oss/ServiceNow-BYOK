# Test Suite SOP — BYOK Autoconfigurator (x_byok)

## Test Environment
- **Framework:** Node.js 18+ with ServiceNow mock runtime (MockGR, MockGS, mockREST)
- **Source file:** `src/script_includes/BYOKAutoconfigurator.js`
- **Scope:** `x_byok`
- **Execution:** `node tests/test_runner.js`

## Preconditions
All tests assume the BYOKAutoconfigurator Script Include is loaded via indirect eval with the `var` → `global.` substitution applied.

---

## Test Scenarios

| ID | Scenario | Input | Expected Result | Severity |
|----|----------|-------|-----------------|----------|
| T01 | Successful Azure OpenAI autoconfiguration | provider=`azure_openai`, config=`{endpoint: "https://my.openai.azure.com", model: "gpt-4", api_key: "sk-..."}` | status.state=`Completed`, status.errors=[], status.api_test.success=`true` | Critical |
| T02 | Successful Amazon Bedrock autoconfiguration | provider=`bedrock`, config=`{endpoint: "https://bedrock.us-east-1.amazonaws.com", model: "claude-3"}` | status.state=`Completed`, no errors, connectivity test passes | Critical |
| T03 | Successful Google Vertex AI autoconfiguration | provider=`vertex_ai`, config=`{endpoint: "https://us-central1-aiplatform.googleapis.com", model: "gemini-pro"}` | status.state=`Completed` | Critical |
| T04 | Successful IBM watsonx autoconfiguration | provider=`watsonx`, config=`{endpoint: "https://us-south.ml.cloud.ibm.com", model: "granite-13b"}` | status.state=`Completed` | Critical |
| T05 | AI Control Tower plugin inactive | `sn_aicontrol_tower.active` = `false` | status.state=`Failed Prerequisites`, errors contains "AI Control Tower plugin not active" | High |
| T06 | User missing ai_control_tower_admin role | `gs.hasRole('ai_control_tower_admin')` = `false`, `gs.hasRole('admin')` = `false` | status.state=`Failed Prerequisites`, errors contains "Missing ai_control_tower_admin role" | High |
| T07 | Provider plugin not found | provider plugin (`sn_generative_ai.azure_openai`) — GlideRecord query returns zero rows | status.state=`Failed Prerequisites`, errors contains "Provider plugin not found" | High |
| T08 | Provider plugin found but inactive | `v_plugin.active` = `false` | status.state=`Failed Prerequisites`, errors contains "Provider plugin not active" | High |
| T09 | Connectivity test fails (HTTP 500) | Provider endpoint returns HTTP 500 | status.state=`Connected With Warnings`, status.api_test.success=`false`, status.warnings non-empty | High |
| T10 | Connectivity test — endpoint unreachable (network error) | `sn_ws.RESTMessageV2.execute()` throws exception | status.api_test.success=`false`, status.api_test.status_code=`0`, status.state=`Connected With Warnings` | Medium |
| T11 | Unknown provider string | provider=`unknown_provider`, config=`{}` | Status returns with `Failed Prerequisites` — "Provider plugin not found: undefined" | Medium |
| T12 | Empty endpoint in config | config.endpoint = `''` | Connectivity test fails, but prerequisite validation passes. Status: `Connected With Warnings` | Low |
| T13 | Audit record creation fails (table permission issue) | `GlideRecord('x_byok_audit_log').insert()` throws | autoconfigure() still returns status — no exception propagates. Status.errors does NOT include audit failure (wrapped in try/catch) | Low |
| T14 | Concurrent autoconfigure calls for same provider | Two sequential calls to `autoconfigure('azure_openai', config)` without waiting | Both return independent status objects with distinct provider_refs. No deduplication. Second call succeeds. | Medium |
| T15 | execution_time_ms correctly tracked | Any successful autoconfiguration call | status.execution_time_ms > 0 (measured start-to-finish) | Low |

## Execution Instructions

```bash
cd /tmp/byok_prod
node tests/test_runner.js
```

**Expected:** All scenarios T01–T15 pass (T09 and T10 are state-verification tests, not connectivity success tests).

## Failure Protocol

1. If any Critical (T01–T04) fails: check MockGR row population and provider plugin lookup
2. If any High (T05–T10) fails: check mock GS/RESTMessageV2 injection
3. If T13 fails: verify `_createAuditRecord` is wrapped in try/catch
4. Re-run with `--verbose` flag to see individual test output

