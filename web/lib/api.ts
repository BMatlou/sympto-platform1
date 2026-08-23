import axios from "axios";
import { toast } from "sonner";

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!configured) {
    return "http://localhost:3001/api";
  }

  // NestJS is configured with a global `/api` prefix. Accept either
  // `https://api.example.com` or `https://api.example.com/api` so the
  // frontend cannot accidentally call the unprefixed route and receive 404.
  return configured.replace(/\/+$/, "").replace(/\/api$/i, "") + "/api";
}

export const api = axios.create({
  baseURL: getApiBaseUrl(),
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

function getApiErrorMessage(error: any) {
  const message = error?.response?.data?.message;
  if (Array.isArray(message)) return message.join(" ");
  if (typeof message === "string" && message.trim()) return message;
  if (error?.code === "ERR_NETWORK") return "Sympto could not reach the health service. Please try again.";
  return "Something went wrong. Please try again.";
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
          const refreshToken = localStorage.getItem("refreshToken");

          if (!refreshToken) {
            throw new Error("No refresh token available.");
          }

          const response = await axios.post(
            `${getApiBaseUrl()}/auth/refresh`,
            { refreshToken }
          );
          const tokens = unwrapResponseData<{
            accessToken: string;
            refreshToken: string;
          }>(response);

          localStorage.setItem("accessToken", tokens.accessToken);
          localStorage.setItem("refreshToken", tokens.refreshToken);
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
        if (typeof window !== "undefined") window.location.href = "/auth/sign-in";
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    if (typeof window !== "undefined" && error.response?.status !== 401) {
      toast.error("Sympto couldn't complete that action", {
        description: getApiErrorMessage(error),
      });
    }

    return Promise.reject(error);
  }
);
