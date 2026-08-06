import path from "path";
import { FileService } from "./file.service";

export interface ApiRoute {
  method: string;
  path: string;
  file: string;
  handler: string;
  middleware: string[];
}

export class ApiRouteAnalyzerService {
  private fileService = new FileService();

  analyze(repoName: string): ApiRoute[] {
    const repoPath = path.join(process.cwd(), "temp", repoName);

    const files = this.fileService
      .getAllFiles(repoPath)
      .filter((file) => file.path.endsWith(".routes.ts"));

    const routes: ApiRoute[] = [];

    const routeRegex =
      /router\.(get|post|put|delete|patch)\(\s*["`](.*?)["`]\s*,\s*(.*?)\);?/g;

    for (const file of files) {
      const content = this.fileService.readFile(
        repoName,
        file.path
      );

      const matches = content.matchAll(routeRegex);

      for (const match of matches) {
        const method = match[1].toUpperCase();
        const routePath = match[2];
        const handlers = match[3]
          .split(",")
          .map((item) => item.trim());

        const handler = handlers[handlers.length - 1];
        const middleware = handlers.slice(0, -1);

        routes.push({
          method,
          path: routePath,
          file: file.path,
          handler,
          middleware,
        });
      }
    }

    return routes;
  }
}