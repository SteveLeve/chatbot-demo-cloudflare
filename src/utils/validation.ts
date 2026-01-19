/**
 * Input validation and sanitization utilities
 * Addresses Issue #9: Missing Input Validation
 */

export interface ValidationResult {
	valid: boolean;
	error?: {
		code: string;
		message: string;
		field?: string;
	};
}

/**
 * Validate topK parameter (number of chunks to retrieve)
 * Must be between 1 and 20
 */
export function validateTopK(value: unknown): ValidationResult {
	// Handle string to number conversion
	if (typeof value === 'string') {
		const parsed = parseInt(value, 10);
		if (isNaN(parsed)) {
			return {
				valid: false,
				error: {
					code: 'INVALID_TOP_K',
					message: 'topK must be a valid number',
					field: 'topK',
				},
			};
		}
		value = parsed;
	}

	// Type check
	if (typeof value !== 'number') {
		return {
			valid: false,
			error: {
				code: 'INVALID_TOP_K',
				message: 'topK must be a number',
				field: 'topK',
			},
		};
	}

	// Range validation
	const numValue = value as number;
	if (numValue < 1 || numValue > 20) {
		return {
			valid: false,
			error: {
				code: 'INVALID_TOP_K_RANGE',
				message: 'topK must be between 1 and 20',
				field: 'topK',
			},
		};
	}

	return { valid: true };
}

/**
 * Validate minSimilarity parameter (similarity threshold)
 * Must be between 0 and 1
 */
export function validateMinSimilarity(value: unknown): ValidationResult {
	// Handle string to number conversion
	if (typeof value === 'string') {
		const parsed = parseFloat(value);
		if (isNaN(parsed)) {
			return {
				valid: false,
				error: {
					code: 'INVALID_MIN_SIMILARITY',
					message: 'minSimilarity must be a valid number',
					field: 'minSimilarity',
				},
			};
		}
		value = parsed;
	}

	// Type check
	if (typeof value !== 'number') {
		return {
			valid: false,
			error: {
				code: 'INVALID_MIN_SIMILARITY',
				message: 'minSimilarity must be a number',
				field: 'minSimilarity',
			},
		};
	}

	// Range validation
	const numValue = value as number;
	if (numValue < 0 || numValue > 1) {
		return {
			valid: false,
			error: {
				code: 'INVALID_MIN_SIMILARITY_RANGE',
				message: 'minSimilarity must be between 0 and 1',
				field: 'minSimilarity',
			},
		};
	}

	return { valid: true };
}

/**
 * Validate document title
 * Max 500 characters, no control characters (except newline/tab)
 */
export function validateTitle(title: string): ValidationResult {
	// Check if empty
	if (!title || title.trim().length === 0) {
		return {
			valid: false,
			error: {
				code: 'INVALID_TITLE',
				message: 'Title cannot be empty',
				field: 'title',
			},
		};
	}

	// Check max length
	if (title.length > 500) {
		return {
			valid: false,
			error: {
				code: 'TITLE_TOO_LONG',
				message: 'Title must be 500 characters or less',
				field: 'title',
			},
		};
	}

	// Check for control characters (except \n and \t)
	// eslint-disable-next-line no-control-regex
	const controlCharsRegex = /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/;
	if (controlCharsRegex.test(title)) {
		return {
			valid: false,
			error: {
				code: 'INVALID_TITLE_CHARS',
				message: 'Title contains invalid control characters',
				field: 'title',
			},
		};
	}

	return { valid: true };
}

/**
 * Validate document content
 * Max 100KB (102,400 bytes), must be non-empty
 */
export function validateContent(content: string): ValidationResult {
	// Check if empty
	if (!content || content.trim().length === 0) {
		return {
			valid: false,
			error: {
				code: 'INVALID_CONTENT',
				message: 'Content cannot be empty',
				field: 'content',
			},
		};
	}

	// Check max size (100KB = 102,400 bytes)
	const contentBytes = new TextEncoder().encode(content).length;
	if (contentBytes > 102400) {
		return {
			valid: false,
			error: {
				code: 'CONTENT_TOO_LARGE',
				message: 'Content must be 100KB or less',
				field: 'content',
			},
		};
	}

	return { valid: true };
}

/**
 * Validate metadata object
 * Max 10KB JSON size, check for prototype pollution
 */
export function validateMetadata(metadata: unknown): ValidationResult {
	// Type check
	if (typeof metadata !== 'object' || metadata === null || Array.isArray(metadata)) {
		return {
			valid: false,
			error: {
				code: 'INVALID_METADATA',
				message: 'Metadata must be a valid object',
				field: 'metadata',
			},
		};
	}

	// Check for prototype pollution attempts (only check own properties)
	const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
	const metadataObj = metadata as Record<string, any>;

	for (const key of dangerousKeys) {
		if (Object.prototype.hasOwnProperty.call(metadataObj, key)) {
			return {
				valid: false,
				error: {
					code: 'INVALID_METADATA_KEYS',
					message: 'Metadata contains invalid keys',
					field: 'metadata',
				},
			};
		}
	}

	// Check JSON size (10KB = 10,240 bytes)
	try {
		const jsonString = JSON.stringify(metadata);
		const jsonBytes = new TextEncoder().encode(jsonString).length;
		if (jsonBytes > 10240) {
			return {
				valid: false,
				error: {
					code: 'METADATA_TOO_LARGE',
					message: 'Metadata must be 10KB or less',
					field: 'metadata',
				},
			};
		}
	} catch {
		return {
			valid: false,
			error: {
				code: 'INVALID_METADATA_JSON',
				message: 'Metadata must be valid JSON',
				field: 'metadata',
			},
		};
	}

	return { valid: true };
}

/**
 * Sanitize user question to prevent prompt injection
 * Removes control characters and detects dangerous patterns
 */
export function sanitizeQuestion(question: string): string {
	// Remove control characters (except newline and tab)
	// eslint-disable-next-line no-control-regex
	let sanitized = question.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

	// Detect and neutralize prompt injection patterns
	const dangerousPatterns = [
		/ignore\s+previous\s+instructions/gi,
		/ignore\s+all\s+previous\s+instructions/gi,
		/disregard\s+previous\s+instructions/gi,
		/system\s*:/gi,
		/<\s*system\s*>/gi,
		/\[system\]/gi,
		/<\s*\/?system\s*>/gi,
		/assistant\s*:/gi,
		/<\s*assistant\s*>/gi,
	];

	for (const pattern of dangerousPatterns) {
		sanitized = sanitized.replace(pattern, '[REDACTED]');
	}

	// Check for excessive special characters (potential injection)
	// Flag sequences of 5+ consecutive special chars
	const specialCharPattern = /[^\w\s]{5,}/g;
	sanitized = sanitized.replace(specialCharPattern, (match) => {
		// Keep the first few chars, truncate the rest
		return match.substring(0, 3) + '...';
	});

	// Basic SQL injection pattern detection (defense-in-depth)
	const sqlPatterns = [
		/('\s*(or|and)\s*'?\d+'?\s*=\s*'?\d+)/gi,
		/(union\s+select)/gi,
		/(drop\s+table)/gi,
		/(delete\s+from)/gi,
	];

	for (const pattern of sqlPatterns) {
		sanitized = sanitized.replace(pattern, '[REDACTED]');
	}

	return sanitized.trim();
}
