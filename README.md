# Incident Triage Board

## Links

- **Live app (Vercel):** https://project-test-pi-ten.vercel.app
- **Source (GitHub):** https://github.com/pankajarmo/incident-triage-board

## Measured contrast ratios (WCAG AA, target ≥ 4.5:1 for normal text)

Measured with the WCAG relative-luminance formula in `src/lib/triage/contrast.ts`, sampled at
the extreme colors of each rule's scale:

| Rule | Card state | Background | Text | Measured ratio | AA (4.5:1) |
|------|-----------|-----------|------|---------------:|:----------:|
| Rule 1 | barely over (amber)  | `#f59e0b` | black | **9.78:1**  | ✅ |
| Rule 1 | way over (deep red)  | `#7f1d1d` | white | **10.02:1** | ✅ |
| Rule 3 | calm (green)         | `#16a34a` | black | **6.37:1**  | ✅ |
| Rule 3 | mid (amber)          | `#f59e0b` | black | **9.78:1**  | ✅ |
| Rule 3 | urgent (red)         | `#dc2626` | white | **4.83:1**  | ✅ |
| Rule 2 | keyword (amber)      | `#f59e0b` | black | **9.78:1**  | ✅ |
| Neutral | no match (slate)    | `#475569` | white | **7.58:1**  | ✅ |
