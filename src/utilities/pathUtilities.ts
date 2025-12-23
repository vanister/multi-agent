import { sep } from 'path';

export function isWithinBoundary(
  resolvedPath: string,
  boundaryPath: string,
  separator = sep
): boolean {
  return resolvedPath.startsWith(boundaryPath + separator) || resolvedPath === boundaryPath;
}
