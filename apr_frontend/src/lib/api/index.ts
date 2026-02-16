import axios from "axios";
import type { Paper, PaperDetails, Highlight } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Papers API
export const papersApi = {
  list: async (): Promise<Paper[]> => {
    const response = await api.get<Paper[]>("/api/papers/");
    return response.data;
  },

  get: async (paperId: string): Promise<PaperDetails> => {
    const response = await api.get<{ paper: PaperDetails }>(`/api/papers/${paperId}`);
    return response.data.paper;
  },

  upload: async (file: File): Promise<Paper> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post<{ paper: Paper }>("/api/papers/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.paper;
  },

  delete: async (paperId: string): Promise<void> => {
    await api.delete(`/api/papers/${paperId}`);
  },
};

// Notes API
export const notesApi = {
  get: async (paperId: string): Promise<string> => {
    try {
      const response = await api.get<{ content: string }>(`/api/notes/${paperId}`);
      return response.data.content;
    } catch (error: any) {
      // If note doesn't exist, return empty string
      if (error?.response?.status === 404) {
        return "";
      }
      throw error;
    }
  },

  save: async (paperId: string, content: string): Promise<void> => {
    await api.put(`/api/notes/${paperId}`, { content });
  },
};

// Highlights API - not implemented in backend yet
export const highlightsApi = {
  list: async (_paperId: string): Promise<Highlight[]> => {
    return []; // Not implemented
  },

  create: async (_paperId: string, _highlight: Omit<Highlight, "id">): Promise<Highlight> => {
    throw new Error("Not implemented");
  },

  delete: async (_paperId: string, _highlightId: string): Promise<void> => {
    throw new Error("Not implemented");
  },
};

// AI Chat API
export const chatApi = {
  send: async (paperId: string, message: string, context?: string): Promise<string> => {
    const response = await api.post<{ response: string }>(`/api/ai/ask`, {
      paper_id: paperId,
      query: message,
      context,
    });
    return response.data.response;
  },
};

// PDF Blob API
export const pdfApi = {
  getBlob: async (paperId: string): Promise<Blob> => {
    const response = await api.get(`/api/papers/${paperId}/content`, {
      responseType: "blob",
    });
    return response.data;
  },
};

export default api;
