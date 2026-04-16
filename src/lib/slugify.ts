/**
 * Converts a string into a URL-safe slug.
 * Removes accents, lowercases, and replaces non-alphanumeric chars with hyphens.
 */
export function slugify(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 80);
}
