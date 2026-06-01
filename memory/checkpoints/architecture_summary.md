# Architecture Summary — BYOK Autoconfigurator (x_byok)

## Product Overview

The BYOK Autoconfigurator is a ServiceNow scoped application (scope `x_byok`) that provides a one-click wizard to configure Bring-Your-Own-Key (BYOK) providers for the Generative AI Controller. It supports Azure OpenAI, Amazon Bedrock, Google Vertex AI, and IBM watsonx — eliminating manual credential exchange, endpoint setup, and AI Control Tower navigation.

## Component Architecture

| Component | Type | File | Description |
|-----------|------|------|-------------|
| BYOKAutoconfigurator | Script Include | `src/script_includes/BYOKAutoconfigurator.js` | Core engine: validates prerequisites, stores credentials, provisions providers, tests connectivity, creates audit records |
| x_byok_credential | Table | `src/tables/x_byok_data.xml` | Stores provider credential references securely |
| x_byok_provider_config | Table | `src/tables/x_byok_data.xml` | Provider configuration records (endpoint, model, status) |
| x_byok_audit_log | Table | `src/tables/x_byok_data.xml` | Audit trail for every autoconfiguration run |
| sys_app.xml | App Manifest | `src/sys_app.xml` | Scoped application definition (name, scope, version, license) |

## Data Flow

```
User Input (provider + config)
  │
  ├─► 1. _validatePrerequisites()
  │      ├─ Check AI Control Tower plugin (sn_aicontrol_tower.active)
  │      ├─ Verify role (ai_control_tower_admin or admin)
  │      ├─ Check provider-specific plugin (sn_generative_ai.*)
  │      └─ Return { passed, errors }
  │
  ├─► 2. _storeCredentials()
  │      ├─ Create x_byok_credential record
  │      ├─ Store API key in discovery_credentials
  │      └─ Return credential sys_id
  │
  ├─► 3. _provisionProvider()
  │      ├─ Create x_byok_provider_config record
  │      ├─ Link credential_ref
  │      └─ Return provider sys_id
  │
  ├─► 4. _testConnectivity()
  │      ├─ sn_ws.RESTMessageV2 → POST to endpoint
  │      ├─ Lightweight test payload (hello)
  │      └─ Return { success, status_code, message }
  │
  └─► 5. _createAuditRecord()
         ├─ Write x_byok_audit_log
         ├─ Capture state, errors, warnings, execution_time_ms
         └─ Return void (best-effort, wrapped in try/catch)
```

## Pipeline States

| State | Description |
|-------|-------------|
| Queued | Initial state after autoconfigure() called |
| Failed Prerequisites | Plugin inactive, missing role, or provider plugin not found |
| Failed | Exception thrown during execution |
| Connected With Warnings | Provider provisioned but connectivity test failed |
| Completed | All prerequisites passed, provider configured, connectivity verified |

## Performance Benchmarks

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Prerequisites validation | < 100ms | GlideRecord queries on v_plugin |
| Credential storage | < 200ms | Two GR inserts (x_byok_credential + discovery_credentials) |
| Provider provisioning | < 200ms | Single GR insert |
| Connectivity test | 500ms–5s | Dependent on provider endpoint latency |
| Audit record creation | < 100ms | Single GR insert |
| **Total pipeline** | **1–6 seconds** | Worst case: slow provider endpoint |

## Release Compatibility

- **Target:** ServiceNow Australia (May 2026) and later
- **Required plugins:** AI Control Tower (`sn_aicontrol_tower`), Generative AI Controller
- **Required provider plugins:** `sn_generative_ai.azure_openai`, `sn_generative_ai.aws_bedrock`, `sn_generative_ai.google_vertex`, `sn_generative_ai.ibm_watsonx`
- **Required roles:** `ai_control_tower_admin` or `admin`

