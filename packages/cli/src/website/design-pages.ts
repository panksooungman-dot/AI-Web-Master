import fs from "fs-extra";
import path from "path";
import type { DesignDocument } from "@cnbiz/design-system/types/design";
import { generateReactComponentTree } from "../generators/react/index.js";

/**
 * Website Builder ↔ React Generator connection.
 *
 * The React Generator (packages/cli/src/generators/react) is deliberately pure — it returns TSX
 * as strings and never touches the filesystem, which is what lets it be tested without a temp
 * directory. This module is the other half: it takes that output and writes it into a scaffolded
 * project, so the Design chain's DesignDocument actually reaches the generated source code
 * instead of the scaffold's fixed templates.
 *
 * It only ever writes page files. Everything else the scaffold produced (layout, components,
 * styles, config, SEO, API routes) is left untouched, so a DesignDocument that describes three
 * pages replaces those three and leaves the rest of the site working.
 */

export interface ApplyDesignPagesResult {
  /** Routes written, relative to the project root (e.g. "app/about/page.tsx"). */
  written: string[];
  /** Routes that replaced a file the scaffold had already generated. */
  replaced: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Structural check for a parsed JSON payload. Deliberately hand-rolled rather than importing
 * @cnbiz/design-system's validator: that package ships TypeScript sources, and importing it at
 * runtime would drag files outside packages/cli's rootDir into the build (and into the
 * serverless bundle). Every import of it from this package is type-only for the same reason.
 */
export function parseDesignDocument(raw: unknown): DesignDocument | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.version !== "string") return null;
  if (!isRecord(raw.metadata) || typeof raw.metadata.projectName !== "string") return null;
  if (!isRecord(raw.theme)) return null;
  if (!Array.isArray(raw.pages)) return null;

  for (const page of raw.pages) {
    if (!isRecord(page)) return null;
    if (typeof page.id !== "string" || typeof page.title !== "string" || typeof page.path !== "string") {
      return null;
    }
    if (!Array.isArray(page.sections)) return null;
  }

  return raw as unknown as DesignDocument;
}

/**
 * Renders every page in `document` through the React Generator and writes it into `targetDir`.
 * Returns the routes written; a document with no pages writes nothing and is not an error
 * (the scaffold's own pages simply stay in place).
 */
export async function applyDesignDocumentPages(
  targetDir: string,
  document: DesignDocument
): Promise<ApplyDesignPagesResult> {
  const tree = generateReactComponentTree(document);
  const written: string[] = [];
  const replaced: string[] = [];

  for (const page of tree.pages) {
    const absolute = path.join(targetDir, page.route);

    if (await fs.pathExists(absolute)) {
      replaced.push(page.route);
    }

    await fs.ensureDir(path.dirname(absolute));
    await fs.writeFile(absolute, page.tsx, "utf-8");
    written.push(page.route);
  }

  return { written, replaced };
}
