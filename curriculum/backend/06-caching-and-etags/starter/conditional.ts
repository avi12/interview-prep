export type ConditionalResponse = { status: number; headers: Record<string, string>; body?: unknown };

export const etagFor = (resource: unknown) => '""';

export function conditionalResponse({
  resource,
  ifNoneMatch,
  maxAgeSeconds
}: {
  resource: unknown;
  ifNoneMatch?: string;
  maxAgeSeconds: number;
}): ConditionalResponse {
  return { status: 200, headers: {}, body: resource };
}
