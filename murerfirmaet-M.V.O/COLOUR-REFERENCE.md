# MVO Colour Reference

All tokens are exposed as CSS custom properties (`var(--token-name)`) and as utility classes.

---

## 🎨 Brand / Primary

| Class | CSS Var | Hex | Swatch | Use |
|-------|---------|-----|--------|-----|
| `u-bg-primary` | `--color-primary` | `#c0954a` | 🟧 gold | CTA buttons, icons |
| `u-bg-primary-soft` | `--color-primary-soft` | `#f2e6cf` | 🟨 pale gold | Subtle gold tints |
| `u-text-brand` | `--color-primary` | `#c0954a` | 🟧 gold | Brand text, links |
| `u-text-accent` | `--text-accent` | `#8e672d` | 🟫 dark gold | Small text on light bg |

---

## ⬛ Backgrounds — Dark

| Class | CSS Var | Hex | Swatch | Use |
|-------|---------|-----|--------|-----|
| `u-bg-dark` | `--bg-dark` | `#0c0f13` | ⬛ near-black | Darkest sections |
| `u-bg-dark-elevated` | `--bg-dark-elevated` | `#1a1b1e` | ⬛ dark card | Elevated surfaces on dark |
| `u-bg-dark-deep` | `--bg-dark-deep` | `#191a1b` | ⬛ deep dark | Form/card bg on dark sections |
| `u-bg-secondary` | `--color-secondary` | `#15191e` | ⬛ dark navy | Main dark section bg |
| `u-bg-overlay` | `--bg-overlay-dark` | `rgba(12,15,19,0.72)` | 🌑 semi-transparent | Image overlays |

---

## ⬜ Backgrounds — Light

| Class | CSS Var | Hex | Swatch | Use |
|-------|---------|-----|--------|-----|
| `u-bg-surface` | `--bg-surface` | `#ffffff` | ⬜ white | Cards on light sections |
| `u-bg-page` | `--bg-page` | `#faf9f8` | 🟫 off-white | Page base background |
| `u-bg-section` | `--bg-section` | `#f5f3f2` | 🟫 warm gray | Alternating sections |
| `u-bg-surface-soft` | `--bg-surface-soft` | `#efede9` | 🟫 soft warm | Subtle surface variant |
| `u-bg-gold-subtle` | `--bg-gold-subtle` | `#fbf6ed` | 🟨 warm cream | Work-step icon circles |

---

## 🔤 Text — Light Sections

| Class | CSS Var | Hex | Swatch | Use |
|-------|---------|-----|--------|-----|
| `u-text-body` | `--text-primary` | `#181a1d` | ⬛ near-black | Primary body text |
| `u-text-secondary` | `--text-secondary` | `#5f6265` | 🩶 medium gray | Secondary / captions |
| `u-text-muted` | `--text-muted` | `#858785` | 🩶 light gray | Placeholders, disabled |

---

## 🔤 Text — Dark Sections

| Class | CSS Var | Hex | Swatch | Use |
|-------|---------|-----|--------|-----|
| `u-text-dark-heading` | `--text-heading` | `#ffffff` | ⬜ white | Headings on dark bg |
| `u-text-dark-body` | `--text-body-alt` | `#dfdcd7` | 🩶 warm light gray | Body/paragraph on dark bg |
| `u-text-field` | `--text-field` | `#dfdcd7` | 🩶 warm light gray | Typed text in inputs |
| `u-text-inverse` | `--text-inverse` | `#faf9f8` | ⬜ off-white | Generic inverse text |
| `u-text-inverse-secondary` | `--text-inverse-secondary` | `#c9c6c1` | 🩶 mid gray | Secondary text on dark |
| `u-text-on-primary` | `--text-on-primary` | `#ffffff` | ⬜ white | Text on gold buttons |
| `u-text-on-secondary` | `--text-on-secondary` | `#ffffff` | ⬜ white | Text on dark buttons |

---

## 🔲 Borders

Use `u-border` first to set `border-width: 1px` and `border-style: solid`, then add a color class.

```html
<div class="u-border u-border-card">...</div>
```

| Class | CSS Var | Value | Swatch | Use |
|-------|---------|-------|--------|-----|
| `u-border` (alone) | `--border-default` | `#dfdcd7` | 🩶 light | Default light-section border |
| `u-border-default` | `--border-default` | `#dfdcd7` | 🩶 light | Light section borders |
| `u-border-strong` | `--border-strong` | `#c9c6c1` | 🩶 medium | Stronger light border |
| `u-border-dark` | `--border-dark` | `#383b40` | 🌑 dark | Dark section borders |
| `u-border-accent` | `--border-accent` | `#c0954a` | 🟧 gold | Full-strength gold border |
| `u-border-card` | `--border-card` | `rgba(#b58d45, 0.40)` | 🟧 muted gold | Card/form border on dark bg |
| `u-border-input` | `--border-input` | `rgba(#b58d45, 0.32)` | 🟧 subtle gold | Input default border |

---

## 💡 Quick Dark-Section Recipe

```html
<section class="u-bg-dark">
  <h2 class="u-text-dark-heading">Heading</h2>
  <p class="u-text-dark-body">Body text that reads clearly but isn't glaring white.</p>
  <div class="u-border u-border-card u-bg-dark-deep rounded-lg p-4">
    Card content
  </div>
</section>
```

