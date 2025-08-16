/**
 * Enhanced error factory with comprehensive pre-constructed errors
 */

import { ErrorCategory, McpOperationError } from '../../types/error-types.js'
import { ERROR_CODES } from './error-codes.js'

/**
 * Enhanced error factory with comprehensive pre-constructed error types
 */
export const EnhancedErrorFactory = {
  // Project Management Errors
  project: {
    notFound: (projectId: string, suggestions?: string[]): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PROJECT,
        `Project "${projectId}" not found.\n\n`
        + 'You must initialize the project first using the initialize_project tool.\n\n'
        + `Example:\n{"projectId": "${projectId}", "directory": "."}\n\n`
        + 'This ensures proper project root detection and avoids initialization failures.'
        + (suggestions?.length ? `\n\nDid you mean: ${suggestions.join(', ')}?` : ''),
        ERROR_CODES.PROJECT_NOT_FOUND,
        { projectId, suggestions },
      ),

    alreadyExists: (projectId: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PROJECT,
        `Project "${projectId}" already exists. Use a different project ID or destroy the existing project first.`,
        ERROR_CODES.PROJECT_ALREADY_EXISTS,
        { projectId },
      ),

    notInitialized: (projectId: string, operation: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PROJECT,
        `Project "${projectId}" is not fully initialized and cannot perform ${operation}.\n\n`
        + 'Please wait for initialization to complete or reinitialize the project.',
        ERROR_CODES.PROJECT_NOT_INITIALIZED,
        { projectId, operation },
      ),

    initializationFailed: (projectId: string, reason: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PROJECT,
        `Failed to initialize project "${projectId}": ${reason}`,
        ERROR_CODES.PROJECT_INITIALIZATION_FAILED,
        { projectId, reason },
      ),

    invalidConfig: (projectId: string, issues: string[]): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PROJECT,
        `Invalid configuration for project "${projectId}":\n${issues.map(i => `  • ${i}`).join('\n')}`,
        ERROR_CODES.PROJECT_INVALID_CONFIG,
        { projectId, issues },
      ),

    memoryLimitExceeded: (projectId: string, currentUsage: number, limit: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PROJECT,
        `Project "${projectId}" exceeds memory limit: ${currentUsage}MB used, ${limit}MB allowed.`,
        ERROR_CODES.PROJECT_MEMORY_LIMIT_EXCEEDED,
        { projectId, currentUsage, limit },
      ),
  },

  // File System Errors
  filesystem: {
    directoryNotFound: (directory: string, suggestions?: string[]): McpOperationError =>
      new McpOperationError(
        ErrorCategory.FILESYSTEM,
        `Directory not found: ${directory}`
        + (suggestions?.length ? `\n\nDid you mean: ${suggestions.join(', ')}?` : ''),
        ERROR_CODES.DIRECTORY_NOT_FOUND,
        { directory, suggestions },
      ),

    fileNotFound: (filePath: string, context?: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.FILESYSTEM,
        `File not found: ${filePath}` + (context ? `\n\nContext: ${context}` : ''),
        ERROR_CODES.FILE_NOT_FOUND,
        { filePath, context },
      ),

    accessDenied: (path: string, operation: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.FILESYSTEM,
        `Access denied: Cannot ${operation} ${path}. Check file permissions.`,
        ERROR_CODES.FILE_ACCESS_DENIED,
        { path, operation },
      ),

    fileTooLarge: (filePath: string, size: number, maxSize: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.FILESYSTEM,
        `File too large: ${filePath} (${size} bytes) exceeds maximum size of ${maxSize} bytes.`,
        ERROR_CODES.FILE_TOO_LARGE,
        { filePath, size, maxSize },
      ),

    pathTraversalBlocked: (path: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.FILESYSTEM,
        `Path traversal blocked: ${path} contains unsafe path components.`,
        ERROR_CODES.PATH_TRAVERSAL_BLOCKED,
        { path },
      ),
  },

  // Search Operation Errors
  search: {
    invalidQuery: (query: string, reason: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SEARCH,
        `Invalid search query: "${query}"\n\nReason: ${reason}`,
        ERROR_CODES.SEARCH_INVALID_QUERY,
        { query, reason },
      ),

    noResults: (query: string, searchedElements: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SEARCH,
        `No results found for query: "${query}"\n\nSearched ${searchedElements} code elements.`,
        ERROR_CODES.SEARCH_NO_RESULTS,
        { query, searchedElements },
      ),

    timeout: (query: string, timeoutMs: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SEARCH,
        `Search timeout: Query "${query}" exceeded ${timeoutMs}ms limit.`,
        ERROR_CODES.SEARCH_TIMEOUT,
        { query, timeoutMs },
      ),

    patternTooComplex: (pattern: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SEARCH,
        `Search pattern too complex: "${pattern}"\n\nTry simplifying your search pattern.`,
        ERROR_CODES.SEARCH_PATTERN_TOO_COMPLEX,
        { pattern },
      ),

    resultsTruncated: (query: string, foundCount: number, maxResults: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SEARCH,
        `Search results truncated: Found ${foundCount} results for "${query}", showing first ${maxResults}.`,
        ERROR_CODES.SEARCH_RESULTS_TRUNCATED,
        { query, foundCount, maxResults },
      ),
  },

  // Parsing & Language Support Errors
  parsing: {
    unsupportedLanguage: (language: string, supportedLanguages: string[]): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PARSING,
        `Unsupported language: ${language}\n\n`
        + `Supported languages: ${supportedLanguages.join(', ')}`,
        ERROR_CODES.LANGUAGE_UNSUPPORTED,
        { language, supportedLanguages },
      ),

    syntaxError: (filePath: string, line: number, column: number, message: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PARSING,
        `Syntax error in ${filePath} at line ${line}, column ${column}: ${message}`,
        ERROR_CODES.SYNTAX_ERROR,
        { filePath, line, column, message },
      ),

    parserFailed: (filePath: string, language: string, error: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PARSING,
        `Parser failed for ${language} file: ${filePath}\n\nError: ${error}`,
        ERROR_CODES.PARSER_FAILED,
        { filePath, language, error },
      ),

    treeSitterError: (operation: string, error: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.PARSING,
        `Tree-sitter error during ${operation}: ${error}`,
        ERROR_CODES.TREE_SITTER_ERROR,
        { operation, error },
      ),
  },

  // Validation & Input Errors
  validation: {
    parameterMissing: (parameter: string, operation: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.VALIDATION,
        `Missing required parameter: ${parameter} for operation ${operation}`,
        ERROR_CODES.PARAMETER_MISSING,
        { parameter, operation },
      ),

    parameterInvalid: (parameter: string, value: unknown, expectedType: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.VALIDATION,
        `Invalid parameter: ${parameter} = ${value}\n\nExpected: ${expectedType}`,
        ERROR_CODES.PARAMETER_INVALID,
        { parameter, value, expectedType },
      ),

    schemaValidationFailed: (schema: string, errors: string[]): McpOperationError =>
      new McpOperationError(
        ErrorCategory.VALIDATION,
        `Schema validation failed for ${schema}:\n${errors.map(e => `  • ${e}`).join('\n')}`,
        ERROR_CODES.SCHEMA_VALIDATION_FAILED,
        { schema, errors },
      ),

    inputTooLarge: (inputType: string, size: number, maxSize: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.VALIDATION,
        `Input too large: ${inputType} (${size} bytes) exceeds maximum of ${maxSize} bytes.`,
        ERROR_CODES.INPUT_TOO_LARGE,
        { inputType, size, maxSize },
      ),
  },

  // Analysis & Code Quality Errors
  analysis: {
    failed: (analysisType: string, reason: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SYSTEM,
        `${analysisType} analysis failed: ${reason}`,
        ERROR_CODES.ANALYSIS_FAILED,
        { analysisType, reason },
      ),

    timeout: (analysisType: string, timeoutMs: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SYSTEM,
        `${analysisType} analysis timed out after ${timeoutMs}ms`,
        ERROR_CODES.ANALYSIS_TIMEOUT,
        { analysisType, timeoutMs },
      ),

    analyzerNotAvailable: (analyzerType: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SYSTEM,
        `Analyzer not available: ${analyzerType}`,
        ERROR_CODES.ANALYZER_NOT_AVAILABLE,
        { analyzerType },
      ),
  },

  // System & Internal Errors
  system: {
    internalError: (operation: string, details: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SYSTEM,
        `Internal error during ${operation}: ${details}`,
        ERROR_CODES.SYSTEM_ERROR,
        { operation, details },
      ),

    memoryExhausted: (operation: string, requestedMB: number, availableMB: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SYSTEM,
        `Memory exhausted during ${operation}: Requested ${requestedMB}MB, available ${availableMB}MB`,
        ERROR_CODES.MEMORY_EXHAUSTED,
        { operation, requestedMB, availableMB },
      ),

    operationTimeout: (operation: string, timeoutMs: number): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SYSTEM,
        `Operation timeout: ${operation} exceeded ${timeoutMs}ms limit`,
        ERROR_CODES.OPERATION_TIMEOUT,
        { operation, timeoutMs },
      ),

    rateLimitExceeded: (operation: string, limit: number, window: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.SYSTEM,
        `Rate limit exceeded for ${operation}: ${limit} requests per ${window}`,
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        { operation, limit, window },
      ),
  },

  // Configuration Errors
  config: {
    invalid: (configType: string, errors: string[]): McpOperationError =>
      new McpOperationError(
        ErrorCategory.VALIDATION,
        `Invalid ${configType} configuration:\n${errors.map(e => `  • ${e}`).join('\n')}`,
        ERROR_CODES.CONFIG_INVALID,
        { configType, errors },
      ),

    missing: (configType: string, location: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.VALIDATION,
        `Missing ${configType} configuration at ${location}`,
        ERROR_CODES.CONFIG_MISSING,
        { configType, location },
      ),

    parsingFailed: (configFile: string, error: string): McpOperationError =>
      new McpOperationError(
        ErrorCategory.VALIDATION,
        `Failed to parse configuration file ${configFile}: ${error}`,
        ERROR_CODES.CONFIG_PARSING_FAILED,
        { configFile, error },
      ),
  },
}