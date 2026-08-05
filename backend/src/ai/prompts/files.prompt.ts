import { ProjectContext } from "../project-context-builder.service";

const MAX_FILE_CONTENT_LENGTH = 3000;
const MAX_FILES = 15;

export function buildFilesPrompt(
  context: ProjectContext
): string {
  const importantFiles = context.files
    .sort((a, b) => a.path.length - b.path.length)
    .slice(0, MAX_FILES);

  const sections = importantFiles.map((file) => {
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