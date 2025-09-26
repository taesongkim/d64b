# Pull Request Checklist

## Summary
Brief description of changes and motivation.

## Test Plan
- [ ] Feature works as expected
- [ ] No regressions introduced
- [ ] Screenshots/logs attached (if applicable)

## Guardrails Verification ✅
**Must remain unchanged to preserve stability:**

- [ ] No UI-driven state clears reintroduced
- [ ] Persist whitelist unchanged (`['auth','settings','sync']` only)
- [ ] SecureStore used for sessions (no session keys in AsyncStorage)
- [ ] `syncService.stop()` still called on logout
- [ ] Task-MD updated (phase + evidence or feature notes)

## Task-MD Protocol
- [ ] Branch follows convention: `feat/<area>-<short-name>` (base = main)
- [ ] Phases completed: Plan → Build → Verify
- [ ] Diffs kept minimal and focused
- [ ] Evidence documented in [Task-MD Protocol](./task-md/Task-protocol.md)
- [ ] TTFS performance impact measured (if applicable)

## Files Changed
List key files with brief description of changes.

## Related Issues
Link any related issues or feature requests.