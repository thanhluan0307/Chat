# ChatApp icon

`icon-1024.png` is the opaque master icon for iOS and Android legacy icons.
`foreground.png` is the transparent bubble layer for Android adaptive icons.
The artwork was prepared from the supplied reference using the built-in imagegen tool.

Prompts: preserve the supplied two overlapping white and pale blue chat bubbles,
the two blue dots, and the full-bleed blue gradient without adding text or borders.
For the adaptive foreground, remove the background and retain transparent margins
around the original bubble group.

To regenerate native icon assets on macOS, run from `frontend`:

```sh
swift scripts/generate-app-icons.swift
```

iOS includes iPhone, iPad, and App Store sizes. Android includes all five legacy
densities, circular variants, and adaptive icons with separate background and
foreground layers. Rebuild the native app after changing icons.
