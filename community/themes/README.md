# Themes

One theme per entry, named in lower case with hyphens. An entry is either a
single `.css` file or a folder with a `theme.css` inside it and whatever that
refers to — partial stylesheets, fonts, images.

```text
themes/
├── paper.css             a single-file theme
└── gemini-app/           a folder theme
    ├── theme.css         the entry; the header lives here
    ├── parts/menus.css
    └── fonts/…
```

```css
/**
 * @name        Midnight Blue
 * @source      https://github.com/you/midnight-blue
 */

:root {
  --primary: #22d3ee !important;
}
```

`@name` is the only field a theme has to carry — a theme is its palette, and the
settings list shows the name and a switch, so the rest is noise there.
`@description`, `@author`, `@version` and `@source` are optional: carry them if
they say something worth carrying, leave them out otherwise. A theme may
`@import` a stylesheet hosted elsewhere over `https`; the reviewer is told where
it points.

Writing one is covered in [the theme guide](../../docs/themes.md). Submission
rules are in [the community README](../README.md).
