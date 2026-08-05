import fs from "fs";
import path from "path";

export interface ReadmeAnalysis {
  exists: boolean;
  content: string;
}

export class ReadmeAnalyzerService {
  analyze(repoName: string): ReadmeAnalysis {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const possibleReadmes = [
      "README.md",
      "README.MD",
      "README",
      "readme.md",
      "Readme.md",
    ];

    for (const fileName of possibleReadmes) {
      const readmePath = path.join(repoPath, fileName);

      if (fs.existsSync(readmePath)) {
        return {
          exists: true,
          content: fs.readFileSync(readmePath, "utf8"),
        };
      }
    }

    return {
      exists: false,
      content: "",
    };
  }
}