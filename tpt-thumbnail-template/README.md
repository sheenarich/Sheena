# TPT Thumbnail Template (1080 × 1080)

A reusable, bold, easy-to-read thumbnail set for your Teachers Pay Teachers
listings. One config block drives **four** 1080×1080 thumbnails:

1. **Main / Cover** — big title, level band, worksheet mockup, two badges
2. **What's Included** — a clean checklist of everything in the product
3. **More Details** — "How It Works" numbered steps
4. **More Details** — "Perfect For" icon tiles + standards

## How to use it

1. Open `index.html` in Chrome (double-click it). You'll see all four thumbnails.
2. Scroll to the **CONFIG** block near the bottom of `index.html`
   (look for `4. CONFIG`). Change the words between the quotes.
3. Save the file and refresh the browser — every thumbnail updates.
4. Click **⬇ PNG** under any thumbnail (or **Download all 4 PNGs** in the top bar)
   to save print-ready 1080×1080 images. Upload those to TPT.

## Making it your own

- **Colors & fonts:** edit section `1. YOUR BRAND COLORS & FONTS` at the top of the
  `<style>` block. Change `--blue`, `--orange`, `--purple`, etc. once and all four
  thumbnails re-skin together.
- **Lists** (what's included, steps, tags) can have as many or as few items as you
  want — just add or remove lines in the CONFIG.
- **Badges:** the cover has a speech bubble and a starburst; edit `bubble`,
  `burstTop`, `burstMain`, `burstSub`.

## Notes

- The first open needs internet (for the fonts and the PNG-export library).
- If the **Download PNG** button ever fails, you can also just screenshot the
  thumbnail — it renders at true 1080×1080 internally.
- Emoji are used for the "Perfect For" icons so there are no image files to manage.
