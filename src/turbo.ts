import path from 'path';
import { ExportTarget, PackageJson } from './package-json.js';
import { FileSystemAdapter, type IFileSystemAdapter } from './filesystem.js';

/**
 * Base class for packages/apps with common functionality (DRY principle)
 */
abstract class BasePackage {
	public readonly name: string;
	public readonly path: string;
	public readonly json: PackageJson;
	protected fs: IFileSystemAdapter;

	constructor(_path: string, fileSystem: IFileSystemAdapter = FileSystemAdapter) {
		this.fs = fileSystem;
		this.path = path.resolve(_path);

		if (!this.fs.existsSync(this.path)) {
			throw new Error(`Package path does not exist: ${this.path}`);
		}

		if (!this.fs.isDirectory(this.path)) {
			throw new Error(`Package path is not a directory: ${this.path}`);
		}

		const packageJsonPath = path.join(this.path, 'package.json');
		if (!this.fs.existsSync(packageJsonPath)) {
			throw new Error(`package.json not found in package path: ${this.path}`);
		}

		this.json = new PackageJson(packageJsonPath, this.fs);
		this.name = this.json.name;
	}

	/**
	 * Resolves import path to export target with absolute paths
	 */
	resolveImport(importPath: string): ExportTarget | undefined {
		const exportTarget = this.json.resolveImport(importPath);
		if (!exportTarget) return undefined;

		return new Proxy(exportTarget, {
			get: (target, prop) => {
				if (prop in target) {
					return path.join(this.path, (target as any)[prop]);
				}
				return undefined;
			},
		});
	}

	/**
	 * Resolves relative path to absolute path within package
	 */
	resolvePath(relativePath: string): string {
		return path.join(this.path, relativePath);
	}
}

/**
 * Represents a package in the monorepo packages directory
 */
export class TurboPackage extends BasePackage {
	constructor(_path: string, fileSystem?: IFileSystemAdapter) {
		super(_path, fileSystem);
	}
}

/**
 * Represents an app in the monorepo apps directory
 */
export class TurboApp extends BasePackage {
	constructor(_path: string, fileSystem?: IFileSystemAdapter) {
		super(_path, fileSystem);
	}
}

/**
 * Main class for interacting with a Turborepo monorepo
 */
export class Turbo {
	private readonly monorepoRoot: string;
	private fs: IFileSystemAdapter;

	constructor(monorepoRoot: string, fileSystem: IFileSystemAdapter = FileSystemAdapter) {
		this.fs = fileSystem;

		if (!this.fs.existsSync(monorepoRoot)) {
			throw new Error(`Monorepo root does not exist: ${monorepoRoot}`);
		}

		if (!this.fs.isDirectory(monorepoRoot)) {
			throw new Error(`Monorepo root is not a directory: ${monorepoRoot}`);
		}

		const turboConfigPath = path.join(monorepoRoot, 'turbo.json');
		if (!this.fs.existsSync(turboConfigPath)) {
			throw new Error(`turbo.json not found in monorepo root: ${turboConfigPath}`);
		}

		this.monorepoRoot = path.resolve(monorepoRoot);
	}

	get packagesPath(): string {
		return path.join(this.monorepoRoot, 'packages');
	}

	get appsPath(): string {
		return path.join(this.monorepoRoot, 'apps');
	}

	/**
	 * Gets all packages from the packages directory
	 */
	get packages(): TurboPackage[] {
		return this._getItemsFromDirectory(this.packagesPath, TurboPackage);
	}

	/**
	 * Gets all apps from the apps directory
	 */
	get apps(): TurboApp[] {
		return this._getItemsFromDirectory(this.appsPath, TurboApp);
	}

	/**
	 * Gets all packages and apps combined
	 */
	get allWorkspaces(): (TurboPackage | TurboApp)[] {
		const packages = this.fs.existsSync(this.packagesPath) ? this.packages : [];
		const apps = this.fs.existsSync(this.appsPath) ? this.apps : [];
		return [...packages, ...apps];
	}

	/**
	 * Finds a package by name
	 */
	getPackageByName(packageName: string): TurboPackage | undefined {
		return this.packages.find((p) => p.name === packageName);
	}

	/**
	 * Finds an app by name
	 */
	getAppByName(appName: string): TurboApp | undefined {
		return this.apps.find((a) => a.name === appName);
	}

	/**
	 * Finds any workspace (package or app) by name
	 */
	getWorkspaceByName(name: string): TurboPackage | TurboApp | undefined {
		return this.allWorkspaces.find((w) => w.name === name);
	}

	/**
	 * DRY helper to read packages/apps from a directory
	 */
	private _getItemsFromDirectory<T extends BasePackage>(
		dirPath: string,
		ItemClass: new (path: string, fs: IFileSystemAdapter) => T
	): T[] {
		if (!this.fs.existsSync(dirPath)) {
			return [];
		}

		const itemNames = this.fs.readdirSync(dirPath).filter((dirName) => {
			const itemPath = path.join(dirPath, dirName);
			return this.fs.isDirectory(itemPath) && this.fs.existsSync(path.join(itemPath, 'package.json'));
		});

		return itemNames.map((dirName) => {
			const itemPath = path.join(dirPath, dirName);
			return new ItemClass(itemPath, this.fs);
		});
	}
}
