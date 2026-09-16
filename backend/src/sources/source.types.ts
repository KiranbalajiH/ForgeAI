export interface Citation {
  index: number;
  documentId: string;
  chunkId: string;
  title: string;
  score?: number;
  snippet?: string;
  type?: string;
}

export interface SourceReference {
  index?: number;
  documentId?: string;
  chunkId?: string;
  name: string;
  title?: string;
  path: string;
  type?: string;
  lineNumber?: number;
  score?: number;
}
