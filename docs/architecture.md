# Architecture & Design

This document explains the architecture and design decisions behind turbo-meta-utilities.

## Table of Contents

- [Overview](#overview)
- [SOLID Principles](#solid-principles)
- [Architecture Patterns](#architecture-patterns)
- [Class Hierarchy](#class-hierarchy)
- [Error Handling](#error-handling)
- [Testing Strategy](#testing-strategy)
- [Performance Considerations](#performance-considerations)

## Overview

turbo-meta-utilities is designed to provide a robust, type-safe interface for working with Turborepo monorepos. The library emphasizes:

- **Type Safety**: Full TypeScript support with strict mode
- **Validation**: Zod schemas for runtime validation
- **Testability**: Dependency injection for easy mocking
- **Maintainability**: SOLID principles and DRY code
- **Developer Experience**: Clear errors and comprehensive documentation

## SOLID Principles

### Single Responsibility Principle (SRP)

Each class has a single, well-defined responsibility:

- **`Turbo`**: Manages monorepo-level operations (finding packages/apps)
- **`TurboPackage`/`TurboApp`**: Represents individual workspaces
- **`PackageJson`**: Parses and validates package.json files
- **`ExportTarget`**: Represents export configurations
- **`GlobResolver`**: Resolves import paths using patterns
- **`FileSystemAdapter`**: Abstracts file system operations

### Open/Closed Principle (OCP)

The library is open for extension but closed for modification:

- `BasePackage` abstract class allows extension for new workspace types
- `IFileSystemAdapter` interface allows custom file system implementations
- Export system is extensible through `ExportTarget` and `GlobResolver`

```typescript
// Easy to extend with new workspace types
class TurboWorkflow extends BasePackage {
	// Custom workflow-specific logic
}
```

### Liskov Substitution Principle (LSP)

`TurboPackage` and `TurboApp` both extend `BasePackage` and are fully interchangeable:

```typescript
function processWorkspace(workspace: BasePackage) {
	// Works with both TurboPackage and TurboApp
	console.log(workspace.name);
	console.log(workspace.resolvePath('src'));
}
```

### Interface Segregation Principle (ISP)

`IFileSystemAdapter` provides only the methods needed for file system operations:

```typescript
interface IFileSystemAdapter {
	existsSync(path: string): boolean;
	isDirectory(path: string): boolean;
	readFileSync(path: string, encoding: BufferEncoding): string;
	readdirSync(path: string): string[];
}
```

No unnecessary methods or dependencies.

### Dependency Inversion Principle (DIP)

High-level modules depend on abstractions (interfaces), not concrete implementations:

- All classes accept `IFileSystemAdapter` parameter
- Default to `DefaultFileSystemAdapter` implementation
- Easy to inject mock implementations for testing

```typescript
// Production
const turbo = new Turbo(path); // Uses real file system

// Testing
const turbo = new Turbo(path, mockFs); // Uses mock file system
```

## Architecture Patterns

### Dependency Injection

All classes accept optional file system adapter:

```typescript
class Turbo {
	constructor(monorepoRoot: string, fileSystem: IFileSystemAdapter = FileSystemAdapter) {
		this.fs = fileSystem;
	}
}
```

Benefits:

- Testability: Easy to inject mocks
- Flexibility: Can replace file system implementation
- Separation of concerns: File I/O is abstracted

### Factory Pattern

The `_getItemsFromDirectory` method acts as a factory:

```typescript
private _getItemsFromDirectory<T extends BasePackage>(
  dirPath: string,
  ItemClass: new (path: string, fs: IFileSystemAdapter) => T
): T[] {
  // Creates instances of TurboPackage or TurboApp
}
```

Benefits:

- DRY: Single method for packages and apps
- Type-safe: Generic constraints ensure correctness
- Extensible: Easy to add new workspace types

### Proxy Pattern

`resolveImport` uses Proxy to convert relative paths to absolute:

```typescript
return new Proxy(exportTarget, {
	get: (target, prop) => {
		if (prop in target) {
			return path.join(this.path, (target as any)[prop]);
		}
		return undefined;
	},
});
```

Benefits:

- Transparent transformation
- Maintains ExportTarget interface
- No need to create new classes

### Template Method Pattern

`BasePackage` provides template for workspace operations:

```typescript
abstract class BasePackage {
	constructor(path: string) {
		// Validate path
		// Load package.json
		// Initialize properties
	}

	resolveImport(importPath: string): ExportTarget | undefined {
		// Common implementation
	}

	resolvePath(relativePath: string): string {
		// Common implementation
	}
}
```

## Class Hierarchy

```
IFileSystemAdapter (interface)
  └── DefaultFileSystemAdapter

BasePackage (abstract)
  ├── TurboPackage
  └── TurboApp

Turbo (main entry point)
  ├── uses FileSystemAdapter
  └── creates TurboPackage/TurboApp instances

PackageJson
  ├── uses FileSystemAdapter
  └── validates with Zod schemas

ExportTarget
  └── created by GlobResolver

GlobResolver
  └── uses minimatch for pattern matching
```

## Error Handling

### Validation Errors

Zod schemas provide detailed validation errors:

```typescript
const PackageJsonSchema = z.object({
	name: z.string(),
	version: z.string().optional(),
	// ... more fields
});
```

### Custom Errors

Descriptive error messages for common issues:

```typescript
if (!fs.existsSync(monorepoRoot)) {
	throw new Error(`Monorepo root does not exist: ${monorepoRoot}`);
}

if (!fs.existsSync(turboConfigPath)) {
	throw new Error(`turbo.json not found in monorepo root: ${turboConfigPath}`);
}
```

### Error Propagation

Errors propagate with context:

1. File system errors (Node.js)
2. Validation errors (Zod)
3. Business logic errors (custom)

Users can catch and handle appropriately.

## Testing Strategy

### Unit Tests

Each class has comprehensive unit tests:

- **Filesystem**: Tests all adapter methods
- **PackageJson**: Tests parsing, validation, and getters
- **ExportTarget**: Tests string and object targets
- **GlobResolver**: Tests pattern matching
- **TurboPackage/TurboApp**: Tests construction and methods
- **Turbo**: Tests all public methods and edge cases

### Mock File System

Tests use mock file system for isolation:

```typescript
const mockFs: IFileSystemAdapter = {
	existsSync: vi.fn(),
	isDirectory: vi.fn(),
	readFileSync: vi.fn(),
	readdirSync: vi.fn(),
};
```

### Edge Cases Covered

- Missing directories (packages or apps don't exist)
- Invalid paths
- Malformed JSON
- Missing required fields
- Non-existent imports
- Circular references
- Empty directories
- Non-directory files in packages/apps

### Coverage Thresholds

```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 75,
    statements: 80,
  },
}
```

Current coverage: **99%+**

## Performance Considerations

### Lazy Loading

Properties like `packages` and `apps` are computed on access:

```typescript
get packages(): TurboPackage[] {
  return this._getItemsFromDirectory(this.packagesPath, TurboPackage);
}
```

No caching by default - always fresh data.

### Minimal File I/O

- Only reads package.json files
- Doesn't traverse deep directory structures
- Validates directory structure before reading

### Efficient Glob Matching

Uses `minimatch` library for efficient pattern matching:

```typescript
if (minimatch(importPath, pattern)) {
	return new ExportTarget(target);
}
```

### Path Resolution

Uses Node.js `path` module for efficient, cross-platform path operations:

```typescript
path.resolve(monorepoRoot);
path.join(this.path, relativePath);
```

## Future Enhancements

Potential improvements while maintaining current architecture:

1. **Caching**: Optional caching for frequently accessed data
2. **Async API**: Async versions of all methods
3. **Watch Mode**: File system watchers for live updates
4. **Parallel Processing**: Concurrent package reading
5. **Plugin System**: Custom workspace types via plugins
6. **Validation Hooks**: Custom validation logic
7. **Transformation Hooks**: Custom path transformations

All can be added without breaking current API.

## Design Trade-offs

### Synchronous API

**Chosen**: Synchronous methods
**Trade-off**: Blocking I/O
**Rationale**: Simpler API, most use cases are startup-time operations

### No Caching

**Chosen**: Always read fresh data
**Trade-off**: Repeated file I/O
**Rationale**: Ensures data accuracy, simpler implementation

### Strict Validation

**Chosen**: Zod schemas with strict validation
**Trade-off**: May reject some edge cases
**Rationale**: Type safety and error prevention

### TypeScript .js Extensions

**Chosen**: Import with `.js` extensions
**Trade-off**: Looks odd in TypeScript
**Rationale**: ESM standard, works with Node.js module resolution

## Best Practices

When using this library:

1. **Handle Errors**: Always wrap in try-catch
2. **Validate Paths**: Use absolute paths
3. **Test with Mocks**: Use `IFileSystemAdapter` for testing
4. **Type Safety**: Let TypeScript infer types
5. **Documentation**: Read API docs for details

When extending:

1. **Extend BasePackage**: For new workspace types
2. **Implement IFileSystemAdapter**: For custom file systems
3. **Follow SOLID**: Maintain single responsibilities
4. **Add Tests**: Comprehensive test coverage
5. **Document**: Update API documentation

---

For questions or suggestions, please open an issue on GitHub.
