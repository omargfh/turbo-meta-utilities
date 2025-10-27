import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Turbo, TurboPackage, TurboApp } from '../src/turbo.js';
import type { IFileSystemAdapter } from '../src/filesystem.js';

describe('TurboPackage', () => {
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
		it('should throw error if path does not exist', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(false);

			expect(() => new TurboPackage('/fake/path', mockFs)).toThrow('Package path does not exist');
		});

		it('should throw error if path is not a directory', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(false);

			expect(() => new TurboPackage('/fake/path', mockFs)).toThrow('Package path is not a directory');
		});

		it('should throw error if package.json not found', () => {
			vi.mocked(mockFs.existsSync)
				.mockReturnValueOnce(true) // path exists
				.mockReturnValueOnce(false); // package.json doesn't exist
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);

			expect(() => new TurboPackage('/fake/path', mockFs)).toThrow('package.json not found in package path');
		});

		it('should create package successfully', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'test-package' }));

			const pkg = new TurboPackage('/fake/path', mockFs);
			expect(pkg.name).toBe('test-package');
			expect(pkg.path).toContain('fake');
		});
	});

	describe('resolveImport', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(
				JSON.stringify({
					name: 'test-package',
					exports: {
						'.': './dist/index.js',
					},
				})
			);
		});

		it('should resolve import with absolute paths', () => {
			const pkg = new TurboPackage('/fake/path', mockFs);
			const target = pkg.resolveImport('.');

			expect(target).toBeDefined();
			expect(target?.default).toContain('/fake/path');
			expect(target?.default).toContain('dist/index.js');
		});

		it('should return undefined for non-existent import', () => {
			const pkg = new TurboPackage('/fake/path', mockFs);
			const target = pkg.resolveImport('./nonexistent');

			expect(target).toBeUndefined();
		});
	});

	describe('resolvePath', () => {
		it('should resolve relative path to absolute', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
			vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'test-package' }));

			const pkg = new TurboPackage('/fake/path', mockFs);
			const resolved = pkg.resolvePath('src/index.ts');

			expect(resolved).toContain('/fake/path');
			expect(resolved).toContain('src/index.ts');
		});
	});
});

describe('TurboApp', () => {
	let mockFs: IFileSystemAdapter;

	beforeEach(() => {
		mockFs = {
			existsSync: vi.fn(),
			isDirectory: vi.fn(),
			readFileSync: vi.fn(),
			readdirSync: vi.fn(),
		};
	});

	it('should create app successfully', () => {
		vi.mocked(mockFs.existsSync).mockReturnValue(true);
		vi.mocked(mockFs.isDirectory).mockReturnValue(true);
		vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'test-app' }));

		const app = new TurboApp('/fake/app', mockFs);
		expect(app.name).toBe('test-app');
	});

	it('should have same functionality as TurboPackage', () => {
		vi.mocked(mockFs.existsSync).mockReturnValue(true);
		vi.mocked(mockFs.isDirectory).mockReturnValue(true);
		vi.mocked(mockFs.readFileSync).mockReturnValue(
			JSON.stringify({
				name: 'test-app',
				exports: {
					'.': './dist/index.js',
				},
			})
		);

		const app = new TurboApp('/fake/app', mockFs);
		const target = app.resolveImport('.');

		expect(target).toBeDefined();
		expect(app.resolvePath('src/main.ts')).toContain('src/main.ts');
	});
});

describe('Turbo', () => {
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
		it('should throw error if monorepo root does not exist', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(false);

			expect(() => new Turbo('/fake/root', mockFs)).toThrow('Monorepo root does not exist');
		});

		it('should throw error if root is not a directory', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(false);

			expect(() => new Turbo('/fake/root', mockFs)).toThrow('Monorepo root is not a directory');
		});

		it('should throw error if turbo.json not found', () => {
			vi.mocked(mockFs.existsSync)
				.mockReturnValueOnce(true) // root exists
				.mockReturnValueOnce(false); // turbo.json doesn't exist
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);

			expect(() => new Turbo('/fake/root', mockFs)).toThrow('turbo.json not found in monorepo root');
		});

		it('should create Turbo instance successfully', () => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);

			const turbo = new Turbo('/fake/root', mockFs);
			expect(turbo).toBeDefined();
		});
	});

	describe('paths', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
		});

		it('should return correct packages path', () => {
			const turbo = new Turbo('/fake/root', mockFs);
			expect(turbo.packagesPath).toContain('packages');
		});

		it('should return correct apps path', () => {
			const turbo = new Turbo('/fake/root', mockFs);
			expect(turbo.appsPath).toContain('apps');
		});
	});

	describe('packages', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
		});

		it('should return empty array if packages directory does not exist', () => {
			vi.mocked(mockFs.existsSync)
				.mockReturnValueOnce(true) // root exists
				.mockReturnValueOnce(true) // turbo.json exists
				.mockReturnValueOnce(false); // packages dir doesn't exist

			const turbo = new Turbo('/fake/root', mockFs);
			expect(turbo.packages).toEqual([]);
		});

		it('should return packages from packages directory', () => {
			vi.mocked(mockFs.readdirSync).mockReturnValue(['pkg1', 'pkg2', 'not-a-package']);
			vi.mocked(mockFs.existsSync).mockImplementation((path) => {
				if (typeof path === 'string') {
					return !path.includes('not-a-package/package.json');
				}
				return true;
			});
			vi.mocked(mockFs.readFileSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('pkg1')) {
					return JSON.stringify({ name: 'pkg1' });
				}
				return JSON.stringify({ name: 'pkg2' });
			});

			const turbo = new Turbo('/fake/root', mockFs);
			const packages = turbo.packages;

			expect(packages).toHaveLength(2);
			expect(packages[0].name).toBe('pkg1');
			expect(packages[1].name).toBe('pkg2');
		});

		it('should filter out non-directories and directories without package.json', () => {
			vi.mocked(mockFs.readdirSync).mockReturnValue(['pkg1', 'file.txt', 'empty-dir']);
			vi.mocked(mockFs.isDirectory).mockImplementation((path) => {
				if (typeof path === 'string') {
					return !path.includes('file.txt');
				}
				return true;
			});
			vi.mocked(mockFs.existsSync).mockImplementation((path) => {
				if (typeof path === 'string') {
					return !path.includes('empty-dir/package.json');
				}
				return true;
			});
			vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'pkg1' }));

			const turbo = new Turbo('/fake/root', mockFs);
			const packages = turbo.packages;

			expect(packages).toHaveLength(1);
			expect(packages[0].name).toBe('pkg1');
		});
	});

	describe('apps', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
		});

		it('should return empty array if apps directory does not exist', () => {
			vi.mocked(mockFs.existsSync)
				.mockReturnValueOnce(true) // root exists
				.mockReturnValueOnce(true) // turbo.json exists
				.mockReturnValueOnce(false); // apps dir doesn't exist

			const turbo = new Turbo('/fake/root', mockFs);
			expect(turbo.apps).toEqual([]);
		});

		it('should return apps from apps directory', () => {
			vi.mocked(mockFs.readdirSync).mockReturnValue(['app1', 'app2']);
			vi.mocked(mockFs.readFileSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('app1')) {
					return JSON.stringify({ name: 'app1' });
				}
				return JSON.stringify({ name: 'app2' });
			});

			const turbo = new Turbo('/fake/root', mockFs);
			const apps = turbo.apps;

			expect(apps).toHaveLength(2);
			expect(apps[0].name).toBe('app1');
			expect(apps[1].name).toBe('app2');
		});
	});

	describe('allWorkspaces', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
		});

		it('should return combined packages and apps', () => {
			let callCount = 0;
			vi.mocked(mockFs.readdirSync).mockImplementation(() => {
				callCount++;
				return callCount === 1 ? ['pkg1'] : ['app1'];
			});
			vi.mocked(mockFs.readFileSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('pkg1')) {
					return JSON.stringify({ name: 'pkg1' });
				}
				return JSON.stringify({ name: 'app1' });
			});

			const turbo = new Turbo('/fake/root', mockFs);
			const workspaces = turbo.allWorkspaces;

			expect(workspaces).toHaveLength(2);
		});

		it('should handle missing packages directory', () => {
			vi.mocked(mockFs.existsSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('packages')) {
					return false;
				}
				return true;
			});
			vi.mocked(mockFs.readdirSync).mockReturnValue(['app1']);
			vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'app1' }));

			const turbo = new Turbo('/fake/root', mockFs);
			const workspaces = turbo.allWorkspaces;

			expect(workspaces).toHaveLength(1);
		});
	});

	describe('getPackageByName', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
			vi.mocked(mockFs.readdirSync).mockReturnValue(['pkg1', 'pkg2']);
		});

		it('should find package by name', () => {
			vi.mocked(mockFs.readFileSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('pkg1')) {
					return JSON.stringify({ name: 'my-package' });
				}
				return JSON.stringify({ name: 'other-package' });
			});

			const turbo = new Turbo('/fake/root', mockFs);
			const pkg = turbo.getPackageByName('my-package');

			expect(pkg).toBeDefined();
			expect(pkg?.name).toBe('my-package');
		});

		it('should return undefined if package not found', () => {
			vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'other-package' }));

			const turbo = new Turbo('/fake/root', mockFs);
			const pkg = turbo.getPackageByName('nonexistent');

			expect(pkg).toBeUndefined();
		});
	});

	describe('getAppByName', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
			vi.mocked(mockFs.readdirSync).mockReturnValue(['app1', 'app2']);
		});

		it('should find app by name', () => {
			vi.mocked(mockFs.readFileSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('app1')) {
					return JSON.stringify({ name: 'my-app' });
				}
				return JSON.stringify({ name: 'other-app' });
			});

			const turbo = new Turbo('/fake/root', mockFs);
			const app = turbo.getAppByName('my-app');

			expect(app).toBeDefined();
			expect(app?.name).toBe('my-app');
		});

		it('should return undefined if app not found', () => {
			vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'other-app' }));

			const turbo = new Turbo('/fake/root', mockFs);
			const app = turbo.getAppByName('nonexistent');

			expect(app).toBeUndefined();
		});
	});

	describe('getWorkspaceByName', () => {
		beforeEach(() => {
			vi.mocked(mockFs.existsSync).mockReturnValue(true);
			vi.mocked(mockFs.isDirectory).mockReturnValue(true);
		});

		it('should find workspace in packages', () => {
			let callCount = 0;
			vi.mocked(mockFs.readdirSync).mockImplementation(() => {
				callCount++;
				return callCount === 1 ? ['pkg1'] : ['app1'];
			});
			vi.mocked(mockFs.readFileSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('pkg1')) {
					return JSON.stringify({ name: 'my-workspace' });
				}
				return JSON.stringify({ name: 'app1' });
			});

			const turbo = new Turbo('/fake/root', mockFs);
			const workspace = turbo.getWorkspaceByName('my-workspace');

			expect(workspace).toBeDefined();
			expect(workspace?.name).toBe('my-workspace');
		});

		it('should find workspace in apps', () => {
			let callCount = 0;
			vi.mocked(mockFs.readdirSync).mockImplementation(() => {
				callCount++;
				return callCount === 1 ? ['pkg1'] : ['app1'];
			});
			vi.mocked(mockFs.readFileSync).mockImplementation((path) => {
				if (typeof path === 'string' && path.includes('app1')) {
					return JSON.stringify({ name: 'my-workspace' });
				}
				return JSON.stringify({ name: 'pkg1' });
			});

			const turbo = new Turbo('/fake/root', mockFs);
			const workspace = turbo.getWorkspaceByName('my-workspace');

			expect(workspace).toBeDefined();
			expect(workspace?.name).toBe('my-workspace');
		});

		it('should return undefined if workspace not found', () => {
			vi.mocked(mockFs.readdirSync).mockReturnValue(['pkg1']);
			vi.mocked(mockFs.readFileSync).mockReturnValue(JSON.stringify({ name: 'other' }));

			const turbo = new Turbo('/fake/root', mockFs);
			const workspace = turbo.getWorkspaceByName('nonexistent');

			expect(workspace).toBeUndefined();
		});
	});
});
