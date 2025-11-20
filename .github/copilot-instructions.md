# Copilot Instructions for js-object-to-ts-interfaces

## Project Overview

This is a **runtime TypeScript interface generator** that converts JavaScript objects to `.d.ts` definitions in the browser console. It consists of a monorepo with:

- **Root (`main.ts`)**: Core `GetTypeGenerator` class with extensible event handler pipeline
- **`@js-to-ts-interfaces/core`**: Shared utilities (native function detection, numeric key checks, clean iframe creation, global diff analysis)
- **`@js-to-ts-interfaces/search-key`**: Browser tool to inject `$searchKey()` for fuzzy-searching global/Vue/React mount points before generating interfaces

**Key Design**: Event-driven architecture using handler pattern for extensibility. Objects are recursively traversed with circular reference protection, and handlers intercept at `GetTypeTop` (per-property) or `GetTypeReturn` (post-processing) events.

## Architecture Patterns

### Event Handler Pipeline (核心擴展機制)

All customization flows through `EventHandlerBase<T>` implementations in `eventHandlers.ts`:

```typescript
interface EventHandlerBase<EventArg> {
  readonly on: EventType; // GetTypeTop | GetTypeReturn
  do(env: EventHandlerEnvType, arg: EventArg): EventHandlerReturn;
}
```

**Built-in handlers** (defined in `main.ts` constructor):

- `SkipLoopRef`: Detects self-referencing properties to prevent infinite loops
- `JQueryHandler`: Shallow-depth (≤1) detection of `jQuery`/`$` to emit `JQueryStatic` type
- `SkipProperties`: Blacklists browser globals (`window`, `document`, `navigator`, etc.) and the generator class itself
- `ReturnHandler`: String replacement post-processing (e.g., deduplicates jQuery property declarations)

**Return values control flow**:

- `FnActions.Continue`: Skip this property, move to next
- `FnActions.None`: No action, continue normal processing
- `[FnActions.Eval, code]`: Execute code string (restricted to `interfaceStr+=...` patterns for safety)
- `[FnActions.Return, string]`: Override return value immediately
- `[FnActions.SetReturn, string]`: Modify return value in `GetTypeReturn` handlers

### Monorepo Structure

- **Shared path alias**: `@js-to-ts-interfaces/core` mapped in `tsconfig.base.json` enables cross-package imports
- **Build order**: `pnpm build` → packages recursively → root. Each package has `build` (tsc) + `bundle` (esbuild IIFE) scripts
- **Browser delivery**: Root `main.js` and package bundles (`dist/bundle.js`) are IIFE-wrapped for `<script>` tag usage

### Recursive Traversal Logic (`main.ts`)

1. **Depth tracking**: `this.depth` increments on recursion, used by handlers for level-specific logic (e.g., jQuery shallow detection)
2. **Path tracking**: `this.path` array maintains property path for debugging (`[":root:", "user", "address"]`)
3. **Circular ref protection**: `this.visited` WeakSet prevents revisiting same object reference
4. **Type inference**:
   - Primitives: Direct `typeof` → `"string"`, `"number"`, etc.
   - Native functions: Detected via `/\[native code\]/` regex → output as `"native-code"` string literal
   - User functions: Parse `toString()` with regex to extract `(param1, param2)` → `(...args) => unknown`
   - Arrays: Heuristic checks if all keys are numeric (`isNumericKey()` from core) → adds `/* may be Array */` hint if `printHint: true`

## Development Workflows

### Build Commands

```powershell
pnpm build           # Build all packages + root (recommended)
pnpm build:core      # Only @js-to-ts-interfaces/core
pnpm build:searchKey # Only @js-to-ts-interfaces/search-key
pnpm run build:root  # Only root main.ts
```

**Build outputs**:

- `.js` + `.d.ts` + `.js.map` at package roots and workspace root
- `dist/bundle.js` (IIFE) in each package for standalone browser usage

### Testing in Browser Console

1. Copy contents of `main.js` (or `packages/searchKey/dist/bundle.js` for search functionality)
2. Paste into browser DevTools console
3. Run examples:

```javascript
// Generate interface for any object
const gen = new GetTypeGenerator({ printHint: false, download: true });
gen.generate(window, "Window"); // Triggers .d.ts download

// With searchKey: fuzzy-search globals/framework mounts
await injectSearchKey();
const results = window.$searchKey("store", true); // fuzzy mode
if (results.length) {
  gen.generate(results[0].code, "Store");
}
```

### Adding Custom Event Handlers

**Pattern**: Extend `EventHandlerBase` and register via `AddEventHandler()`:

```typescript
class SkipPrivate implements EventHandlerBase<EventHandlerGetTypeTopArgType> {
  on = EventType.GetTypeTop;
  do(env, arg) {
    if (arg.key.startsWith("_")) return FnActions.Continue; // Skip private props
    return FnActions.None;
  }
}

const gen = new GetTypeGenerator({ download: false });
gen.AddEventHandler(new SkipPrivate());
```

**Handler registration order matters**: Handlers execute sequentially. Place `Return`/`Continue` logic early to short-circuit.

## Project-Specific Conventions

### Type Inference Rules

- **Function params**: Extracted via regex from `fn.toString()`, but return type always `unknown` (runtime limitation)
- **Native functions**: Output literal type `"native-code"` instead of expanding (e.g., `Array.push` → `"native-code"`)
- **jQuery special handling**: Matches exact `toString()` output `"function(e,t){return new w.fn.init(e,t)}"` at depth ≤1 → `JQueryStatic`
- **Circular refs**: Output as `any /* circular */` if `printHint: true`, else just `any`

### Naming Conventions

- **Enums**: `SCREAMING_SNAKE_CASE` for constants (`MAX_DEPTH`, `IGNORE_PROPS`)
- **Types**: `PascalCase` with descriptive suffixes (`EventHandlerArgType`, `GetType_obj_type`)
- **Private methods**: `private` keyword + no underscore prefix (TypeScript style)
- **Config objects**: Destructured with defaults in constructor (`{ printHint: false, download: true }`)

### Import Patterns

- **Workspace packages**: Always use path alias `@js-to-ts-interfaces/core` (never relative paths across package boundaries)
- **eventHandlers.ts**: Root-level handlers module imported into `main.ts` with destructured imports
- **Core utilities**: Import specific functions (`{ isNativeFunction, isNumericKey }`) from core package

## Critical Integration Points

### Core Package Utilities (`packages/core/main.ts`)

- `isNumericKey(key)`: Detects if property key is pure digit (for array heuristics)
- `isNativeFunction(fn)`: Regex checks for `[native code]` in function string
- `createCleanIframe()`: Creates hidden iframe for pristine `window` environment → used by searchKey
- `diffGlobalKeys(targetWin, cleanWin)`: Compares two window objects to extract user-added globals (excludes numeric keys)

### SearchKey Package (`packages/searchKey/main.ts`)

- **Injection**: `injectSearchKey()` async function creates clean iframe, diffs globals, and builds searchable index
- **Depth control**: `MAX_DEPTH` (default `Infinity`) limits recursion during indexing—modifying impacts memory/time
- **Framework detection**: Automatically detects Vue (`__ob__`, `$options`) and React (`memoizedState`, `updateQueue`) mount points
- **Fuzzy matching**: Uses simple substring matching when `fuzzy: true` parameter passed to `$searchKey()`
- **Return format**: `{ path: string, code: any }[]` where `path` is dot-notation string and `code` is object reference

### Download Mechanism (`main.ts`)

When `download: true` and at root depth (depth === 0 after generation):

1. Creates `<a>` element with `data:text/plain` href
2. Sets `download="${InterfaceName}.d.ts"` attribute
3. Programmatically clicks link → triggers browser download
4. Cleans up link element

## Security & Limitations

- **Eval safety**: Handler `FnActions.Eval` only accepts `interfaceStr+=...` patterns (basic sandboxing via string check)
- **Browser-only**: Code directly accesses `window`, `document`, DOM APIs—not Node.js compatible without mocking
- **Return type inference impossible**: Runtime cannot determine function return types → always `unknown`
- **jQuery version-specific**: Handler matches exact jQuery v3.x `toString()` format—may fail on other versions
- **Own properties only**: Traversal uses `Object.getOwnPropertyNames()` + `hasOwnProperty` checks—doesn't walk prototype chain

## Avoid These Mistakes

❌ **Don't** use relative imports between packages (`../../core/main` → use `@js-to-ts-interfaces/core`)  
❌ **Don't** modify `interfaceStr` outside `Eval` handlers (breaks handler isolation)  
❌ **Don't** return `FnActions.Return` from `GetTypeTop` handlers without string value (type error)  
❌ **Don't** assume handler execution order—explicitly set via `EventHandlerList` setter if order-dependent  
❌ **Don't** pass untrusted code to `FnActions.Eval` (basic check exists but not bulletproof)

✅ **Do** use `AddEventHandler()` to append handlers (preserves built-in handlers)  
✅ **Do** check `env.depth` for level-specific logic (e.g., top-level-only special handling)  
✅ **Do** test handlers with `printHint: true` for debugging output  
✅ **Do** run `pnpm build` after modifying any `.ts` file (bundles are not auto-generated)  
✅ **Do** use `console.debug()` for handler logging (follows existing pattern)

## Language Context

- **Primary documentation language**: Traditional Chinese (繁體中文) in README and comments
- **Code identifiers**: English (standard for TypeScript/JavaScript)
- **User-facing output**: TypeScript interface syntax (English keywords)

When generating documentation or comments, prefer Traditional Chinese to match project style. Code logic and identifiers should remain in English.
