import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the firebase auth module BEFORE importing api.js so the interceptor
// captures the mocked currentUser.
const getIdToken = vi.fn(() => Promise.resolve("fake-id-token"));
let currentUser = { getIdToken };

vi.mock("../firebase", () => ({
  auth: {
    get currentUser() {
      return currentUser;
    },
  },
}));

// Mock axios so we can spy on requests without hitting the network.
const requestInterceptors = [];
const responseInterceptors = [];
const requestMock = vi.fn();

vi.mock("axios", () => {
  const create = vi.fn(() => ({
    interceptors: {
      request: {
        use: (fn) => {
          requestInterceptors.push(fn);
        },
      },
      response: {
        use: (ok, err) => {
          responseInterceptors.push({ ok, err });
        },
      },
    },
    get: (...args) => requestMock("get", ...args),
    post: (...args) => requestMock("post", ...args),
    put: (...args) => requestMock("put", ...args),
    delete: (...args) => requestMock("delete", ...args),
  }));
  return { default: { create } };
});

const apiPromise = import("../services/api");

describe("services/api", () => {
  beforeEach(() => {
    requestMock.mockReset();
    getIdToken.mockClear();
    currentUser = { getIdToken };
  });

  it("attaches a Firebase ID token to outgoing requests", async () => {
    await apiPromise;
    const interceptor = requestInterceptors[0];
    expect(interceptor).toBeTypeOf("function");

    const config = { headers: {} };
    const out = await interceptor(config);
    expect(out.headers.Authorization).toBe("Bearer fake-id-token");
    expect(getIdToken).toHaveBeenCalledOnce();
  });

  it("does not attach a token when no user is signed in", async () => {
    await apiPromise;
    currentUser = null;
    const interceptor = requestInterceptors[0];
    const out = await interceptor({ headers: {} });
    expect(out.headers.Authorization).toBeUndefined();
  });

  it("normalizes errors to {status, message}", async () => {
    await apiPromise;
    const { err } = responseInterceptors[0];
    await expect(
      err({ response: { status: 404, data: { error: "not found" } } }),
    ).rejects.toMatchObject({ status: 404, message: "not found" });
  });

  it("invalidateCache clears entries by prefix", async () => {
    const api = await apiPromise;
    requestMock.mockResolvedValue({ data: { routes: [{ id: "1" }] } });
    const first = await api.fetchRoutes();
    const second = await api.fetchRoutes();
    expect(first).toEqual(second);
    expect(requestMock).toHaveBeenCalledTimes(1); // cached
    api.invalidateCache("routes");
    requestMock.mockResolvedValue({ data: { routes: [{ id: "2" }] } });
    const third = await api.fetchRoutes();
    expect(third).toEqual([{ id: "2" }]);
    expect(requestMock).toHaveBeenCalledTimes(2);
  });
});
