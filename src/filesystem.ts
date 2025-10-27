import fs from 'fs';

/**
 * Interface for file system operations (Dependency Inversion Principle)
 */
export interface IFileSystemAdapter {
	existsSync(path: string): boolean;
	isDirectory(path: string): boolean;
	readFileSync(path: string, encoding: BufferEncoding): string;
	readdirSync(path: string): string[];
}

/**
 * Default file system adapter using Node.js fs module
 */
export class DefaultFileSystemAdapter implements IFileSystemAdapter {
	existsSync(filePath: string): boolean {
		return fs.existsSync(filePath);
	}

	isDirectory(filePath: string): boolean {
		return fs.statSync(filePath).isDirectory();
	}

	readFileSync(filePath: string, encoding: BufferEncoding): string {
		return fs.readFileSync(filePath, encoding);
	}

	readdirSync(dirPath: string): string[] {
		return fs.readdirSync(dirPath);
	}
}

export const FileSystemAdapter = new DefaultFileSystemAdapter();
