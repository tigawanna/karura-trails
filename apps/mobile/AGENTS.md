# Mobile App — Agent Instructions

Read Expo v56 docs before changing APIs: https://docs.expo.dev/versions/v56.0.0/

**Stack:** Expo Router (`src/app/`), React 19 / RN (New Arch), react-native-paper + `src/theme/`, strict TS, `@/` alias. Prefer `pnpm dev` (Expo Go) before dev builds / EAS.

## Mobile

### Do

- Routes only in `src/app/`; thin screens; stacks/tabs in `_layout.tsx`; `redirect()` for auth
- UI in `src/components/` (feature subfolders ok); hooks in `src/hooks/`; kebab-case files
- Platform splits: `*.ios.tsx`, `*.android.tsx`, `*.web.tsx` when behavior diverges
- Theme via `useThemeSetup()` / Paper tokens — no hardcoded colors; `ThemedText` / `ThemedView` where established
- `react-native-safe-area-context`; flex + theme spacing; `useWindowDimensions` over `Dimensions.get()`
- `@/` imports; `satisfies` when useful; `catch` / `onError` as `unknown`; ask before `any` or hiding types with casts
- `testID` on assertable UI

### Don't

- Co-locate components, hooks, or utils in `src/app/`
- Dead routes, skipped auth, or hooks for every trivial state / premature fetch abstractions
- Legacy `SafeAreaView`, layout via `Dimensions`, or `Platform.OS` where `process.env.EXPO_OS` is enough
- `any` or `onError(err: any)`

```ts
onError(err: unknown) {
  const message = err instanceof Error ? err.message : "Something went wrong";
}
```

### Pitfalls

Orphan routes, hardcoded colors, unnecessary native builds, missing `testID`, type escapes.

### Checklist

`pnpm lint` · `pnpm check-types` · repo `pnpm quality` when shared tooling changes · `/` and protected routes still work

---

## Web

Runs via `pnpm web` (`expo start --web`). Same routes and `@/` layout as mobile; differ only where web needs it.

### Do

- Branch with `process.env.EXPO_OS === "web"` or dedicated `*.web.tsx` / `*.web.ts` (e.g. `app-tabs.web.tsx`, `use-color-scheme.web.ts`)
- Keep shared screens in default files; isolate web-only UI (`WebBadge`, web tab chrome) in `.web` modules or guarded blocks
- Web-only styling in `src/global.css` or `*.module.css` — not Tailwind
- RN primitives via react-native-web (`View`, `Text`, `Pressable`) — no raw `div` / `img` / `span`
- `boxShadow` for shadows on web; respect `MaxContentWidth` for centered layouts
- `testID` (maps to DOM `data-testid`); `ExternalLink` / in-app browser patterns already used for off-app URLs

### Don't

- Duplicate entire screens in `.web` when a small branch or component suffices
- Ship native-only APIs (haptics, SF Symbols-only paths) without a web fallback or guard
- Assume mobile safe-area / tab insets — web tab bar and viewport differ (`app-tabs.web.tsx` pattern)

### Pitfalls

`Platform.OS === "web"` in hot paths when `EXPO_OS` compile-time check is enough; forgetting to run `pnpm web` after navigation or layout changes.

### Checklist

`pnpm web` smoke test · layout at wide viewport · links and tabs work in the browser
