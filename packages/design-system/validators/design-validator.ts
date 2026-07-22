/**
 * AI Business OS
 * Design JSON Validator
 * Version: 1.0.0
 */

import Ajv from "ajv";
import addFormats from "ajv-formats";

import schema from "../schemas/design.schema.json";
import type { DesignDocument } from "../types/design";

const ajv = new Ajv({
  allErrors: true,
  strict: false,
});

addFormats(ajv);

const validate = ajv.compile(schema);

/**
 * Validate Design Document
 */
export function validateDesign(
  document: unknown
): {
  valid: boolean;
  errors: string[];
} {
  const valid = validate(document);

  return {
    valid: !!valid,
    errors:
      validate.errors?.map(
        (error) =>
          `${error.instancePath || "/"} ${error.message ?? "Validation error"}`
      ) ?? [],
  };
}

/**
 * Type Guard
 */
export function isDesignDocument(
  document: unknown
): document is DesignDocument {
  return validate(document) as boolean;
}

/**
 * Assert Design Document
 */
export function assertDesignDocument(
  document: unknown
): asserts document is DesignDocument {
  const result = validateDesign(document);

  if (!result.valid) {
    throw new Error(
      `Invalid DesignDocument\n${result.errors.join("\n")}`
    );
  }
}