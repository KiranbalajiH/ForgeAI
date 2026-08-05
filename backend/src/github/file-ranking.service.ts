export interface RankedFile {
  path: string;
  score: number;
}

export class FileRankingService {
  rank(files: { path: string }[]): RankedFile[] {
    return files
      .map((file) => ({
        path: file.path,
        score: this.calculateScore(file.path),
      }))
      .sort((a, b) => b.score - a.score);
  }

  private calculateScore(path: string): number {
    const file = path.toLowerCase();

    if (file.endsWith("package.json")) return 100;

    if (file.endsWith("readme.md")) return 95;

    if (file.endsWith("src/server.ts")) return 95;

    if (file.endsWith("src/app.ts")) return 94;

    if (file.includes("controller")) return 90;

    if (file.includes("service")) return 88;

    if (file.includes("route")) return 86;

    if (file.includes("middleware")) return 84;

    if (file.includes("model")) return 82;

    if (file.endsWith("tsconfig.json")) return 80;

    if (file.endsWith(".env.example")) return 75;

    if (file.endsWith(".md")) return 70;

    if (file.endsWith(".ts")) return 60;

    if (file.endsWith(".tsx")) return 58;

    if (file.endsWith(".js")) return 55;

    if (file.endsWith(".jsx")) return 53;

    return 10;
  }
}