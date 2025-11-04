import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PackageJson, ExportTarget, GlobResolver } from '../src/package-json.js';
import type { IFileSystemAdapter } from '../src/filesystem.js';

describe('ExportTarget', () => {
	describe('string target', () => {
		it('should create export target from string', () => {
			const target = new ExportTarget('./dist/index.js');
			expect(target.default).toBe('./dist/index.js');
			expect(target.import).toBe('./dist/index.js');
			expect(target.require).toBe('./dist/index.js');
			expect(target.types).toBe('./dist/index.js');
		});
	});

	describe('object target', () => {
		it('should create export target from object with all fields', () => {
			const target = new ExportTarget({
				default: './dist/index.js',
				import: './dist/index.mjs',
				require: './dist/index.cjs',
				types: './dist/index.d.ts',
			});
			expect(target.default).toBe('./dist/index.js');
			expect(target.import).toBe('./dist/index.mjs');
			expect(target.require).toBe('./dist/index.cjs');
			expect(target.types).toBe('./dist/index.d.ts');
		});

		it('should use first available field as default', () => {
			const target = new ExportTarget({
				import: './dist/index.mjs',
			});
			expect(target.default).toBe('./dist/index.mjs');
			expect(target.import).toBe('./dist/index.mjs');
		});

		it('should throw error for empty object', () => {
			expect(() => new ExportTarget({})).toThrow('Invalid export target');
		});

		it('should resolve nested conditional exports', () => {
			const target = new ExportTarget({
				import: {
					node: './dist/index.node.mjs',
					default: './dist/index.mjs',
				},
				require: {
					node: './dist/index.node.cjs',
					default: './dist/index.cjs',
				},
			});

			expect(target.import).toBe('./dist/index.node.mjs');
			expect(target.require).toBe('./dist/index.node.cjs');
			expect(target.resolve(['browser', 'import'])).toBe('./dist/index.mjs');
			expect(target.resolve(['browser', 'require'])).toBe('./dist/index.cjs');
		});

		it('should honor array fallbacks and skip null entries', () => {
			const target = new ExportTarget([
				null,
				{
					default: './dist/index.js',
					browser: './dist/index.browser.js',
				},
			]);

			expect(target.default).toBe('./dist/index.js');
			expect(target.resolve(['browser'])).toBe('./dist/index.browser.js');
		});

		it('should treat null targets as blocked', () => {
			const target = new ExportTarget({
				default: null,
				import: './dist/index.mjs',
			});

			expect(target.default).toBe('./dist/index.mjs');
			expect(target.resolve(['default'])).toBeUndefined();
		});
	});
});

describe('GlobResolver', () => {
	it('should resolve exact match', () => {
		const resolver = new GlobResolver({
			'.': './dist/index.js',
			'./utils': './dist/utils.js',
		});

		const target = resolver.resolveImport('.');
		expect(target).toBeDefined();
		expect(target?.default).toBe('./dist/index.js');
	});

	it('should resolve glob pattern', () => {
		const resolver = new GlobResolver({
			'./*': './dist/*.js',
			'./**/*': './dist/**/*.js',
		});

		const target = resolver.resolveImport('./utils');
		expect(target).toBeDefined();
		expect(target?.default).toBe('./dist/utils.js');

		const deepTarget = resolver.resolveImport('./components/button');
		expect(deepTarget).toBeDefined();
		expect(deepTarget?.default).toBe('./dist/components/button.js');
	});

	it('should return undefined for no match', () => {
		const resolver = new GlobResolver({
			'.': './dist/index.js',
		});

		const target = resolver.resolveImport('./nonexistent');
		expect(target).toBeUndefined();
	});

	it('should match first pattern in order', () => {
		const resolver = new GlobResolver({
			'./*': './dist/*.js',
			'./utils': './special/utils.js',
		});

		const target = resolver.resolveImport('./utils');
		expect(target).toBeDefined();
		expect(target?.default).toBe('./dist/utils.js');
	});

	it('should substitute wildcards inside nested conditions', () => {
		const resolver = new GlobResolver({
			'./components/*': {
				import: {
					node: './dist/node/components/*.mjs',
					default: './dist/components/*.mjs',
				},
				default: './dist/components/*.js',
			},
		});

		const target = resolver.resolveImport('./components/button');
		expect(target).toBeDefined();
		expect(target?.import).toBe('./dist/node/components/button.mjs');
		expect(target?.resolve(['browser'])).toBe('./dist/components/button.js');
	});
});

describe('PackageJson', () => {
	let mockFs: IFileSystemAdapter;

	beforeEach(() => {
		mockFs = {
			existsSync: vi.fn(),
			isDirectory: vi.fn(),
			readFileSync: vi.fn(),
			readdirSync: vi.fn(),
		};
	});

	describe('constructor', () => {
		it('should throw error if package.json does not exist', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(false);

			expect(() => new PackageJson('/fake/package.json', mockFs)).toThrow('package.json does not exist at path');
		});

		it('should load valid package.json', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: 'test-package',
					version: '1.0.0',
				})
			);

			const pkg = new PackageJson('/fake/package.json', mockFs);
			expect(pkg.name).toBe('test-package');
			expect(pkg.version).toBe('1.0.0');
		});

		it('should throw error for invalid JSON', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue('invalid json');

			expect(() => new PackageJson('/fake/package.json', mockFs)).toThrow();
		});

		it('should throw error for missing name field', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					version: '1.0.0',
				})
			);

			expect(() => new PackageJson('/fake/package.json', mockFs)).toThrow();
		});
	});

	describe('getters', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: 'test-package',
					version: '1.0.0',
					main: './dist/index.js',
					module: './dist/index.mjs',
					types: './dist/index.d.ts',
					dependencies: {
						lodash: '^4.0.0',
					},
					devDependencies: {
						vitest: '^1.0.0',
					},
					peerDependencies: {
						react: '^18.0.0',
					},
					scripts: {
						build: 'tsc',
						test: 'vitest',
					},
					exports: {
						'.': './dist/index.js',
					},
				})
			);
		});

		it('should return all package.json fields', () => {
			const pkg = new PackageJson('/fake/package.json', mockFs);

			expect(pkg.name).toBe('test-package');
			expect(pkg.version).toBe('1.0.0');
			expect(pkg.main).toBe('./dist/index.js');
			expect(pkg.module).toBe('./dist/index.mjs');
			expect(pkg.types).toBe('./dist/index.d.ts');
			expect(pkg.dependencies).toEqual({ lodash: '^4.0.0' });
			expect(pkg.devDependencies).toEqual({ vitest: '^1.0.0' });
			expect(pkg.peerDependencies).toEqual({ react: '^18.0.0' });
			expect(pkg.scripts).toEqual({ build: 'tsc', test: 'vitest' });
			expect(pkg.exports).toEqual({ '.': './dist/index.js' });
		});
	});

	describe('resolveImport', () => {
		it('should resolve import from exports field', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: 'test-package',
					exports: {
						'.': './dist/index.js',
						'./utils': './dist/utils.js',
					},
				})
			);

			const pkg = new PackageJson('/fake/package.json', mockFs);
			const target = pkg.resolveImport('.');
			expect(target).toBeDefined();
			expect(target?.default).toBe('./dist/index.js');
		});

		it('should support conditional exports resolution', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: 'test-package',
					exports: {
						'.': {
							import: {
								node: './dist/index.node.mjs',
								default: './dist/index.mjs',
							},
							require: './dist/index.cjs',
						},
					},
				})
			);

			const pkg = new PackageJson('/fake/package.json', mockFs);
			const target = pkg.resolveImport('.');
			expect(target).toBeDefined();
			expect(target?.import).toBe('./dist/index.node.mjs');
			expect(target?.resolve(['browser', 'import'])).toBe('./dist/index.mjs');
			const requireTarget = target?.resolve(['require']);
			expect(requireTarget).toBe('./dist/index.cjs');
		});

		it('should return undefined if no exports field', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: 'test-package',
				})
			);

			const pkg = new PackageJson('/fake/package.json', mockFs);
			const target = pkg.resolveImport('.');
			expect(target).toBeUndefined();
		});

		it('should return undefined if import not found', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: 'test-package',
					exports: {
						'.': './dist/index.js',
					},
				})
			);

			const pkg = new PackageJson('/fake/package.json', mockFs);
			const target = pkg.resolveImport('./nonexistent');
			expect(target).toBeUndefined();
		});
	});
});
