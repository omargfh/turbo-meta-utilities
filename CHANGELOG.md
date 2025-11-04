# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-27

### Added

- Initial release of turbo-meta-utilities
- `Turbo` class for working with Turborepo monorepos
- `TurboPackage` class for package management
- `TurboApp` class for app management
- `PackageJson` class for parsing and validating package.json files
- `ExportTarget` class for handling package exports
- `GlobResolver` class for resolving import paths with glob patterns
- File system abstraction with `IFileSystemAdapter` interface
- Comprehensive test suite with 99%+ coverage
- Full TypeScript support with type definitions
- Support for both packages and apps directories
- Ability to resolve package exports and imports
- Dependency injection support for testing
- Complete API documentation
- Usage examples and guides

### Features

- Read and parse package.json files with Zod validation
- Access all packages and apps in a monorepo
- Find workspaces by name
- Resolve package exports using glob patterns
- Convert relative paths to absolute paths
- Mock file system support for testing
- SOLID principles architecture
- DRY code with base classes

[1.0.0]: https://github.com/yourusername/turbo-meta-utilities/releases/tag/v1.0.0

## [1.1.0] - 2025-11-04

### Added

- Comprehensive conditional export resolution including nested conditions, array fallbacks, and null blocking targets
- Glob substitution support for nested export structures and wildcard replacement
- Extended test coverage for complex `package.json` export scenarios
