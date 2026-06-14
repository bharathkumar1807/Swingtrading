import { api } from "@/services/api";
import type { IntradayPreview, IntradaySession, IntradaySessionSummary } from "@/types";

export const intradayApi = {
  preview: async (file: File): Promise<IntradayPreview> => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<IntradayPreview>("/intraday/preview", form)).data;
  },

  import: async (file: File): Promise<IntradaySession> => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<IntradaySession>("/intraday/import", form)).data;
  },

  getSessions: async (): Promise<IntradaySessionSummary[]> =>
    (await api.get<IntradaySessionSummary[]>("/intraday/sessions")).data,

  getSession: async (id: string): Promise<IntradaySession> =>
    (await api.get<IntradaySession>(`/intraday/sessions/${id}`)).data,

  deleteSession: async (id: string): Promise<void> => {
    await api.delete(`/intraday/sessions/${id}`);
  },
};
