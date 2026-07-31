import fs from "fs";
import path from "path";

export class ProjectDetectorService {
  detect(repoName: string) {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const packageJsonPath = path.join(repoPath, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return {
        language: "Unknown",
        framework: "Unknown",
        packageManager: "Unknown",
      };
    }

    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8")
    );

    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    let framework = "Node.js";

    if (dependencies.next) {
      framework = "Next.js";
    } else if (dependencies.react) {
      framework = "React";
    } else if (dependencies.express) {
      framework = "Express";
    } else if (dependencies["@nestjs/core"]) {
      framework = "NestJS";
    }

    let packageManager = "npm";

    if (fs.existsSync(path.join(repoPath, "yarn.lock"))) {
      packageManager = "yarn";
    } else if (fs.existsSync(path.join(repoPath, "pnpm-lock.yaml"))) {
      packageManager = "pnpm";
    } else if (fs.existsSync(path.join(repoPath, "bun.lockb"))) {
      packageManager = "bun";
    }

    return {
      language: "TypeScript",
      framework,
      packageManager,
    };
  }
}