import path from "path";
import { FileService } from "./file.service";

export interface CodeSymbol {
  name: string;
  type:
    | "class"
    | "function"
    | "interface"
    | "type"
    | "enum"
    | "const";
}

export interface FileSymbols {
  file: string;
  symbols: CodeSymbol[];
}

export class SymbolAnalyzerService {
  private fileService = new FileService();

  analyze(repoName: string): FileSymbols[] {
    const repoPath = path.join(
      process.cwd(),
      "temp",
      repoName
    );

    const files = this.fileService
      .getAllFiles(repoPath)
      .filter((file) =>
        [".ts", ".tsx", ".js", ".jsx"].some((ext) =>
          file.path.endsWith(ext)
        )
      );

    const result: FileSymbols[] = [];

    for (const file of files) {
      const content = this.fileService.readFile(
        repoName,
        file.path
      );

      const symbols: CodeSymbol[] = [];

      const patterns = [
        {
          type: "class",
          regex: /export\s+class\s+(\w+)/g,
        },
        {
          type: "interface",
          regex: /export\s+interface\s+(\w+)/g,
        },
        {
          type: "type",
          regex: /export\s+type\s+(\w+)/g,
        },
        {
          type: "enum",
          regex: /export\s+enum\s+(\w+)/g,
        },
        {
          type: "function",
          regex: /export\s+(?:async\s+)?function\s+(\w+)/g,
        },
        {
          type: "const",
          regex: /export\s+const\s+(\w+)/g,
        },
      ] as const;

      for (const pattern of patterns) {
        for (const match of content.matchAll(
          pattern.regex
        )) {
          symbols.push({
            name: match[1],
            type: pattern.type,
          });
        }
      }

      result.push({
        file: file.path,
        symbols,
      });
    }

    return result;
  }
}