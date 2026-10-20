import json
import re

from evals.truth_sheet import HERE, grade, looks_malay


def test_truth_sheet_cases_are_well_formed():
    sheet = json.loads((HERE / "truth_sheet.json").read_text(encoding="utf-8"))
    names = [case["name"] for section in ("rag", "copilot") for case in sheet[section]]
    assert len(names) == len(set(names))
    for case in sheet["rag"]:
        assert case["expect"] in {"answer", "handoff"} and case["language"] in {"EN", "MS"}
    for case in sheet["copilot"]:
        assert case["role"] in {"OWNER", "STAFF"}
        for pattern in case.get("must_match", []) + case.get("must_not_match", []):
            re.compile(pattern)
    for faq in sheet["faqs"]:
        assert all(faq[key] for key in ("question_en", "answer_en", "question_ms", "answer_ms"))


def test_grade_checks_outcome_patterns_and_language():
    case = {"expect": "ANSWER", "language": "MS", "must_match": [r"\b2\b"], "must_not_match": [r"RM\s?\d"]}
    assert grade(case, outcome="ANSWER", reply="Ada 2 pesanan untuk hari ini.") == []
    assert grade(case, outcome="ANSWER", reply="There are 2 orders today.") == ["reply is not in MS"]
    failures = grade(case, outcome="CONFIRMATION_REQUIRED", reply="Harga RM 10 untuk hari ini.")
    assert len(failures) == 3
    assert grade({"expect": ["ANSWER", "CONFIRMATION_REQUIRED"]}, outcome="CONFIRMATION_REQUIRED", reply="") == []
    assert looks_malay("Stock for Bahulu is 3 packs") is False
    assert looks_malay("Stok untuk produk ini ada 3")
