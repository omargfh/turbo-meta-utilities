# Usage Examples

Practical examples for common use cases with turbo-meta-utilities.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Working with Packages](#working-with-packages)
- [Working with Apps](#working-with-apps)
- [Resolving Imports](#resolving-imports)
- [Analyzing Dependencies](#analyzing-dependencies)
- [Build Tools Integration](#build-tools-integration)
- [Testing](#testing)

## Basic Setup

### Initialize Turbo Instance

```typescript
import { Turbo } from 'turbo-meta-utilities';

// From current directory
const turbo = new Turbo(process.cwd());

// From specific path
const turbo = new Turbo('/Users/me/my-monorepo');
```

### Error Handling

```typescript
import { Turbo } from 'turbo-meta-utilities';

try {
	const turbo = new Turbo(process.cwd());
	console.log('Initialized successfully');
} catch (error) {
	if (error instanceof Error) {
		if (error.message.includes('turbo.json not found')) {
			console.error('Not a Turborepo project');
		} else {
			console.error('Initialization error:', error.message);
		}
	}
}
```

## Working with Packages

### List All Packages

```typescript
const turbo = new Turbo(process.cwd());

console.log('Packages in monorepo:');
turbo.packages.forEach((pkg) => {
	console.log(`- ${pkg.name} (${pkg.json.version || 'no version'})`);
});
```

### Find Specific Package

```typescript
const pkg = turbo.getPackageByName('@myorg/ui-components');

if (pkg) {
	console.log('Package found!');
	console.log('Location:', pkg.path);
	console.log('Main entry:', pkg.json.main);
	console.log('TypeScript types:', pkg.json.types);
} else {
	console.log('Package not found');
}
```

### Check Package Scripts

```typescript
const pkg = turbo.getPackageByName('my-package');

if (pkg?.json.scripts) {
	console.log('Available scripts:');
	Object.entries(pkg.json.scripts).forEach(([name, command]) => {
		console.log(`  ${name}: ${command}`);
	});
}
```

### Iterate Over All Packages

```typescript
for (const pkg of turbo.packages) {
	console.log(`\n${pkg.name}`);
	console.log(`  Path: ${pkg.path}`);
	console.log(`  Version: ${pkg.json.version || 'N/A'}`);
	console.log(`  Dependencies: ${Object.keys(pkg.json.dependencies || {}).length}`);
}
```

## Working with Apps

### List All Apps

```typescript
const turbo = new Turbo(process.cwd());

console.log('Apps in monorepo:');
turbo.apps.forEach((app) => {
	console.log(`- ${app.name}`);
});
```

### Get App Configuration

```typescript
const webapp = turbo.getAppByName('webapp');

if (webapp) {
	console.log('App:', webapp.name);
	console.log('Dependencies:', webapp.json.dependencies);
	console.log('Dev Dependencies:', webapp.json.devDependencies);

	// Check for specific dependency
	if (webapp.json.dependencies?.['react']) {
		console.log('React version:', webapp.json.dependencies['react']);
	}
}
```

### List All Workspaces (Packages + Apps)

```typescript
const turbo = new Turbo(process.cwd());

console.log(`Total workspaces: ${turbo.allWorkspaces.length}`);

turbo.allWorkspaces.forEach((workspace) => {
	const type = workspace instanceof TurboApp ? 'app' : 'package';
	console.log(`[${type}] ${workspace.name}`);
});
```

## Resolving Imports

### Resolve Package Exports

```typescript
const pkg = turbo.getPackageByName('ui-components');

if (pkg) {
	// Resolve root import
	const mainExport = pkg.resolveImport('.');
	console.log('Main export:', mainExport?.default);
	console.log('ESM import:', mainExport?.import);
	console.log('Types:', mainExport?.types);

	// Resolve subpath
	const utilsExport = pkg.resolveImport('./utils');
	console.log('Utils export:', utilsExport?.default);
}
```

### Resolve All Exports

```typescript
const pkg = turbo.getPackageByName('my-package');

if (pkg?.json.exports) {
	console.log('Available exports:');

	Object.keys(pkg.json.exports).forEach((exportPath) => {
		const target = pkg.resolveImport(exportPath);
		if (target) {
			console.log(`\n${exportPath}:`);
			console.log(`  Default: ${target.default}`);
			if (target.import) console.log(`  Import: ${target.import}`);
			if (target.require) console.log(`  Require: ${target.require}`);
			if (target.types) console.log(`  Types: ${target.types}`);
		}
	});
}
```

### Resolve Source Files

```typescript
const pkg = turbo.getPackageByName('my-package');

if (pkg) {
	// Resolve relative to package root
	const srcPath = pkg.resolvePath('src/index.ts');
	const testPath = pkg.resolvePath('tests/index.test.ts');
	const configPath = pkg.resolvePath('tsconfig.json');

	console.log('Source:', srcPath);
	console.log('Tests:', testPath);
	console.log('Config:', configPath);
}
```

## Analyzing Dependencies

### Find Packages Using Specific Dependency

```typescript
const dependencyName = 'react';

const packagesUsingReact = turbo.packages.filter((pkg) => {
	const deps = pkg.json.dependencies || {};
	const devDeps = pkg.json.devDependencies || {};
	return deps[dependencyName] || devDeps[dependencyName];
});

console.log(`Packages using ${dependencyName}:`);
packagesUsingReact.forEach((pkg) => {
	const version = pkg.json.dependencies?.[dependencyName] || pkg.json.devDependencies?.[dependencyName];
	console.log(`- ${pkg.name} (${version})`);
});
```

### Dependency Graph

```typescript
interface DependencyMap {
	[packageName: string]: string[];
}

function buildDependencyGraph(turbo: Turbo): DependencyMap {
	const graph: DependencyMap = {};
	const workspaceNames = new Set(turbo.allWorkspaces.map((w) => w.name));

	for (const workspace of turbo.allWorkspaces) {
		const deps = workspace.json.dependencies || {};

		// Filter to only internal dependencies
		graph[workspace.name] = Object.keys(deps).filter((dep) => workspaceNames.has(dep));
	}

	return graph;
}

const graph = buildDependencyGraph(turbo);
console.log('Internal dependency graph:', graph);
```

### Version Consistency Check

```typescript
function checkVersionConsistency(turbo: Turbo): void {
	const depVersions = new Map<string, Set<string>>();

	// Collect all dependency versions
	turbo.allWorkspaces.forEach((workspace) => {
		const deps = {
			...workspace.json.dependencies,
			...workspace.json.devDependencies,
		};

		Object.entries(deps).forEach(([name, version]) => {
			if (!depVersions.has(name)) {
				depVersions.set(name, new Set());
			}
			depVersions.get(name)!.add(version);
		});
	});

	// Find inconsistencies
	console.log('Version inconsistencies:');
	depVersions.forEach((versions, depName) => {
		if (versions.size > 1) {
			console.log(`\n${depName}:`);
			versions.forEach((v) => console.log(`  - ${v}`));
		}
	});
}

checkVersionConsistency(turbo);
```

## Build Tools Integration

### Generate TypeScript Paths

```typescript
function generateTsConfigPaths(turbo: Turbo): Record<string, string[]> {
	const paths: Record<string, string[]> = {};

	turbo.packages.forEach((pkg) => {
		if (pkg.json.exports) {
			Object.keys(pkg.json.exports).forEach((exportPath) => {
				const target = pkg.resolveImport(exportPath);
				if (target?.types) {
					const importPath = exportPath === '.' ? pkg.name : `${pkg.name}/${exportPath.slice(2)}`;
					paths[importPath] = [target.types];
				}
			});
		}
	});

	return paths;
}

const paths = generateTsConfigPaths(turbo);
console.log('TypeScript paths:', JSON.stringify(paths, null, 2));
```

### Validate Package Exports

```typescript
import fs from 'fs';
import path from 'path';

function validateExports(pkg: TurboPackage | TurboApp): void {
	if (!pkg.json.exports) {
		console.log(`⚠️  ${pkg.name}: No exports defined`);
		return;
	}

	console.log(`\nValidating ${pkg.name}:`);

	Object.entries(pkg.json.exports).forEach(([exportPath, target]) => {
		const resolved = pkg.resolveImport(exportPath);

		if (resolved) {
			// Check if files exist
			const files = [resolved.default, resolved.import, resolved.require, resolved.types].filter(Boolean);

			files.forEach((file) => {
				if (file && !fs.existsSync(file)) {
					console.log(`  ❌ ${exportPath}: ${file} not found`);
				} else {
					console.log(`  ✅ ${exportPath}: ${path.basename(file!)}`);
				}
			});
		}
	});
}

turbo.packages.forEach(validateExports);
```

## Testing

### Mock File System for Tests

```typescript
import { Turbo, IFileSystemAdapter } from 'turbo-meta-utilities';
import { describe, it, expect } from 'vitest';

describe('My Feature', () => {
	it('should work with mock monorepo', () => {
		const mockFs: IFileSystemAdapter = {
			existsSync: (path) => {
				// Mock implementation
				return !path.includes('nonexistent');
			},
			isDirectory: (path) => {
				return !path.includes('.json');
			},
			readFileSync: (path) => {
				if (path.includes('turbo.json')) {
					return JSON.stringify({});
				}
				return JSON.stringify({
					name: 'test-package',
					version: '1.0.0',
				});
			},
			readdirSync: (path) => {
				if (path.includes('packages')) {
					return ['package1', 'package2'];
				}
				return ['app1'];
			},
		};

		const turbo = new Turbo('/fake/monorepo', mockFs);
		expect(turbo.packages).toHaveLength(2);
	});
});
```

### Integration Test Example

```typescript
import { Turbo } from 'turbo-meta-utilities';
import { describe, it, expect } from 'vitest';
import path from 'path';

describe('Turbo Integration', () => {
	it('should read real monorepo', () => {
		// Assuming tests run from monorepo root
		const turbo = new Turbo(process.cwd());

		// Verify structure
		expect(turbo.packages.length).toBeGreaterThan(0);

		// Verify specific package exists
		const pkg = turbo.getPackageByName('turbo-meta-utilities');
		expect(pkg).toBeDefined();
		expect(pkg?.name).toBe('turbo-meta-utilities');
	});
});
```

## Advanced Usage

### Find Circular Dependencies

```typescript
function findCircularDeps(turbo: Turbo): string[][] {
	const graph = new Map<string, Set<string>>();
	const workspaceNames = new Set(turbo.allWorkspaces.map((w) => w.name));

	// Build graph
	turbo.allWorkspaces.forEach((workspace) => {
		const deps = new Set<string>();
		Object.keys(workspace.json.dependencies || {})
			.filter((dep) => workspaceNames.has(dep))
			.forEach((dep) => deps.add(dep));
		graph.set(workspace.name, deps);
	});

	// Find cycles
	const cycles: string[][] = [];
	const visited = new Set<string>();
	const recStack = new Set<string>();

	function dfs(node: string, path: string[]): void {
		visited.add(node);
		recStack.add(node);
		path.push(node);

		const deps = graph.get(node) || new Set();
		for (const dep of deps) {
			if (!visited.has(dep)) {
				dfs(dep, [...path]);
			} else if (recStack.has(dep)) {
				const cycleStart = path.indexOf(dep);
				cycles.push([...path.slice(cycleStart), dep]);
			}
		}

		recStack.delete(node);
	}

	for (const name of workspaceNames) {
		if (!visited.has(name)) {
			dfs(name, []);
		}
	}

	return cycles;
}

const cycles = findCircularDeps(turbo);
if (cycles.length > 0) {
	console.log('⚠️  Circular dependencies found:');
	cycles.forEach((cycle) => {
		console.log(`  ${cycle.join(' -> ')}`);
	});
}
```

### Generate Dependency Matrix

```typescript
function generateMatrix(turbo: Turbo): void {
	const workspaces = turbo.allWorkspaces;
	const names = workspaces.map((w) => w.name);

	console.log('Dependency Matrix:');
	console.log('(✓ = depends on)');
	console.log();

	// Header
	console.log('   ', names.map((n) => n.slice(0, 10).padEnd(10)).join(' '));

	// Rows
	workspaces.forEach((workspace, i) => {
		const deps = workspace.json.dependencies || {};
		const row = names.map((name) => (deps[name] ? '    ✓     ' : '          '));
		console.log(names[i].slice(0, 10).padEnd(10), row.join(' '));
	});
}

generateMatrix(turbo);
```
