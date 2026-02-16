export interface Paper {
  id: string;
  name: string;
  title?: string;
  author?: string;
  page_count: number;
  file_size: number;
  thumbnail_url?: string;
  upload_date?: string;
  notes_count?: number;
}

export interface PaperDetails extends Paper {
  notes?: string;
  highlights?: Highlight[];
}

export interface Highlight {
  id: string;
  page: number;
  text: string;
  color: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  paperId: string;
  messages: ChatMessage[];
}
