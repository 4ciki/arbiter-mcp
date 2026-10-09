## Summary

<!-- One sentence: what does this PR do and why? -->

Closes #<!-- issue number -->

---

## Type of change

<!-- Put an x in all boxes that apply -->

- [ ] `feat` — new feature or adapter
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `test` — new or improved tests
- [ ] `refactor` — no behavior change
- [ ] `chore` — build, CI, dependencies
- [ ] `style` — formatting only

**Scope:** <!-- agent / adapter / scoring / retrieval / llm / api / mcp / dashboard / ci / docs -->

---

## What changed and why

<!-- Explain the WHY. What was the problem? What is the approach? -->

---

## How to test this

<!-- Step-by-step instructions for a reviewer to verify the change works -->

```bash
# example
python -m pytest tests/test_your_new_file.py -v
```

---

## Checklist

- [ ] I have read [`CONTRIBUTING.md`](../CONTRIBUTING.md)
- [ ] My branch is up to date with `main`
- [ ] All 51 existing tests pass (`pytest tests/ -v`)
- [ ] I have added tests for new code (80%+ coverage on new paths)
- [ ] I have **not** committed any secrets, credentials, or `.env` files
- [ ] I have **not** modified the `risk_override` safety rule in `agent/nodes.py`
- [ ] I have updated README / docstrings where relevant
- [ ] CI is green (do not mark Ready for Review until it is)

---

## Screenshots (dashboard / UI changes only)

<!-- Paste before/after screenshots if this touches the dashboard -->
