import { ProjectContext } from "../project-context-builder.service";
import { FileRankingService } from "../../github/file-ranking.service";

const MAX_FILE_CONTENT_LENGTH = 3000;
const MAX_FILES = 15;

const fileRankingService = new FileRankingService();

export function buildFilesPrompt(
  context: ProjectContext
): string {
  const rankedFiles = fileRankingService.rank(context.files);

  const selectedFiles = rankedFiles
    .slice(0, MAX_FILES)
    .map((rankedFile) =>
      context.files.find((file) => file.path === rankedFile.path)!
    );

  const sections = selectedFiles.map((file) => {
    const content =
      file.content.length > MAX_FILE_CONTENT_LENGTH
        ? file.content.slice(0, MAX_FILE_CONTENT_LENGTH) +
          "\n\n... (truncated)"
        : file.content;

    return `
## ${file.path}

\`\`\`
${content}
\`\`\`
`;
  });

  return `
# Important Source Files

${sections.join("\n")}
`;
}