import path from "path";

export function normalizePath(inputPath: string): string {
  return path.normalize(inputPath);
}

export function resolvePath(basePath: string, requestedPath: string): string {
  return path.resolve(basePath, requestedPath);
}

export function isWithinBoundary(resolvedPath: string, boundaryPath: string): boolean {
  return resolvedPath.startsWith(boundaryPath + path.sep) || resolvedPath === boundaryPath;
}

export function formatPathForError(requestedPath: string): string {
  return `'${requestedPath}'`;
}
