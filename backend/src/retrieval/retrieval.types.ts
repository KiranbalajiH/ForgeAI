export interface VectorSearchResult {
  id: string;
  documentId: string;
  title: string;
  content: string;
  score: number;
  metadata?: any;
}

export interface RetrievedSource {
  id: string;
  sourceType: "vector" | "web" | "api";
  title: string;
  content: string;
  url?: string;
  metadata?: any;
  relevanceScore?: number;
}
