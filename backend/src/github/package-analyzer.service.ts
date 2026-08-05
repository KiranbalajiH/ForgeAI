import fs from "fs";
import path from "path";

export interface PackageAnalysis {
  name: string;
  version: string;
  packageManager: string;
  scripts: Record<string, string>;
  dependencies: string[];
  devDependencies: string[];
}

export class PackageAnalyzerService {
  analyze(repoName: string): PackageAnalysis | null {
    const packageJsonPath = path.join(
      process.cwd(),
      "temp",
      repoName,
      "package.json"
    );

    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8")
    );

    let packageManager = "npm";

    const repoPath = path.join(process.cwd(), "temp", repoName);

    if (fs.existsSync(path.join(repoPath, "yarn.lock"))) {
      packageManager = "yarn";
    } else if (fs.existsSync(path.join(repoPath, "pnpm-lock.yaml"))) {
      packageManager = "pnpm";
    } else if (fs.existsSync(path.join(repoPath, "bun.lockb"))) {
      packageManager = "bun";
    }

    return {
      name: packageJson.name ?? "Unknown",
      version: packageJson.version ?? "Unknown",
      packageManager,
      scripts: packageJson.scripts ?? {},
      dependencies: Object.keys(packageJson.dependencies ?? {}),
      devDependencies: Object.keys(packageJson.devDependencies ?? {}),
    };
  }
}