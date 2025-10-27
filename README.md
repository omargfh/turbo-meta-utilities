# Turbo Meta Utilities

A TypeScript utility library for working with Turborepo monorepos. Provides tools to read, parse, and interact with packages, apps, and package.json metadata in your Turbo-powered monorepo.

## Features

- 🚀 Full TypeScript support with type definitions
- 📦 Read and parse package.json files with validation
- 🎯 Access packages and apps in your monorepo
- 🔍 Resolve package exports and imports
- 🧪 100% test coverage
- 🏗️ Built with SOLID principles
- 🔄 Dependency injection support for testing

## Installation

```bash
npm install turbo-meta-utilities
```

## Quick Start

```typescript
import { Turbo } from 'turbo-meta-utilities';

// Initialize with your monorepo root
const turbo = new Turbo('/path/to/monorepo');

// Get all packages
const packages = turbo.packages;
console.log(packages.map((p) => p.name));

// Get all apps
const apps = turbo.apps;
console.log(apps.map((a) => a.name));

// Find a specific package
const myPackage = turbo.getPackageByName('my-package');
if (myPackage) {
	console.log(myPackage.json.version);
}

// Resolve import paths
const exportTarget = myPackage?.resolveImport('.');
console.log(exportTarget?.default); // Absolute path to default export
```

## API Documentation

### Turbo

Main class for interacting with a Turborepo monorepo.

#### Constructor

```typescript
new Turbo(monorepoRoot: string, fileSystem?: IFileSystemAdapter)
```

- `monorepoRoot`: Absolute path to the monorepo root (must contain `turbo.json`)
- `fileSystem`: Optional file system adapter for testing (defaults to Node.js fs)

**Throws:**

- Error if monorepo root doesn't exist
- Error if path is not a directory
- Error if `turbo.json` not found

#### Properties

- `packagesPath: string` - Path to the packages directory
- `appsPath: string` - Path to the apps directory
- `packages: TurboPackage[]` - Array of all packages
- `apps: TurboApp[]` - Array of all apps
- `allWorkspaces: (TurboPackage | TurboApp)[]` - Combined packages and apps

#### Methods

**`getPackageByName(packageName: string): TurboPackage | undefined`**

Find a package by its name field in package.json.

**`getAppByName(appName: string): TurboApp | undefined`**

Find an app by its name field in package.json.

**`getWorkspaceByName(name: string): TurboPackage | TurboApp | undefined`**

Find any workspace (package or app) by name.

### TurboPackage / TurboApp

Represents a package or app in the monorepo. Both classes extend `BasePackage` and have identical APIs.

#### Constructor

```typescript
new TurboPackage(path: string, fileSystem?: IFileSystemAdapter)
new TurboApp(path: string, fileSystem?: IFileSystemAdapter)
```

- `path`: Absolute path to the package/app directory
- `fileSystem`: Optional file system adapter

**Throws:**

- Error if path doesn't exist
- Error if path is not a directory
- Error if `package.json` not found

#### Properties

- `name: string` - Package name from package.json
- `path: string` - Absolute path to the package
- `json: PackageJson` - Parsed package.json data

#### Methods

**`resolveImport(importPath: string): ExportTarget | undefined`**

Resolves an import path using the package's exports field. Returns absolute paths.

```typescript
const target = package.resolveImport('.');
console.log(target?.default); // /absolute/path/to/dist/index.js
console.log(target?.types); // /absolute/path/to/dist/index.d.ts
```

**`resolvePath(relativePath: string): string`**

Converts a relative path to an absolute path within the package.

```typescript
const srcPath = package.resolvePath('src/index.ts');
// Returns: /absolute/path/to/package/src/index.ts
```

### PackageJson

Represents a parsed and validated package.json file.

#### Constructor

```typescript
new PackageJson(path: string, fileSystem?: IFileSystemAdapter)
```

**Throws:**

- Error if package.json doesn't exist
- Error if JSON is invalid
- Error if package.json doesn't match schema (missing name, etc.)

#### Properties

All standard package.json fields are exposed as getters:

- `name: string`
- `version?: string`
- `main?: string`
- `module?: string`
- `types?: string`
- `dependencies?: Record<string, string>`
- `devDependencies?: Record<string, string>`
- `peerDependencies?: Record<string, string>`
- `scripts?: Record<string, string>`
- `exports?: Record<string, ExportTargetData>`

#### Methods

**`resolveImport(importPath: string): ExportTarget | undefined`**

Resolves an import path using the exports field (relative paths).

### ExportTarget

Represents a resolved export target from package.json.

#### Properties

- `default: string` - Default export path
- `import?: string` - ESM import path
- `require?: string` - CommonJS require path
- `types?: string` - TypeScript types path

### GlobResolver

Resolves import paths using glob patterns from exports field.

```typescript
const resolver = new GlobResolver({
	'.': './dist/index.js',
	'./*': './dist/*.js',
});

const target = resolver.resolveImport('./utils');
```

## Examples

### Working with Packages

```typescript
import { Turbo } from 'turbo-meta-utilities';

const turbo = new Turbo(process.cwd());

// List all packages with their versions
for (const pkg of turbo.packages) {
	console.log(`${pkg.name}@${pkg.json.version}`);
}

// Get dependencies of a package
const myPkg = turbo.getPackageByName('my-package');
if (myPkg) {
	console.log('Dependencies:', myPkg.json.dependencies);
	console.log('Dev Dependencies:', myPkg.json.devDependencies);
}
```

### Working with Apps

```typescript
import { Turbo } from 'turbo-meta-utilities';

const turbo = new Turbo(process.cwd());

// List all apps
console.log(
	'Apps:',
	turbo.apps.map((a) => a.name)
);

// Get an app's scripts
const webapp = turbo.getAppByName('webapp');
if (webapp) {
	console.log('Available scripts:', Object.keys(webapp.json.scripts || {}));
}
```

### Resolving Exports

```typescript
const pkg = turbo.getPackageByName('ui-components');
if (pkg) {
	// Resolve specific exports
	const mainExport = pkg.resolveImport('.');
	const utilsExport = pkg.resolveImport('./utils');

	console.log('Main:', mainExport?.default);
	console.log('Utils:', utilsExport?.default);
}
```

### Testing with Mock File System

```typescript
import { Turbo } from 'turbo-meta-utilities';
import type { IFileSystemAdapter } from 'turbo-meta-utilities';

const mockFs: IFileSystemAdapter = {
	existsSync: (path) => true,
	isDirectory: (path) => true,
	readFileSync: (path) => JSON.stringify({ name: 'test' }),
	readdirSync: (path) => ['package1', 'package2'],
};

const turbo = new Turbo('/fake/root', mockFs);
// Use turbo in tests...
```

## Architecture

This library follows SOLID principles:

- **Single Responsibility**: Each class has a focused purpose
- **Open/Closed**: Extensible through inheritance and composition
- **Liskov Substitution**: `TurboPackage` and `TurboApp` are interchangeable
- **Interface Segregation**: Small, focused interfaces
- **Dependency Inversion**: File system operations abstracted through `IFileSystemAdapter`

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (for development)

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build
npm run build
```

## License

MIT

## Contributing

Contributions are welcome! Please ensure:

1. Tests are passing (`npm test`)
2. Code coverage remains high (`npm run test:coverage`)
3. TypeScript compiles without errors (`npm run build`)
4. Follow existing code style and architecture

## Related

- [Turborepo](https://turbo.build/repo)
- [Package.json Exports](https://nodejs.org/api/packages.html#exports)
