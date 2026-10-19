export const SERVER_HOST = "127.0.0.1";
export const SERVER_DEFAULT_PORT = 8765;

export const serverOrigin = (port: number = SERVER_DEFAULT_PORT) => `http://${SERVER_HOST}:${port}`;
