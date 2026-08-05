import fs from "fs";
import path from "path";

export interface EntryPointAnalysis {
  exists: boolean;
  path: string | null;
}

export class EntryPointDetectorService {
  private readonly possibleEntryPoints = [
    // Node.js / Express
    "src/server.ts",
    "src/server.js",
    "src/index.ts",
    "src/index.js",
    "server.ts",
    "server.js",
    "index.ts",
    "index.js",

    // NestJS
    "src/main.ts",

    // React / Vite
    "src/main.tsx",
    "src/main.jsx",

    // Next.js
    "app/page.tsx",
    "app/page.jsx",
    "pages/index.tsx",
    "pages/index.jsx",

    // Electron
    "main.js",
    "main.ts",
  ];

  detect(repoName: string): EntryPointAnalysis {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    for (const entryPoint of this.possibleEntryPoints) {
      const fullPath = path.join(repoPath, entryPoint);

      if (fs.existsSync(fullPath)) {
        return {
          exists: true,
          path: entryPoint,
        };
      }
    }

    return {
      exists: false,
      path: null,
    };
  }
}