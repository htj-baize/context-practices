import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

export type PracticeCaseSummary = {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  hasDedicatedPresenter: boolean;
  readmePath: string;
};

const CASES_ROOT = path.resolve(process.cwd(), "..", "..", "cases");
const DEDICATED_ROUTE_SLUGS = new Set([
  "neta-next-collection-recommendation",
  "neta-studio-continuation-engine",
  "neta-studio-live-world-playground",
]);

function inferSummary(slug: string, readme: string): PracticeCaseSummary {
  const lines = readme
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const title =
    lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "").trim() ??
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  const summary =
    lines.find((line) => !line.startsWith("#") && !line.startsWith("-")) ??
    "Structured validation case for context-driven workflows.";
  const tags = [
    slug.includes("recommend") ? "recommendation" : null,
    slug.includes("world") ? "world" : null,
    slug.includes("knowledge") ? "enterprise" : null,
    slug.includes("search") ? "search" : null,
  ].filter((value): value is string => Boolean(value));
  return {
    slug,
    title,
    summary,
    tags,
    hasDedicatedPresenter:
      DEDICATED_ROUTE_SLUGS.has(slug) || existsSync(path.join(CASES_ROOT, slug, "demo")),
    readmePath: path.join(CASES_ROOT, slug, "README.md"),
  };
}

export function listPracticeCases(): PracticeCaseSummary[] {
  if (!existsSync(CASES_ROOT)) {
    return [];
  }
  return readdirSync(CASES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const readmePath = path.join(CASES_ROOT, entry.name, "README.md");
      const readme = existsSync(readmePath) ? readFileSync(readmePath, "utf8") : "";
      return inferSummary(entry.name, readme);
    })
    .sort((left, right) => left.slug.localeCompare(right.slug));
}
