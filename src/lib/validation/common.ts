import { z } from "zod";

/**
 * Building blocks shared by every entity schema.
 *
 * HTML inputs always produce strings, and an untouched optional input produces
 * "". These helpers normalise that into the `null` / `Date` / `number` values
 * Prisma expects, so neither the forms nor the API handlers need conversion
 * code of their own.
 */

const blankToNull = (value: unknown) =>
  value === "" || value === undefined ? null : value;

/** Required, trimmed, non-empty text. */
export const requiredText = (label: string, max = 200) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be ${max} characters or fewer`);

/** Optional text that stores `null` when left blank. */
export const optionalText = (max = 500) =>
  z.preprocess(
    blankToNull,
    z
      .string()
      .trim()
      .max(max, `Must be ${max} characters or fewer`)
      .nullable(),
  );

/** Optional date that stores `null` when left blank. */
export const optionalDate = z.preprocess(
  blankToNull,
  z.coerce.date({ error: "Enter a valid date" }).nullable(),
);

/** Required date. */
export const requiredDate = (label: string) =>
  z.coerce.date({ error: `${label} is required` });

/** Money amount. Rejects negatives so KPI totals can never go backwards. */
export const money = z.coerce
  .number({ error: "Enter a number" })
  .min(0, "Cannot be negative")
  .max(1_000_000_000, "That value looks too large");

/** An integer percentage, 0-100. */
export const percentage = z.coerce
  .number({ error: "Enter a number" })
  .int("Must be a whole number")
  .min(0, "Cannot be below 0")
  .max(100, "Cannot be above 100");

/** A required relation id. */
export const requiredId = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`);

/** An optional relation id that stores `null` when nothing is selected. */
export const optionalId = z.preprocess(
  blankToNull,
  z.string().trim().nullable(),
);

/** Shape returned to the client when validation fails. */
export type FieldErrors = Record<string, string[]>;

/** Collapse a ZodError into `{ field: [messages] }` for form display. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  return z.flattenError(error).fieldErrors as FieldErrors;
}

/**
 * Build a PATCH schema from a create schema.
 *
 * `.partial()` alone is not enough: Zod keeps `.default()` on optional fields,
 * so a PATCH that sends only `{ projectId }` would also silently re-apply
 * `status: "TODO"` and quietly reopen a completed task. Stripping the defaults
 * first means an update only ever changes the fields the caller actually sent.
 */
type WithoutDefaults<Shape extends z.ZodRawShape> = {
  [K in keyof Shape]: z.ZodOptional<
    Shape[K] extends z.ZodDefault<infer Inner extends z.ZodType>
      ? Inner
      : Shape[K]
  >;
};

export function partialWithoutDefaults<T extends z.ZodObject>(
  schema: T,
): z.ZodObject<WithoutDefaults<T["shape"]>> {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => {
      const inner = (
        field instanceof z.ZodDefault ? field.def.innerType : field
      ) as z.ZodType;
      return [key, inner.optional()];
    }),
  );
  // The runtime shape matches the mapped type above; TypeScript cannot follow
  // the transformation through Object.fromEntries, so it is asserted once here
  // rather than at every call site.
  return z.object(shape) as unknown as z.ZodObject<WithoutDefaults<T["shape"]>>;
}
