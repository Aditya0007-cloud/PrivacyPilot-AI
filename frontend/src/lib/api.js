import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:5001/api",
  timeout: 8000,
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
};

export const getHealth = async () => {
  const response = await api.get("/health");
  return response.data;
};

export const registerUser = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return response.data;
};

export const loginDemoUser = async (role) => {
  const response = await api.post("/auth/demo", { role });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const analyzePrivacyPolicy = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("policy", file);

  const response = await api.post("/privacy-policies/analyze", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 90000,
    onUploadProgress,
  });

  return response.data;
};

export const getLatestPrivacyPolicy = async () => {
  const response = await api.get("/privacy-policies/latest");
  return response.data;
};

export const getConsents = async () => {
  const response = await api.get("/consents");
  return response.data;
};

export const createConsent = async (payload) => {
  const response = await api.post("/consents", payload);
  return response.data;
};

export const withdrawConsent = async (id) => {
  const response = await api.patch(`/consents/${id}/withdraw`);
  return response.data;
};

export const getConsentOverview = async () => {
  const response = await api.get("/consents/overview");
  return response.data;
};

export const getDeletionRequests = async () => {
  const response = await api.get("/requests");
  return response.data;
};

export const createDeletionRequest = async (payload) => {
  const response = await api.post("/requests", payload);
  return response.data;
};

export const updateDeletionRequestStatus = async (id, payload) => {
  const response = await api.patch(`/requests/${id}/status`, payload);
  return response.data;
};

export const getDataRightsRequests = getDeletionRequests;
export const createDataRightsRequest = createDeletionRequest;
export const updateDataRightsRequestStatus = updateDeletionRequestStatus;

export const chatWithPrivacyAssistant = async (payload) => {
  const response = await api.post("/privacy-assistant/chat", payload);
  return response.data;
};

export const getAuditLogs = async (params = {}) => {
  const response = await api.get("/audit-logs", { params });
  return response.data;
};

export const getCompanyAnalytics = async () => {
  const response = await api.get("/analytics/company");
  return response.data;
};

export const getUserAnalytics = async () => {
  const response = await api.get("/analytics/user");
  return response.data;
};

export default api;
