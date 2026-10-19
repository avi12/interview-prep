export type ApiRequest = { method: string; path: string; body?: unknown };
export type ApiResponse = { status: number; headers?: Record<string, string>; body?: unknown };

export function createApi() {
  const handle = ({ method, path, body }: ApiRequest): ApiResponse => {
    return { status: 501 };
  };

  return { handle };
}
