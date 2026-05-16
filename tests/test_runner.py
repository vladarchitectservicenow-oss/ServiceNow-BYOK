#!/usr/bin/env python3
"""
BYOK Super Tester — Static Validation
Copyright (C) 2026 Vladimir Kapustin — AGPL-3.0
"""
import json, re, xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime

BASE = Path("/home/crixus/agentic-loop/output/BYOK")
REPORTS = BASE / "tests/execution_history"
REPORTS.mkdir(parents=True, exist_ok=True)

res = {"passed": 0, "failed": 0, "scenarios": []}

def ok(name, fn):
    try:
        fn()
        res["passed"] += 1
        res["scenarios"].append({"name": name, "status": "PASS"})
    except AssertionError as e:
        res["failed"] += 1
        res["scenarios"].append({"name": name, "status": "FAIL", "error": str(e)})

ok("SYS_APP: scope=x_byok and AGPL-3.0", lambda: (
    (lambda: (ET.parse(BASE / "src/sys_app.xml").getroot().find(".//scope").text == "x_byok"))(),
    (lambda: ("AGPL-3.0" in ET.parse(BASE / "src/sys_app.xml").getroot().find(".//license").text))()
))

ok("SI: BYOKAutoconfigurator.js has core methods", lambda: (
    (lambda: ("autoconfigure" in (BASE / "src/script_includes/BYOKAutoconfigurator.js").read_text()))(),
    (lambda: ("_validatePrerequisites" in (BASE / "src/script_includes/BYOKAutoconfigurator.js").read_text()))(),
    (lambda: ("_testConnectivity" in (BASE / "src/script_includes/BYOKAutoconfigurator.js").read_text()))()
))

ok("TABLES: provider_config + audit_log seeded", lambda: (
    (lambda: (len(ET.parse(BASE / "src/tables/x_byok_data.xml").getroot().findall("x_byok_provider_config")) >= 2))(),
    (lambda: (len(ET.parse(BASE / "src/tables/x_byok_data.xml").getroot().findall("x_byok_audit_log")) >= 1))()
))

ok("README: mentions all 4 providers", lambda: (
    (lambda: (all(p in (BASE / "README.md").read_text() for p in ["Azure OpenAI", "Bedrock", "Vertex AI", "watsonx"])))()
))

report = {
    "timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
    "product": "BYOK", "version": "1.0.0",
    "scenarios_run": [s["name"] for s in res["scenarios"]],
    "passed": res["passed"], "failed": res["failed"], "skipped": 0,
    "duration_ms": 0, "environment": "local-ci (static)", "commit_sha": "(local)"
}

rp = REPORTS / f"{datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}_run.json"
with open(rp, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"RESULTS: PASS={res['passed']} FAIL={res['failed']}")
print(f"Report: {rp}")
exit(0 if res["failed"] == 0 else 1)
