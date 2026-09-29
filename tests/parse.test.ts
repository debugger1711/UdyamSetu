import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZodError, z } from "zod";

import { parseWithSchema } from "../lib/validations/parse";

const sampleSchema = z.object({
  name: z.string().min(1),
});

describe("parseWithSchema", () => {
  it("returns the parsed value for valid input", () => {
    assert.deepEqual(parseWithSchema(sampleSchema, { name: "ABC Manufacturing" }), {
      name: "ABC Manufacturing",
    });
  });

  it("rejects invalid input before it can reach a service", () => {
    assert.throws(() => parseWithSchema(sampleSchema, { name: "" }), ZodError);
  });
});
