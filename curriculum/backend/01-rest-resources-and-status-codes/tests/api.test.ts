import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";
import { z } from "zod";

type Response = {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
};
type Module = { createApi: () => { handle: (request: {
  method: string;
  path: string;
  body?: unknown;
}) => Response; }; };

const { createApi } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "api.ts"
});

const taskSchema = z.looseObject({
  id: z.number(),
  title: z.string()
});
const listSchema = z.looseObject({ items: z.array(taskSchema) });

function taskOf(response: Response) {
  return taskSchema.parse(response.body);
}

function itemsOf(response: Response) {
  return listSchema.parse(response.body).items;
}

function newApi() {
  return createApi().handle;
}

function createTask(handle: ReturnType<typeof newApi>, title: string) {
  return handle({
    method: "POST",
    path: "/tasks",
    body: {
      title
    }
  });
}

describe("collection: /tasks", () => {
  it("GET on an empty collection is 200 with an empty list", () => {
    expect(
      newApi()({
        method: "GET",
        path: "/tasks"
      })
    ).toMatchObject({
      status: 200,
      body: {
        items: []
      }
    });
  });

  it("POST creates the task: 201, the new task in the body, and a Location header pointing at it", () => {
    const response = createTask(newApi(), "Write tests");
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      title: "Write tests",
      done: false
    });
    expect(response.headers?.location).toBe("/tasks/1");
  });

  it("POST ignores fields it does not own: the server picks the id and done starts false", () => {
    const handle = newApi();
    const response = handle({
      method: "POST",
      path: "/tasks",
      body: {
        title: "sneaky",
        id: 99,
        done: true,
        owner: "mallory"
      }
    });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      title: "sneaky",
      done: false
    });
    expect(response.headers?.location).toBe("/tasks/1");
  });

  it("ids are never reused: a task created after a delete gets a new id and overwrites nothing", () => {
    const handle = newApi();
    createTask(handle, "first");
    createTask(handle, "second");
    handle({
      method: "DELETE",
      path: "/tasks/1"
    });
    expect(taskOf(createTask(handle, "third")).id).toBe(3);
    expect(
      taskOf(
        handle({
          method: "GET",
          path: "/tasks/2"
        })
      ).title
    ).toBe("second");
  });

  it("GET lists what POST created, in creation order", () => {
    const handle = newApi();
    createTask(handle, "first");
    createTask(handle, "second");
    const items = itemsOf(
      handle({
        method: "GET",
        path: "/tasks"
      })
    );
    expect(items.map(task => task.title)).toEqual(["first", "second"]);
  });

  it("POST with a title that already exists is 409 Conflict and does not create a second task", () => {
    const handle = newApi();
    createTask(handle, "same");
    expect(createTask(handle, "same").status).toBe(409);
    expect(
      itemsOf(
        handle({
          method: "GET",
          path: "/tasks"
        })
      )
    ).toHaveLength(1);
  });

  it("POST with no body or a body that is not a JSON object is 400 (the server cannot read it)", () => {
    const handle = newApi();
    expect(
      handle({
        method: "POST",
        path: "/tasks"
      }).status
    ).toBe(400);
    expect(
      handle({
        method: "POST",
        path: "/tasks",
        body: "just text"
      }).status
    ).toBe(400);
    expect(
      handle({
        method: "POST",
        path: "/tasks",
        body: ["title"]
      }).status
    ).toBe(400);
  });

  it("POST with a readable body but an invalid title is 422 (the server understood it and refuses it)", () => {
    const handle = newApi();
    expect(
      handle({
        method: "POST",
        path: "/tasks",
        body: {}
      }).status
    ).toBe(422);
    expect(
      handle({
        method: "POST",
        path: "/tasks",
        body: {
          title: 42
        }
      }).status
    ).toBe(422);
    expect(
      handle({
        method: "POST",
        path: "/tasks",
        body: {
          title: "   "
        }
      }).status
    ).toBe(422);
  });

  it("invalid POSTs create nothing", () => {
    const handle = newApi();
    handle({
      method: "POST",
      path: "/tasks",
      body: {}
    });
    expect(
      itemsOf(
        handle({
          method: "GET",
          path: "/tasks"
        })
      )
    ).toEqual([]);
  });
});

describe("item: /tasks/:id", () => {
  it("GET returns the task, or 404 when the id does not exist", () => {
    const handle = newApi();
    createTask(handle, "exists");
    expect(
      handle({
        method: "GET",
        path: "/tasks/1"
      })
    ).toMatchObject({
      status: 200,
      body: {
        id: 1,
        title: "exists"
      }
    });
    expect(
      handle({
        method: "GET",
        path: "/tasks/99"
      }).status
    ).toBe(404);
    expect(
      handle({
        method: "GET",
        path: "/tasks/not-a-number"
      }).status
    ).toBe(404);
  });

  it("an id must be a plain whole number: 1abc, 1.5, 1e0, 0x1 and -1 are not task 1", () => {
    const handle = newApi();
    createTask(handle, "exists");
    for (const id of ["1abc", "1.5", "1e0", "0x1", "-1", "+1"]) {
      expect(
        handle({
          method: "GET",
          path: `/tasks/${id}`
        }).status, `/tasks/${id}`
      ).toBe(404);
      expect(
        handle({
          method: "DELETE",
          path: `/tasks/${id}`
        }).status, `DELETE /tasks/${id}`
      ).toBe(404);
    }
    expect(
      itemsOf(
        handle({
          method: "GET",
          path: "/tasks"
        })
      )
    ).toHaveLength(1);
  });

  it("PUT replaces the whole task and answers 200 with the new version", () => {
    const handle = newApi();
    createTask(handle, "draft");
    const response = handle({
      method: "PUT",
      path: "/tasks/1",
      body: {
        title: "final",
        done: true
      }
    });
    expect(response).toMatchObject({
      status: 200,
      body: {
        id: 1,
        title: "final",
        done: true
      }
    });
    expect(
      handle({
        method: "GET",
        path: "/tasks/1"
      }).body
    ).toEqual({
      id: 1,
      title: "final",
      done: true
    });
  });

  it("PUT sets only title and done: a client cannot choose the id or add fields of its own", () => {
    const handle = newApi();
    createTask(handle, "draft");
    createTask(handle, "other");
    const response = handle({
      method: "PUT",
      path: "/tasks/1",
      body: {
        id: 2,
        title: "final",
        done: true,
        owner: "mallory"
      }
    });
    expect(response.body).toEqual({
      id: 1,
      title: "final",
      done: true
    });
    expect(
      handle({
        method: "GET",
        path: "/tasks/2"
      }).body
    ).toEqual({
      id: 2,
      title: "other",
      done: false
    });
  });

  it("PUT is idempotent: sending the same request twice leaves the same state and gives the same answer", () => {
    const handle = newApi();
    createTask(handle, "draft");
    const request = {
      method: "PUT",
      path: "/tasks/1",
      body: {
        title: "final",
        done: true
      }
    };
    const first = handle(request);
    const second = handle(request);
    expect(second).toEqual(first);
    expect(
      itemsOf(
        handle({
          method: "GET",
          path: "/tasks"
        })
      )
    ).toHaveLength(1);
  });

  it("PUT on a missing task is 404 and does not create it", () => {
    const handle = newApi();
    expect(
      handle({
        method: "PUT",
        path: "/tasks/5",
        body: {
          title: "ghost",
          done: false
        }
      }).status
    ).toBe(404);
    expect(
      itemsOf(
        handle({
          method: "GET",
          path: "/tasks"
        })
      )
    ).toEqual([]);
  });

  it("PUT with a body that is not an object is 400, and with invalid fields is 422", () => {
    const handle = newApi();
    createTask(handle, "draft");
    expect(
      handle({
        method: "PUT",
        path: "/tasks/1",
        body: "text"
      }).status
    ).toBe(400);
    expect(
      handle({
        method: "PUT",
        path: "/tasks/1",
        body: {
          title: "x"
        }
      }).status
    ).toBe(422);
    expect(
      handle({
        method: "PUT",
        path: "/tasks/1",
        body: {
          title: "x",
          done: "yes"
        }
      }).status
    ).toBe(422);
  });

  it("DELETE answers 204 with no body, and the task is gone", () => {
    const handle = newApi();
    createTask(handle, "temporary");
    const response = handle({
      method: "DELETE",
      path: "/tasks/1"
    });
    expect(response.status).toBe(204);
    expect(response.body).toBeUndefined();
    expect(
      handle({
        method: "GET",
        path: "/tasks/1"
      }).status
    ).toBe(404);
  });

  it("DELETE is idempotent in effect: the second one finds nothing and says 404", () => {
    const handle = newApi();
    createTask(handle, "temporary");
    handle({
      method: "DELETE",
      path: "/tasks/1"
    });
    expect(
      handle({
        method: "DELETE",
        path: "/tasks/1"
      }).status
    ).toBe(404);
  });
});

describe("routing", () => {
  it("an unknown path is 404", () => {
    expect(
      newApi()({
        method: "GET",
        path: "/users"
      }).status
    ).toBe(404);
    expect(
      newApi()({
        method: "GET",
        path: "/tasks/1/comments"
      }).status
    ).toBe(404);
  });

  it("a known path with a method it does not support is 405 and lists the allowed methods", () => {
    const handle = newApi();
    const onCollection = handle({
      method: "DELETE",
      path: "/tasks"
    });
    expect(onCollection.status).toBe(405);
    expect(onCollection.headers?.allow?.split(/,\s*/).sort()).toEqual(["GET", "POST"]);
    const onItem = handle({
      method: "POST",
      path: "/tasks/1"
    });
    expect(onItem.status).toBe(405);
    expect(onItem.headers?.allow?.split(/,\s*/).sort()).toEqual(["DELETE", "GET", "PUT"]);
  });

  it("every createApi() starts empty: no state is shared between instances", () => {
    createTask(newApi(), "leak?");
    expect(
      itemsOf(
        newApi()({
          method: "GET",
          path: "/tasks"
        })
      )
    ).toEqual([]);
  });
});
