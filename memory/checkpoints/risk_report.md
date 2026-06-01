# Risk Report — BYOK Autoconfigurator (x_byok)

| ID | Risk | Severity | Likelihood | Impact | Mitigation | Status |
|----|------|----------|------------|--------|------------|--------|
| P0-B01 | AI Control Tower plugin absent on target instance | P0 | Medium | Showstopper | Prerequisites validation gate; clear error message with activation steps | Mitigated |
| P0-B02 | `discovery_credentials` table missing on vanilla PDI | P0 | Low | Silent credential storage failure | Graceful error handling; alternative credential store path documented | Open |
| P0-B03 | Provider endpoint unreachable (network, firewall) | P0 | Medium | Configuration succeeds but connectivity fails | `Connected With Warnings` state; retry logic not in v1.0.0 | Acknowledged |
| P1-B04 | API key exposed in audit log | P1 | Low | Security incident | API keys routed through `discovery_credentials`, never written to audit log. Audit log stores only state/metadata | Mitigated |
| P1-B05 | Token masking in `.env` prevents GitHub push | P1 | Medium | Deployment blocked | Python push script validates token length before attempting push | Mitigated |
| P1-B06 | Provider-specific test payload incompatible (not all accept Chat Completions format) | P1 | Medium | False connectivity failure | `_testConnectivity` uses generic `{ messages: [...] }` payload; provider-specific payloads deferred to v1.1.0 | Acknowledged |
| P2-B07 | GlideRecord `next()` returns zero for valid plugins in certain release builds | P2 | Low | False-negative prerequisite failure | Validated against Australia release plugin list; `v_plugin` is stable | Monitored |
| P2-B08 | `gs.getProperty('sn_aicontrol_tower.active')` returns undefined on pre-Australia instances | P2 | Low | Prerequisites check incorrect | Explicit string comparison `!== 'true'` handles undefined | Mitigated |
| P2-B09 | Race condition: two autoconfigure calls for same provider simultaneously | P2 | Low | Duplicate provider config records | No dedup logic in v1.0.0; each call creates independent records. Idempotency check deferred to v1.1.0 | Acknowledged |
| P3-B10 | README mass-template append contamination creates duplicate sections | P3 | Medium | Documentation quality | G8 gate check: `grep '^## ' | sort | uniq -d` must be empty | Mitigated |
| P3-B11 | Execution time > 5s on slow provider endpoints exceeds expected UX window | P3 | Medium | User experience | Execution time tracked in `execution_time_ms`; async execution deferred to v1.2.0 | Acknowledged |
| P3-B12 | `sn_ws.RESTMessageV2` not available in scoped app context without explicit privilege | P3 | Low | Connectivity test fails | Cross-scope privilege requirements documented; REST endpoint uses `sn_ws` which is globally available | Mitigated |

## Risk Summary

| Severity | Count | Action Required |
|----------|-------|-----------------|
| P0 | 3 | All mitigated or acknowledged with workarounds |
| P1 | 3 | Mitigated in v1.0.0 |
| P2 | 3 | Monitored; fixes deferred |
| P3 | 3 | Documented; non-blocking |

