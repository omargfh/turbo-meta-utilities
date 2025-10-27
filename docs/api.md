# API Reference

Complete API documentation for turbo-meta-utilities.

## Table of Contents

- [Turbo](#turbo)
- [TurboPackage](#turbopackage)
- [TurboApp](#turboapp)
- [PackageJson](#packagejson)
- [ExportTarget](#exporttarget)
- [GlobResolver](#globresolver)
- [IFileSystemAdapter](#ifilesystemadapter)
- [Types](#types)

## Turbo

Main entry point for working with Turborepo monorepos.

### Constructor

```typescript
constructor(monorepoRoot: string, fileSystem?: IFileSystemAdapter)
```

Creates a new Turbo instance for the specified monorepo.

**Parameters:**

- `monorepoRoot` - Absolute path to monorepo root directory
- `fileSystem` - Optional file system adapter (for testing)

**Throws:**

- `Error` - If monorepo root doesn't exist
- `Error` - If path is not a directory
- `Error` - If turbo.json not found in root

**Example:**

```typescript
const turbo = new Turbo('/Users/me/my-monorepo');
```

### Properties

#### `packagesPath: string`

Returns the absolute path to the packages directory.

**Example:**

```typescript
console.log(turbo.packagesPath);
// Output: /Users/me/my-monorepo/packages
```

#### `appsPath: string`

Returns the absolute path to the apps directory.

**Example:**

```typescript
console.log(turbo.appsPath);
// Output: /Users/me/my-monorepo/apps
```

#### `packages: TurboPackage[]`

Returns an array of all packages in the packages directory. Returns empty array if directory doesn't exist.

**Example:**

```typescript
const packages = turbo.packages;
packages.forEach((pkg) => {
	console.log(`${pkg.name}@${pkg.json.version}`);
});
```

#### `apps: TurboApp[]`

Returns an array of all apps in the apps directory. Returns empty array if directory doesn't exist.

**Example:**

```typescript
const apps = turbo.apps;
console.log(`Found ${apps.length} apps`);
```

#### `allWorkspaces: (TurboPackage | TurboApp)[]`

Returns combined array of all packages and apps.

**Example:**

```typescript
const all = turbo.allWorkspaces;
console.log(`Total workspaces: ${all.length}`);
```

### Methods

#### `getPackageByName(packageName: string): TurboPackage | undefined`

Finds and returns a package by its name field in package.json.

**Parameters:**

- `packageName` - Name of the package to find

**Returns:**

- `TurboPackage` if found, `undefined` otherwise

**Example:**

```typescript
const uiKit = turbo.getPackageByName('@myorg/ui-kit');
if (uiKit) {
	console.log(`Found at: ${uiKit.path}`);
}
```

#### `getAppByName(appName: string): TurboApp | undefined`

Finds and returns an app by its name field in package.json.

**Parameters:**

- `appName` - Name of the app to find

**Returns:**

- `TurboApp` if found, `undefined` otherwise

**Example:**

```typescript
const webapp = turbo.getAppByName('webapp');
if (webapp) {
	console.log('App scripts:', webapp.json.scripts);
}
```

#### `getWorkspaceByName(name: string): TurboPackage | TurboApp | undefined`

Finds and returns any workspace (package or app) by name.

**Parameters:**

- `name` - Name of the workspace to find

**Returns:**

- `TurboPackage | TurboApp` if found, `undefined` otherwise

**Example:**

```typescript
const workspace = turbo.getWorkspaceByName('my-workspace');
console.log(`Type: ${workspace instanceof TurboApp ? 'app' : 'package'}`);
```

---

## TurboPackage

Represents a package in the monorepo's packages directory.

### Constructor

```typescript
constructor(path: string, fileSystem?: IFileSystemAdapter)
```

Creates a new TurboPackage instance.

**Parameters:**

- `path` - Absolute path to package directory
- `fileSystem` - Optional file system adapter

**Throws:**

- `Error` - If path doesn't exist
- `Error` - If path is not a directory
- `Error` - If package.json not found

### Properties

#### `name: string`

Package name from package.json.

#### `path: string`

Absolute path to the package directory.

#### `json: PackageJson`

Parsed package.json instance.

### Methods

#### `resolveImport(importPath: string): ExportTarget | undefined`

Resolves an import path using the package's exports field. Returns absolute paths.

**Parameters:**

- `importPath` - Import path to resolve (e.g., ".", "./utils")

**Returns:**

- `ExportTarget` with absolute paths if found, `undefined` otherwise

**Example:**

```typescript
const pkg = turbo.getPackageByName('my-package');
const target = pkg?.resolveImport('./utils');
if (target) {
	console.log('Import path:', target.import);
	console.log('Types path:', target.types);
}
```

#### `resolvePath(relativePath: string): string`

Converts a relative path to absolute path within the package.

**Parameters:**

- `relativePath` - Relative path within package

**Returns:**

- Absolute path

**Example:**

```typescript
const srcPath = pkg.resolvePath('src/index.ts');
// Returns: /absolute/path/to/package/src/index.ts
```

---

## TurboApp

Represents an app in the monorepo's apps directory. Has identical API to TurboPackage.

See [TurboPackage](#turbopackage) for full API documentation.

---

## PackageJson

Represents a parsed and validated package.json file.

### Constructor

```typescript
constructor(path: string, fileSystem?: IFileSystemAdapter)
```

Creates a new PackageJson instance.

**Parameters:**

- `path` - Absolute path to package.json file
- `fileSystem` - Optional file system adapter

**Throws:**

- `Error` - If package.json doesn't exist
- `Error` - If JSON is malformed
- `Error` - If validation fails (missing required fields)

### Properties

All properties are readonly getters:

#### `name: string`

Package name (required).

#### `version?: string`

Package version.

#### `main?: string`

Main entry point.

#### `module?: string`

ESM entry point.

#### `types?: string`

TypeScript types entry point.

#### `dependencies?: Record<string, string>`

Production dependencies.

#### `devDependencies?: Record<string, string>`

Development dependencies.

#### `peerDependencies?: Record<string, string>`

Peer dependencies.

#### `scripts?: Record<string, string>`

NPM scripts.

#### `exports?: Record<string, ExportTargetData>`

Package exports configuration.

### Methods

#### `resolveImport(importPath: string): ExportTarget | undefined`

Resolves import path using exports field (returns relative paths).

**Parameters:**

- `importPath` - Import path to resolve

**Returns:**

- `ExportTarget` with relative paths if found, `undefined` otherwise

**Example:**

```typescript
const pkgJson = new PackageJson('/path/to/package.json');
const target = pkgJson.resolveImport('.');
console.log(target?.default); // "./dist/index.js"
```

---

## ExportTarget

Represents a resolved export target from package.json exports field.

### Constructor

```typescript
constructor(target: ExportTargetData)
```

**Parameters:**

- `target` - Export target data (string or object)

**Throws:**

- `Error` - If target object has no valid fields

### Properties

#### `default: string`

Default export path. Falls back to first available field.

#### `import?: string`

ESM import path.

#### `require?: string`

CommonJS require path.

#### `types?: string`

TypeScript types path.

#### `target: ExportTargetData`

Original target data.

**Example:**

```typescript
const target = new ExportTarget({
	import: './dist/index.mjs',
	require: './dist/index.cjs',
	types: './dist/index.d.ts',
});

console.log(target.import); // "./dist/index.mjs"
console.log(target.default); // "./dist/index.mjs"
```

---

## GlobResolver

Resolves import paths using glob pattern matching.

### Constructor

```typescript
constructor(patterns: Record<string, ExportTargetData>)
```

**Parameters:**

- `patterns` - Map of glob patterns to export targets

### Properties

#### `patterns: Record<string, ExportTargetData>`

The glob patterns to match against.

### Methods

#### `resolveImport(importPath: string): ExportTarget | undefined`

Resolves an import path by matching against glob patterns.

**Parameters:**

- `importPath` - Import path to resolve

**Returns:**

- `ExportTarget` if pattern matches, `undefined` otherwise

**Example:**

```typescript
const resolver = new GlobResolver({
	'.': './dist/index.js',
	'./*': './dist/*.js',
	'./utils/*': './dist/utils/*.js',
});

const target = resolver.resolveImport('./utils/format');
// Matches "./*" or "./utils/*" pattern
```

---

## IFileSystemAdapter

Interface for file system operations. Enables dependency injection for testing.

### Methods

#### `existsSync(path: string): boolean`

Checks if path exists.

#### `isDirectory(path: string): boolean`

Checks if path is a directory.

#### `readFileSync(path: string, encoding: BufferEncoding): string`

Reads file content as string.

#### `readdirSync(path: string): string[]`

Reads directory contents.

### Implementation Example

```typescript
import type { IFileSystemAdapter } from 'turbo-meta-utilities';

const mockFs: IFileSystemAdapter = {
	existsSync: (path) => {
		// Custom logic
		return true;
	},
	isDirectory: (path) => true,
	readFileSync: (path, encoding) => {
		// Return mock data
		return JSON.stringify({ name: 'mock-package' });
	},
	readdirSync: (path) => ['package1', 'package2'],
};
```

---

## Types

### ExportTargetData

```typescript
type ExportTargetData =
	| string
	| {
			default?: string;
			import?: string;
			require?: string;
			types?: string;
	  };
```

Export target from package.json exports field.

### PackageJsonData

```typescript
type PackageJsonData = {
	name: string;
	version?: string;
	files?: string[];
	main?: string;
	module?: string;
	types?: string;
	scripts?: Record<string, string>;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	exports?: Record<string, ExportTargetData>;
};
```

Validated package.json data structure.

---

## Error Handling

All classes throw descriptive errors for invalid inputs:

```typescript
try {
	const turbo = new Turbo('/invalid/path');
} catch (error) {
	console.error(error.message);
	// "Monorepo root does not exist: /invalid/path"
}

try {
	const pkg = new TurboPackage('/path/without/package.json');
} catch (error) {
	console.error(error.message);
	// "package.json not found in package path: /path/without/package.json"
}
```

Always handle errors appropriately when working with file system operations.
