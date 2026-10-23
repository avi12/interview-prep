export type ApiRequest = { method: string; path: string; body?: unknown };
export type ApiResponse = { status: number; headers?: Record<string, string>; body?: unknown };

type Task = { id: number; title: string; done: boolean };
type Handler = (input: { id: number; body: unknown }) => ApiResponse;

const COLLECTION_PATH = "/tasks";
const ITEM_PATH_PATTERN = /^\/tasks\/(\d+)$/;
const NO_ID = Number.NaN;
const STATUS = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  notFound: 404,
  methodNotAllowed: 405,
  conflict: 409,
  unprocessable: 422
} as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFilledText = (value: unknown): value is string => typeof value === "string" && value.trim() !== "";

const failure = ({ status, message }: { status: number; message: string }) => ({ status, body: { error: message } });

export function createApi() {
  const tasks = new Map<number, Task>();
  let nextId = 1;

  const listTasks: Handler = () => ({ status: STATUS.ok, body: { items: [...tasks.values()] } });

  const createTask: Handler = ({ body }) => {
    if (!isObject(body)) return failure({ status: STATUS.badRequest, message: "Body must be a JSON object" });
    if (!isFilledText(body.title)) return failure({ status: STATUS.unprocessable, message: "title must be a non-empty string" });
    const isDuplicate = [...tasks.values()].some(task => task.title === body.title);
    if (isDuplicate) return failure({ status: STATUS.conflict, message: "A task with this title already exists" });
    const task = { id: nextId++, title: body.title, done: false };
    tasks.set(task.id, task);
    return { status: STATUS.created, headers: { location: `${COLLECTION_PATH}/${task.id}` }, body: task };
  };

  const readTask: Handler = ({ id }) => {
    const task = tasks.get(id);
    if (!task) return failure({ status: STATUS.notFound, message: "Task not found" });
    return { status: STATUS.ok, body: task };
  };

  const replaceTask: Handler = ({ id, body }) => {
    if (!tasks.has(id)) return failure({ status: STATUS.notFound, message: "Task not found" });
    if (!isObject(body)) return failure({ status: STATUS.badRequest, message: "Body must be a JSON object" });
    if (!isFilledText(body.title) || typeof body.done !== "boolean") {
      return failure({ status: STATUS.unprocessable, message: "title must be a non-empty string and done a boolean" });
    }
    const task = { id, title: body.title, done: body.done };
    tasks.set(id, task);
    return { status: STATUS.ok, body: task };
  };

  const deleteTask: Handler = ({ id }) => {
    if (!tasks.delete(id)) return failure({ status: STATUS.notFound, message: "Task not found" });
    return { status: STATUS.noContent };
  };

  const collectionHandlers = new Map<string, Handler>([["GET", listTasks], ["POST", createTask]]);
  const itemHandlers = new Map<string, Handler>([["GET", readTask], ["PUT", replaceTask], ["DELETE", deleteTask]]);

  const handlersFor = (path: string) => {
    if (path === COLLECTION_PATH) return { handlers: collectionHandlers, id: NO_ID };
    const itemMatch = ITEM_PATH_PATTERN.exec(path);
    if (itemMatch) return { handlers: itemHandlers, id: Number(itemMatch[1]) };
    return null;
  };

  const handle = ({ method, path, body }: ApiRequest): ApiResponse => {
    const route = handlersFor(path);
    if (!route) return failure({ status: STATUS.notFound, message: "No such route" });
    const handler = route.handlers.get(method);
    if (!handler) {
      return { status: STATUS.methodNotAllowed, headers: { allow: [...route.handlers.keys()].join(", ") } };
    }
    return handler({ id: route.id, body });
  };

  return { handle };
}
