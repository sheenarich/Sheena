# Fraction Models Lab

An interactive web app for comparing, adding and subtracting fractions with visual models.

Open `index.html` in any browser. No install or build step is needed.

## What it does

- **Compare**, **Add** and **Subtract** tabs. Link straight to one with `index.html#compare`, `#add` or `#subtract`.
- Four models: **bars**, **circles**, an **area model** and **fraction tiles**. Switch between them at any time.
  - In the area model, each original piece becomes a column and the common-denominator cuts run across it.
  - Fraction tiles lay the pieces out under a "1" strip, with outlines grouping the new pieces back into the original ones.
- **Mixed numbers**: turn it on to enter a whole number with each fraction (up to 2 wholes). Step 1 renames each mixed number as a fraction greater than 1, for example 2 1/3 = (2 × 3 + 1)/3 = 7/3.
- Every problem is solved in numbered steps:
  1. Build each fraction as a model.
  2. Rename with a common denominator. The model re-cuts each piece, with thick lines marking the original pieces and dashed lines marking the new cuts.
  3. Compare on a number line, join the pieces (addition), or cross out pieces (subtraction).
- Answers are shown in simplest form and as mixed numbers when the result is more than one whole.
- **Practice mode** hides the answer. Students choose `<`, `=` or `>`, or type a sum or difference like `5/6` or `1 1/6`, then check it. Equivalent answers that are not in simplest form are accepted with a note.
- **Score tracker** in practice mode: correct out of finished problems, a first-try streak, the best streak, and dots for the last 20 problems (first try, after a retry, or answer shown). **Next problem** appears after each answer, and **Reset score** clears it. The score is saved in the browser.
- **New problem** generates problems at three levels: same denominators, related denominators (like 3 and 6), and unlike denominators.
- Use the − and + buttons to set any fraction with denominators from 1 to 12 (numerators up to two wholes).

Standards: 4.NF.A.2 (compare), 4.NF.B.3 and 5.NF.A.1 (add and subtract).
