export interface Repository {
  id: string;
  name: string;
  language: string;
  status: "Active" | "Archived";
  health: number;
}