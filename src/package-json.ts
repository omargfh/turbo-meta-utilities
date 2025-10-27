import { minimatch } from 'minimatch';
import { z } from 'zod';
import { FileSystemAdapter, type IFileSystemAdapter } from './filesystem.js';

const ExportTargetSchema = z
	.union([
		z.string(),
		z.object({
			default: z.string().optional(),
			import: z.string().optional(),
			require: z.string().optional(),
			types: z.string().optional(),
		}),
	])
	.refine(
		(data) => {
			if (typeof data === 'string') return true;
			return !!(data.default || data.import || data.require || data.types);
		},
		{
			message: 'Export target must have at least one of default, import, require, or types',
		}
	);

const PackageJsonSchema = z.object({
	name: z.string(),
	version: z.string().optional(),
	files: z.array(z.string()).optional(),
	main: z.string().optional(),
	module: z.string().optional(),
	types: z.string().optional(),
	scripts: z.record(z.string(), z.string()).optional(),
	dependencies: z.record(z.string(), z.string()).optional(),
	devDependencies: z.record(z.string(), z.string()).optional(),
	peerDependencies: z.record(z.string(), z.string()).optional(),
	exports: z.record(z.string(), ExportTargetSchema).optional(),
});

export type ExportTargetData = z.infer<typeof ExportTargetSchema>;
export type PackageJsonData = z.infer<typeof PackageJsonSchema>;

/**
 * Represents an export target from package.json exports field
 */
export class ExportTarget {
	public readonly default: string;
	public readonly import?: string;
	public readonly require?: string;
	public readonly types?: string;

	constructor(public readonly target: ExportTargetData) {
		if (typeof target === 'string') {
			this.default = target;
			this.import = target;
			this.require = target;
			this.types = target;
		} else {
			if (!target.default && !target.import && !target.require && !target.types) {
				throw new Error(`Invalid export target: ${JSON.stringify(target)}`);
			}
			this.default = (target.default || target.import || target.require || target.types) as string;
			this.import = target.import;
			this.require = target.require;
			this.types = target.types;
		}
	}
}

/**
 * Resolves import paths using glob patterns
 */
export class GlobResolver {
	constructor(public readonly patterns: Record<string, ExportTargetData>) {}

	resolveImport(importPath: string): ExportTarget | undefined {
		for (const [pattern, target] of Object.entries(this.patterns)) {
			if (minimatch(importPath, pattern)) {
				return new ExportTarget(target);
			}
		}
		return undefined;
	}
}

/**
 * Represents and provides access to package.json data
 */
export class PackageJson {
	public data: PackageJsonData = {} as PackageJsonData;
	private fs: IFileSystemAdapter;

	constructor(public readonly path: string, fileSystem: IFileSystemAdapter = FileSystemAdapter) {
		this.fs = fileSystem;
		this._load();
	}

	private _load(): void {
		if (!this.fs.existsSync(this.path)) {
			throw new Error(`package.json does not exist at path: ${this.path}`);
		}

		const fileContent = this.fs.readFileSync(this.path, 'utf-8');
		this.data = PackageJsonSchema.parse(JSON.parse(fileContent));
	}

	get name(): string {
		return this.data.name;
	}

	get version(): string | undefined {
		return this.data.version;
	}

	get exports(): Record<string, ExportTargetData> | undefined {
		return this.data.exports;
	}

	get dependencies(): Record<string, string> | undefined {
		return this.data.dependencies;
	}

	get devDependencies(): Record<string, string> | undefined {
		return this.data.devDependencies;
	}

	get peerDependencies(): Record<string, string> | undefined {
		return this.data.peerDependencies;
	}

	get scripts(): Record<string, string> | undefined {
		return this.data.scripts;
	}

	get main(): string | undefined {
		return this.data.main;
	}

	get module(): string | undefined {
		return this.data.module;
	}

	get types(): string | undefined {
		return this.data.types;
	}

	resolveImport(importPath: string): ExportTarget | undefined {
		const exportsField = this.data.exports;
		if (!exportsField) return undefined;

		const globResolver = new GlobResolver(exportsField);
		const exportTarget = globResolver.resolveImport(importPath);
		if (!exportTarget) return undefined;

		return exportTarget;
	}
}
