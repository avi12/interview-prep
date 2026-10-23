export type ConditionalResponse = {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
};

export function etagFor(_resource: unknown) {
  return "\"\"";
}

export function conditionalResponse({ resource }: {
  resource: unknown;
  ifNoneMatch?: string;
  maxAgeSeconds: number;
}): ConditionalResponse {
  return {
    status: 200,
    headers: {},
    body: resource
  };
}
