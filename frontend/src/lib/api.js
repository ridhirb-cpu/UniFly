const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

function getHeaders(token, isJson = true) {
  const headers = {};
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const api = {
  get: (path, token) =>
    request(path, {
      headers: getHeaders(token, false)
    }),

  post: (path, body, token) =>
    request(path, {
      method: "POST",
      headers: getHeaders(token, true),
      body: JSON.stringify(body)
    }),

  put: (path, body, token) =>
    request(path, {
      method: "PUT",
      headers: getHeaders(token, true),
      body: JSON.stringify(body)
    })
};
