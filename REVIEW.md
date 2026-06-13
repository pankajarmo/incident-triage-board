# Code review — `severity.py` / `test_severity.py`

**Verdict: Request changes (blocking).**

Two correctness bugs block merge, plus a cache/unit issue and a test suite that passes for the wrong reasons.


## Blocking

### 1. Gradient divides by `ceiling`, not `span` — `severity.py:84`

```python
span = ceiling - threshold          # computed
fraction = (value - threshold) / ceiling   # but divides by ceiling
```

`fraction` never reaches `1.0` until the value is ~double the ceiling, so a maxed-out metric renders *milder* than it is (e.g. `value == ceiling` → amber-ish, not deep red). `span` is unused.

**Fix:**

```python
span = ceiling - threshold
if span <= 0:                       # ceiling<=threshold -> ZeroDivisionError / inverted gradient
    raise ValueError("ceiling must be greater than threshold")
fraction = (value - threshold) / span
```

### 2. `value == threshold` returns a color, contradicting docstring/spec — `severity.py:79`

Docstring says None "at or below threshold"; spec is "above 5%". `value < threshold` lets `5.0` through.

**Fix:**

```python
if value is None or value <= threshold:
    return None
```

---

## Should fix

### 3. Hand-rolled cache is unbounded; `lru_cache` imported but unused — `severity.py:16, 27, 74-87`

`_color_cache` grows without bound (memory leak during exactly the alert-storm case it targets, since storms produce many *distinct* strings), never caches `None` results, and leaks state across tests. Replace with the stdlib tool already imported:

```python
@lru_cache(maxsize=1024)
def severity_color(text, threshold=5.0, ceiling=DEFAULT_CEILING):
    ...
```

All args are hashable — drop-in. Delete `_color_cache`.

### 4. `parse_first_number` is unit-blind — `severity.py:30-49`

Grabs the first digit run regardless of unit, so `"p99 latency 1500ms"` and `"error rate 40%"` are treated identically. Docstring claims it "handles % or ms" but it ignores units entirely. Either:
- remove the "% / ms" claim from the docstring, **or** (preferred)
- distinguish the two and return the unit alongside the value.

---

## (non-blocking)

- `severity.py:62` — `int()` truncates (`int(254.9)` → 254). Use `round()`.
- `severity.py:30-49` — leading `-` is silently dropped (`"-5"` → 5.0). Fine for this domain, but add a one-line comment making it deliberate.
- `severity.py:23` — `DEFAULT_CEILING = 100.0` reads as "100%" but the function is unit-agnostic (see #4).

---

## Tests — `test_severity.py`

### `test_just_over_threshold_is_amber_ish` hides bug #2 — `test_severity.py:30-36`

The comment says `5` returns `None`, but the code returns a color and the `if color is not None` guard makes the test pass anyway. After fixing #2:

```python
def test_at_threshold_is_no_incident():
    assert severity_color("error rate 5%", threshold=5.0) is None

def test_just_over_threshold_is_amber_ish():
    color = severity_color("error rate 6%", threshold=5.0)
    assert color is not None and color[0] > 200
```

### Missing coverage that would have caught bug #1

```python
def test_at_ceiling_is_deep_red():
    from severity import DEEP_RED
    assert severity_color("error rate 100%", threshold=5.0, ceiling=100.0) == DEEP_RED

def test_way_over_clamps_to_deep_red():
    assert severity_color("error rate 250%", threshold=5.0, ceiling=100.0) == DEEP_RED
```

### Other gaps
- `ceiling <= threshold` config (bug #1's guard).
- `parse_first_number` edge cases: `"v2.3.1"`, `"got 500 then 200"` (first wins), empty string.


