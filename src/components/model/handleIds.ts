export function sourceHandleId(column: string): string {
  return `source:${encodeURIComponent(column)}`;
}

export function targetHandleId(column: string): string {
  return `target:${encodeURIComponent(column)}`;
}

export function columnFromHandle(handleId: string | null | undefined): string | null {
  if (!handleId) return null;
  const separator = handleId.indexOf(':');
  if (separator < 0) return null;
  return decodeURIComponent(handleId.slice(separator + 1));
}
