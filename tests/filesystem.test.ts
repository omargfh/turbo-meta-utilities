import { describe, it, expect, beforeEach } from 'vitest';
import { DefaultFileSystemAdapter } from '../src/filesystem.js';

describe('DefaultFileSystemAdapter', () => {
	let adapter: DefaultFileSystemAdapter;

	beforeEach(() => {
		adapter = new DefaultFileSystemAdapter();
	});

	describe('existsSync', () => {
		it('should return true for existing file', () => {
			expect(adapter.existsSync(__filename)).toBe(true);
		});

		it('should return false for non-existing file', () => {
			expect(adapter.existsSync('/non/existent/path.txt')).toBe(false);
		});

		it('should return true for existing directory', () => {
			expect(adapter.existsSync(__dirname)).toBe(true);
		});
	});

	describe('isDirectory', () => {
		it('should return true for directory', () => {
			expect(adapter.isDirectory(__dirname)).toBe(true);
		});

		it('should return false for file', () => {
			expect(adapter.isDirectory(__filename)).toBe(false);
		});

		it('should throw error for non-existent path', () => {
			expect(() => adapter.isDirectory('/non/existent/path')).toThrow();
		});
	});

	describe('readFileSync', () => {
		it('should read file content', () => {
			const content = adapter.readFileSync(__filename, 'utf-8');
			expect(content).toContain('DefaultFileSystemAdapter');
		});

		it('should throw error for non-existent file', () => {
			expect(() => adapter.readFileSync('/non/existent/file.txt', 'utf-8')).toThrow();
		});
	});

	describe('readdirSync', () => {
		it('should list directory contents', () => {
			const files = adapter.readdirSync(__dirname);
			expect(Array.isArray(files)).toBe(true);
			expect(files.length).toBeGreaterThan(0);
		});

		it('should throw error for non-existent directory', () => {
			expect(() => adapter.readdirSync('/non/existent/dir')).toThrow();
		});

		it('should throw error when trying to read a file', () => {
			expect(() => adapter.readdirSync(__filename)).toThrow();
		});
	});
});
