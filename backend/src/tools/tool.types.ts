import { RetrievedSource } from "../retrieval/retrieval.types";

export interface Tool {
  name: string;
  description: string;
  execute(query: string, options?: any): Promise<RetrievedSource[]>;
}
