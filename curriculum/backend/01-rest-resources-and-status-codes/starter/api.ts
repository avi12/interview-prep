export type ApiRequest = {
  method: string;
  path: string;
  body?: unknown;
};
export type ApiResponse = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
};

export function createApi() {
  function handle(_request: ApiRequest): ApiResponse {
    return { status: 501 };
  }

  return { handle };
}
