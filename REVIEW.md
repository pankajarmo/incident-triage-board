# Review notes - severity.py / test_severity.py

tl;dr: requesting changes, can't merge this yet.

Found two actual bugs that block, plus the cache thing is sketchy and the tests are kinda passing by accident. Details below.


## Blocking stuff

### 1. gradient divides by ceiling instead of span - severity.py:84

```python
span = ceiling - threshold          # we compute this
fraction = (value - threshold) / ceiling   # ...then divide by ceiling anyway?
```

So `fraction` doesn't hit 1.0 until value is basically double the ceiling. Net effect: a maxed out metric shows up *milder* than it should (value == ceiling comes out amber-ish instead of deep red). Also `span` just sits there unused.

fix:

```python
span = ceiling - threshold
if span <= 0:                       # ceiling<=threshold blows up / inverts the gradient
    raise ValueError("ceiling must be greater than threshold")
fraction = (value - threshold) / span
```

### 2. value == threshold returns a color, but docstring says it shouldn't - severity.py:79

Docstring says None "at or below threshold", and the spec says "above 5%". But `value < threshold` lets `5.0` slip through. So at exactly 5% you get a color when you shouldn't.

fix:

```python
if value is None or value <= threshold:
    return None
```

---

## Should fix (not blocking but please)

### 3. the hand-rolled cache is unbounded, and lru_cache is imported but never used - severity.py:16, 27, 74-87

`_color_cache` grows forever. Which is extra bad here because the whole point is alert storms, and storms produce a ton of *distinct* strings, so it's basically a memory leak in the exact scenario it's meant to help with. It also never caches None results, and it leaks state between tests.

We already import the stdlib thing for this, just use it:

```python
@lru_cache(maxsize=1024)
def severity_color(text, threshold=5.0, ceiling=DEFAULT_CEILING):
    ...
```

All the args are hashable so it's a drop-in. Then delete `_color_cache`.

### 4. parse_first_number ignores units - severity.py:30-49

It just grabs the first run of digits, doesn't care about the unit. So `"p99 latency 1500ms"` and `"error rate 40%"` get treated the same. Docstring claims it "handles % or ms" but... it doesn't, it ignores units completely. Either:
- drop the "% / ms" bit from the docstring, or (better imo)
- actually tell them apart and return the unit with the value.

---

## Minor / nits (non-blocking)

- severity.py:62 - `int()` truncates, `int(254.9)` -> 254. should be `round()`.
- severity.py:30-49 - leading `-` gets silently dropped, `"-5"` -> 5.0. fine for this case but throw a comment on it so it's clearly on purpose.
- severity.py:23 - `DEFAULT_CEILING = 100.0` reads like "100%" but the func is unit-agnostic (see #4). bit confusing.

---

## Tests - test_severity.py

### test_just_over_threshold_is_amber_ish is hiding bug #2 - test_severity.py:30-36

The comment claims `5` returns None, but the code returns a color and the `if color is not None` guard makes the test pass regardless. So it's green for the wrong reason. After #2 is fixed:

```python
def test_at_threshold_is_no_incident():
    assert severity_color("error rate 5%", threshold=5.0) is None

def test_just_over_threshold_is_amber_ish():
    color = severity_color("error rate 6%", threshold=5.0)
    assert color is not None and color[0] > 200
```

### no coverage that would've caught bug #1

```python
def test_at_ceiling_is_deep_red():
    from severity import DEEP_RED
    assert severity_color("error rate 100%", threshold=5.0, ceiling=100.0) == DEEP_RED

def test_way_over_clamps_to_deep_red():
    assert severity_color("error rate 250%", threshold=5.0, ceiling=100.0) == DEEP_RED
```

### other gaps worth adding
- `ceiling <= threshold` config (the guard from bug #1).
- parse_first_number edge cases: `"v2.3.1"`, `"got 500 then 200"` (first one wins), empty string.
