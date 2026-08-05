import fs from "fs";
import path from "path";

export interface PackageAnalysis {
  backend: any | null;
  frontend: any | null;
}

export class PackageAnalyzerService {
  analyze(repoName: string): PackageAnalysis | null {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const backendPackage = this.readPackage(
      path.join(repoPath, "backend", "package.json")
    );

    const frontendPackage = this.readPackage(
      path.join(repoPath, "frontend", "package.json")
    );

    if (!backendPackage && !frontendPackage) {
      return null;
    }

    return {
      backend: backendPackage,
      frontend: frontendPackage,
    };
  }

  private readPackage(packageJsonPath: string): any | null {
    if (!fs.existsSync(packageJsonPath)) {
      return null;
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8")
    );

    return {
      name: packageJson.name ?? "Unknown",
      version: packageJson.version ?? "Unknown",
      scripts: packageJson.scripts ?? {},
      dependencies: packageJson.dependencies ?? {},
      devDependencies: packageJson.devDependencies ?? {},
    };
  }
}