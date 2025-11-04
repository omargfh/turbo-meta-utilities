import { minimatch } from 'minimatch';
import { z } from 'zod';
import { FileSystemAdapter, type IFileSystemAdapter } from './filesystem.js';

// Recursive type for conditional exports
type ExportValue =
	| string
	| null
	| ExportValue[]
	| {
			[condition: string]: ExportValue;
	  };

const ExportValueSchema: z.ZodType<ExportValue> = z.lazy(() =>
	z.union([z.string(), z.null(), z.array(ExportValueSchema), z.record(z.string(), ExportValueSchema)])
);

const ExportTargetSchema = ExportValueSchema;

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
const DEFAULT_CONDITION_PRIORITY = ['node', 'browser', 'import', 'require', 'types'];

type ConditionSetKey = 'default' | 'import' | 'require' | 'types';

interface ExportTargetOptions {
	conditionPriority?: string[];
	conditionSets?: Partial<Record<ConditionSetKey, string[]>>;
}

interface ResolveResult {
	target?: string;
	blocked: boolean;
}

export class ExportTarget {
	public readonly default?: string;
	public readonly import?: string;
	public readonly require?: string;
	public readonly types?: string;

	private readonly _target: ExportTargetData;
	private readonly _conditionPriority: string[];
	private readonly _conditionSets: Record<ConditionSetKey, string[]>;

	constructor(target: ExportTargetData, options: ExportTargetOptions = {}) {
		this._target = target;
		this._conditionPriority = this._normalizeConditions(options.conditionPriority ?? DEFAULT_CONDITION_PRIORITY);
		this._conditionSets = {
			default: this._normalizeConditions(options.conditionSets?.default ?? ['default', ...this._conditionPriority]),
			import: this._normalizeConditions(options.conditionSets?.import ?? ['import', ...this._conditionPriority]),
			require: this._normalizeConditions(options.conditionSets?.require ?? ['require', ...this._conditionPriority]),
			types: this._normalizeConditions(options.conditionSets?.types ?? ['types', ...this._conditionPriority]),
		};

		const defaultResult = this._resolveFor(this._conditionSets.default);
		const importResult = this._resolveFor(this._conditionSets.import);
		const requireResult = this._resolveFor(this._conditionSets.require);
		const typesResult = this._resolveFor(this._conditionSets.types);

		this.default = defaultResult.target ?? importResult.target ?? requireResult.target ?? typesResult.target;
		this.import = importResult.target;
		this.require = requireResult.target;
		this.types = typesResult.target;

		if (!this.default && !this.import && !this.require && !this.types) {
			const fallback = this._resolveFor(this._conditionPriority);
			if (!fallback.target && !fallback.blocked) {
				throw new Error(`Invalid export target: ${JSON.stringify(target)}`);
			}
			this.default = fallback.target;
		}
	}

	public resolve(conditions: string[]): string | undefined {
		const { target, blocked } = this._resolveFor(this._normalizeConditions(conditions));
		if (blocked) return undefined;
		return target;
	}

	private _resolveFor(conditions: string[]): ResolveResult {
		const result = this._resolveExportValue(this._target, conditions);
		if (result === null) {
			return { blocked: true };
		}
		return { target: result, blocked: false };
	}

	private _resolveExportValue(value: ExportValue, conditions: string[]): string | null | undefined {
		if (value === null) return null;
		if (typeof value === 'string') return value;
		if (Array.isArray(value)) {
			let blocked = false;
			for (const entry of value) {
				const resolved = this._resolveExportValue(entry, conditions);
				if (resolved === null) {
					blocked = true;
					continue;
				}
				if (resolved !== undefined) {
					return resolved;
				}
			}
			return blocked ? null : undefined;
		}

		for (const condition of conditions) {
			if (Object.prototype.hasOwnProperty.call(value, condition)) {
				const resolved = this._resolveExportValue(value[condition] as ExportValue, conditions);
				if (resolved !== undefined) {
					return resolved;
				}
			}
		}

		return undefined;
	}

	private _normalizeConditions(conditions: string[]): string[] {
		const seen = new Set<string>();
		const normalized: string[] = [];
		for (const condition of conditions) {
			if (!seen.has(condition)) {
				normalized.push(condition);
				seen.add(condition);
			}
		}
		if (!seen.has('default')) {
			normalized.push('default');
		}
		return normalized;
	}
}

/**
 * Resolves import paths using glob patterns
 */
export interface ResolveImportOptions extends ExportTargetOptions {}

export class GlobResolver {
	constructor(public readonly patterns: Record<string, ExportTargetData>) {}

	resolveImport(importPath: string, options: ResolveImportOptions = {}): ExportTarget | undefined {
		for (const [pattern, target] of Object.entries(this.patterns)) {
			if (!minimatch(importPath, pattern)) continue;

			if (!pattern.includes('*')) {
				return new ExportTarget(target, options);
			}

			const captures = this._extractCaptures(pattern, importPath);
			const substitutedTarget = this._substituteExportValue(target, captures);
			return new ExportTarget(substitutedTarget, options);
		}
		return undefined;
	}

	private _extractCaptures(pattern: string, importPath: string): string[] {
		const regexPattern = this._globToRegex(pattern);
		const regex = new RegExp(`^${regexPattern}$`);
		const match = importPath.match(regex);
		return match ? match.slice(1) : [];
	}

	private _substituteExportValue(target: ExportTargetData, captures: string[]): ExportTargetData {
		if (typeof target === 'string') {
			return this._replaceWildcards(target, captures);
		}
		if (target === null) {
			return null;
		}
		if (Array.isArray(target)) {
			return target.map((entry) => this._substituteExportValue(entry, captures));
		}
		const substituted: Record<string, ExportTargetData> = {};
		for (const [key, value] of Object.entries(target)) {
			substituted[key] = this._substituteExportValue(value as ExportTargetData, captures);
		}
		return substituted;
	}

	private _globToRegex(pattern: string): string {
		let regex = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
		regex = regex.replace(/\*\*/g, '~~DOUBLESTAR~~');
		regex = regex.replace(/\*/g, '([^/]*)');
		return regex.replace(/~~DOUBLESTAR~~/g, '(.*)');
	}

	private _replaceWildcards(targetPath: string, captures: string[]): string {
		let result = targetPath;
		let captureIndex = 0;
		result = result.replace(/\*\*/g, () => (captureIndex < captures.length ? captures[captureIndex++] : '**'));
		result = result.replace(/\*/g, () => (captureIndex < captures.length ? captures[captureIndex++] : '*'));
		return result;
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

	resolveImport(importPath: string, options: ResolveImportOptions = {}): ExportTarget | undefined {
		const exportsField = this.data.exports;
		if (!exportsField) return undefined;

		const globResolver = new GlobResolver(exportsField);
		const exportTarget = globResolver.resolveImport(importPath, options);
		if (!exportTarget) return undefined;

		return exportTarget;
	}
}
