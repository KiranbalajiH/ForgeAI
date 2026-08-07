import path from "path";
import { RETRIEVAL_CONFIG } from "../config/retrieval.config";

export interface SearchCandidate {
  id?: string;
  type?: string;
  name: string;
  filePath?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, any>;
}

export type SearchIntent =
  | "Code Explanation"
  | "Symbol Lookup"
  | "Error Investigation"
  | "File Discovery"
  | "Architecture Question"
  | "General Search";

/**
 * Splits camelCase, PascalCase, kebab-case, snake_case, and dot-separated strings into lowercase word tokens.
 */
function tokenize(str: string): string[] {
  if (!str) return [];
  const expanded = str
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return expanded
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/**
 * Common developer query synonyms and abbreviations.
 */
const SYNONYMS: Record<string, string[]> = {
  authentication: ["auth", "login", "jwt", "session"],
  auth: ["authentication", "login", "jwt", "session"],
  repository: ["repo", "store"],
  repo: ["repository", "store"],
  database: ["db", "prisma", "sql", "model"],
  db: ["database", "prisma", "sql", "model"],
  middleware: ["interceptor", "filter", "guard"],
  chat: ["message", "conversation"],
  analysis: ["analyzer", "pipeline", "summary"],
};

/**
 * RelevanceScoringService
 *
 * Responsibility: Ranks and scores search candidates against a query using heuristic rules:
 *  - Configurable minimum relevance score threshold (from RETRIEVAL_CONFIG)
 *  - Intent classification (Code Explanation, Symbol Lookup, Error Investigation, File Discovery, Architecture Question, General Search)
 *  - Exact symbol, filename, controller/service name match
 *  - Supports exact, prefix, substring, camelCase, kebab-case, and snake_case matching
 *  - Domain-aware folder relevance and intent-specific scoring boosts
 *  - Ignoring generated files, node_modules, and build output
 *
 * Exposes:
 *  - classifyIntent(query: string): SearchIntent
 *  - score(query: string, candidate: SearchCandidate, intent?: SearchIntent): number
 *  - rank<T extends SearchCandidate>(query: string, candidates: T[], intent?: SearchIntent): T[]
 */
export class RelevanceScoringService {
  /**
   * Classifies user queries into one of 6 search intents using rule-based heuristics.
   */
  classifyIntent(query: string): SearchIntent {
    if (!query || !query.trim()) return "General Search";
    const q = query.trim().toLowerCase();

    // 1. Code Explanation
    if (
      /\b(explain|how does|how do|what does|walkthrough|understand|describe|implementation|works?|logic|details)\b/i.test(
        q
      )
    ) {
      return "Code Explanation";
    }

    // 2. File Discovery
    if (
      /\b(file|path|location|directory|folder|where is|locate)\b/i.test(q) ||
      /\.[a-z0-9]{1,4}$/i.test(q)
    ) {
      return "File Discovery";
    }

    // 3. Architecture Question
    if (
      /\b(architecture|structure|components|design|overview|flow|diagram|dependencies|relationships|system|stack)\b/i.test(
        q
      )
    ) {
      return "Architecture Question";
    }

    // 4. Error Investigation
    if (
      /\b(error|exception|bug|issue|fail(ing|s|ed)?|crash|stack\s*trace|fix|catch|throw|invalid|broken|logs?|validator|validation)\b/i.test(
        q
      )
    ) {
      return "Error Investigation";
    }

    // 5. Symbol Lookup
    if (
      /\b(function|method|class|interface|type|enum|symbol|constant|variable)\b/i.test(
        q
      ) ||
      /^symbol\s+/i.test(q)
    ) {
      return "Symbol Lookup";
    }

    // Default fallback
    return "General Search";
  }

  /**
   * Calculates a relevance score for a single candidate based on heuristic rules & intent boosts.
   *
   * @param query - Raw or normalized search query
   * @param candidate - Search candidate chunk or match object
   * @param intent - Optional pre-classified SearchIntent
   * @returns Relevance score (0 if candidate is ignored or non-matching)
   */
  score(query: string, candidate: SearchCandidate, intent?: SearchIntent): number {
    if (!query || !query.trim() || !candidate) {
      return 0;
    }

    const normQuery = query.trim().toLowerCase();

    // 1. Filter out ignored files (node_modules, generated files, build output)
    if (this.isIgnored(candidate)) {
      return 0;
    }

    const name = candidate.name || "";
    const filePath = candidate.filePath || "";
    const fileName = filePath ? path.basename(filePath) : name;
    const fileNameNoExt = fileName.replace(/\.[^/.]+$/, "");
    const content = candidate.content || "";

    const isSymbol = candidate.type === "symbol";
    const isController = candidate.type === "controller";
    const isService = candidate.type === "service";
    const isFile = candidate.type === "file" || candidate.type === "module" || candidate.type === "summary";
    const isRoute = candidate.type === "apiRoute";
    const isModel = candidate.type === "databaseModel";

    // Build tokenized representations
    const queryTokens = tokenize(normQuery);
    const nameTokens = tokenize(name);
    const fileTokens = tokenize(fileNameNoExt);
    const pathTokens = tokenize(filePath);

    // Expand search terms with synonyms & tokens
    const searchTerms = new Set<string>([normQuery, ...queryTokens]);
    for (const term of Array.from(searchTerms)) {
      const syns = SYNONYMS[term];
      if (syns) {
        syns.forEach((s) => searchTerms.add(s));
      }
    }

    const nameNorm = name.toLowerCase();
    const fileNameNorm = fileName.toLowerCase();
    const filePathNorm = filePath.toLowerCase();
    const contentNorm = content.toLowerCase();

    const nameKebab = nameTokens.join("-");
    const nameSnake = nameTokens.join("_");
    const nameCamel = nameTokens.join("");

    let baseScore = 0;

    for (const qTerm of Array.from(searchTerms)) {
      if (!qTerm) continue;

      // 2. Exact Symbol / Model / Filename / Controller / Service Match
      if (isSymbol && (nameNorm === qTerm || nameTokens.includes(qTerm))) {
        baseScore = Math.max(baseScore, 100);
      } else if ((isController || isService) && (nameNorm === qTerm || fileTokens.includes(qTerm) || nameTokens.includes(qTerm))) {
        baseScore = Math.max(baseScore, 99);
      } else if (isModel && (nameNorm === qTerm || nameTokens.includes(qTerm))) {
        baseScore = Math.max(baseScore, 98);
      } else if (isFile && (fileNameNorm === qTerm || fileTokens.includes(qTerm) || nameNorm === qTerm)) {
        baseScore = Math.max(baseScore, 98);
      } else if (nameNorm === qTerm || nameKebab === qTerm || nameSnake === qTerm || nameCamel === qTerm) {
        baseScore = Math.max(baseScore, 96);
      } else if (isRoute && (nameNorm === qTerm || filePathNorm.includes(qTerm) || (candidate.metadata?.path && String(candidate.metadata.path).toLowerCase().includes(qTerm)))) {
        baseScore = Math.max(baseScore, 96);
      }

      // 3. Prefix Match (camelCase, kebab-case, snake_case, tokens, filename, path)
      else if (
        nameNorm.startsWith(qTerm) ||
        fileNameNorm.startsWith(qTerm) ||
        nameKebab.startsWith(qTerm) ||
        nameSnake.startsWith(qTerm) ||
        nameCamel.startsWith(qTerm) ||
        nameTokens.some((t) => t.startsWith(qTerm)) ||
        fileTokens.some((t) => t.startsWith(qTerm))
      ) {
        const score = isSymbol ? 86 : isController || isService ? 84 : 83;
        baseScore = Math.max(baseScore, score);
      } else if (filePathNorm.startsWith(qTerm) || pathTokens.some((t) => t.startsWith(qTerm))) {
        baseScore = Math.max(baseScore, 80);
      }

      // 4. Substring Match (camelCase, kebab-case, snake_case, tokens, filename, path)
      else if (
        nameNorm.includes(qTerm) ||
        fileNameNorm.includes(qTerm) ||
        nameKebab.includes(qTerm) ||
        nameSnake.includes(qTerm) ||
        nameCamel.includes(qTerm) ||
        nameTokens.some((t) => t.includes(qTerm)) ||
        fileTokens.some((t) => t.includes(qTerm))
      ) {
        const score = isSymbol ? 66 : isController || isService ? 62 : 60;
        baseScore = Math.max(baseScore, score);
      } else if (filePathNorm.includes(qTerm) || pathTokens.some((t) => t.includes(qTerm))) {
        baseScore = Math.max(baseScore, 55);
      }

      // 5. Content Substring Fallback
      else if (contentNorm.includes(qTerm)) {
        baseScore = Math.max(baseScore, 20);
      }
    }

    // Candidate MUST have a keyword or content match to receive a positive score
    if (baseScore <= 0) {
      return 0;
    }

    // 6. Folder Relevance Boost
    const folderBoost = this.getFolderBoost(filePath, normQuery);

    // 7. Path Length Boost (Shorter paths get slightly higher score)
    let pathBoost = 0;
    if (filePath) {
      const pathDepth = filePath.split(/[/\\]/).filter(Boolean).length;
      pathBoost = Math.max(0, 5 - pathDepth * 0.5);
    }

    // 8. Symbol Tie-Breaker
    const symbolBonus = isSymbol ? 0.5 : 0;

    // 9. Intent-Aware Boosts
    const searchIntent = intent ?? this.classifyIntent(query);
    let intentBoost = 0;

    switch (searchIntent) {
      case "Code Explanation":
        if (candidate.type === "file" || candidate.type === "service") {
          intentBoost += 15;
        }
        break;

      case "Symbol Lookup":
        if (isSymbol) {
          intentBoost += 25;
        }
        break;

      case "Error Investigation":
        const isErrorContext =
          /[/\\](middleware|validator|error|exception|logger|log)[/\\]/i.test(filePath) ||
          /\b(error|exception|catch|throw|validate|middleware)\b/i.test(name);
        if (isErrorContext) {
          intentBoost += 25;
        }
        break;

      case "File Discovery":
        if (isFile) {
          intentBoost += 20;
        }
        break;

      case "Architecture Question":
        if (
          isController ||
          isService ||
          isRoute ||
          isModel ||
          candidate.type === "relationship"
        ) {
          intentBoost += 20;
        }
        break;

      default:
        break;
    }

    const finalScore = baseScore + folderBoost + pathBoost + symbolBonus + intentBoost;
    return finalScore >= RETRIEVAL_CONFIG.minRelevanceScore ? finalScore : 0;
  }

  /**
   * Evaluates if a search candidate should be ignored.
   * Strictly ignores node_modules, generated files, and build output.
   */
  private isIgnored(candidate: SearchCandidate): boolean {
    const filePath = candidate.filePath || "";
    if (!filePath) return false;

    // Ignore node_modules
    if (/(^|[/\\])node_modules([/\\]|$)/i.test(filePath)) {
      return true;
    }

    // Ignore generated files and build outputs
    const isGeneratedDir = /(^|[/\\])(dist|build|\.next|\.output|coverage|\.turbo|\.cache|out)([/\\]|$)/i.test(
      filePath
    );
    const isGeneratedFile = /\.(min\.js|min\.css|map|lock)$|package-lock\.json|yarn\.lock|pnpm-lock\.yaml/i.test(
      filePath
    );
    if (isGeneratedDir || isGeneratedFile) {
      return true;
    }

    return false;
  }

  /**
   * Calculates folder relevance boost.
   */
  private getFolderBoost(filePath: string | undefined, normQuery: string): number {
    if (!filePath) return 0;
    const normalizedPath = filePath.toLowerCase();

    const folders = normalizedPath.split(/[/\\]/);
    if (folders.some((f) => f === normQuery || f.includes(normQuery))) {
      return 15;
    }

    const isAuthQuery = /\b(auth|authentication|login|jwt|token|session|security|permission)\b/i.test(
      normQuery
    );
    if (isAuthQuery) {
      const isAuthFolder = /[/\\](auth|middleware|jwt|security|login|session)[/\\]/i.test(
        normalizedPath
      );
      if (isAuthFolder) {
        return 15;
      }
    }

    const isDbQuery = /\b(db|database|model|prisma|schema|entity|repository)\b/i.test(
      normQuery
    );
    if (isDbQuery) {
      const isDbFolder = /[/\\](db|database|models|entities|prisma|schemas)[/\\]/i.test(
        normalizedPath
      );
      if (isDbFolder) {
        return 15;
      }
    }

    const isApiQuery = /\b(api|route|endpoint|controller|http)\b/i.test(
      normQuery
    );
    if (isApiQuery) {
      const isApiFolder = /[/\\](api|routes|controllers|endpoints)[/\\]/i.test(
        normalizedPath
      );
      if (isApiFolder) {
        return 15;
      }
    }

    return 0;
  }

  /**
   * Sorts candidate search matches by relevance score in descending order.
   * Updates each candidate's `score` property.
   *
   * @param query - Search query string
   * @param candidates - List of search candidate objects
   * @param intent - Optional pre-classified SearchIntent
   * @returns Array of candidates sorted by relevance score
   */
  rank<T extends SearchCandidate>(
    query: string,
    candidates: T[],
    intent?: SearchIntent
  ): T[] {
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const searchIntent = intent ?? this.classifyIntent(query);

    const scored = candidates
      .map((candidate) => {
        const computedScore = this.score(query, candidate, searchIntent);
        return { candidate, score: computedScore };
      })
      .filter((item) => item.score >= RETRIEVAL_CONFIG.minRelevanceScore);

    scored.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aIsSymbol = a.candidate.type === "symbol" ? 1 : 0;
      const bIsSymbol = b.candidate.type === "symbol" ? 1 : 0;
      return bIsSymbol - aIsSymbol;
    });

    return scored.map((item) => {
      item.candidate.score = item.score;
      return item.candidate;
    });
  }
}
