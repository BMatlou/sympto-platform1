import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

function unwrapResponseData<T>(response: { data: { data?: T } | T }): T {
  const payload = response.data;
  return typeof payload === "object" && payload !== null && "data" in payload
    ? payload.data as T
    : payload as T;
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        refreshPromise = (async () => {
          const refreshToken =
            localStorage.getItem("refreshToken");

          if (!refreshToken) {
            throw new Error("No refresh token available.");
          }

          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
            {
              refreshToken,
            }
          );
          const tokens = unwrapResponseData<{
            accessToken: string;
            refreshToken: string;
          }>(response);

          localStorage.setItem(
            "accessToken",
            tokens.accessToken
          );

          localStorage.setItem(
            "refreshToken",
            tokens.refreshToken
          );
          return tokens.accessToken;
        })();
      }

      try {
        const accessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          window.location.href = "/auth/sign-in";
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    return Promise.reject(error);
  }
  
);
