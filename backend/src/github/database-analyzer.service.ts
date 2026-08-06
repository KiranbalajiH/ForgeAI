import fs from "fs";
import path from "path";

export interface DatabaseAnalysis {
  provider: string;
  orm: string;
  models: string[];
  generator: string;
}

export class DatabaseAnalyzerService {
  analyze(repoName: string): DatabaseAnalysis | null {
    const schemaPath = path.join(
      process.cwd(),
      "temp",
      repoName,
      "backend",
      "prisma",
      "schema.prisma"
    );

    if (!fs.existsSync(schemaPath)) {
      return null;
    }

    const schema = fs.readFileSync(schemaPath, "utf8");

    const provider =
      schema.match(/provider\s*=\s*"(.+?)"/)?.[1] ?? "Unknown";

    const generator =
      schema.match(
        /generator\s+\w+\s+\{[\s\S]*?provider\s*=\s*"(.+?)"/
      )?.[1] ?? "Unknown";

    const models = [...schema.matchAll(/model\s+(\w+)\s+\{/g)].map(
      (match) => match[1]
    );

    return {
      provider,
      orm: "Prisma",
      models,
      generator,
    };
  }
}