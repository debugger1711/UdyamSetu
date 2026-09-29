import { z } from "zod";

/**
 * Phase 0 request-validation entry point.
 * Later routes should parse input here before calling a service.
 * This module does not define project or application schemas.
 */
export function parseWithSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  data: unknown,
): z.infer<TSchema> {
  return schema.parse(data);
}
