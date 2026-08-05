import { ProjectContext } from "../project-context-builder.service";

export function buildDependencyPrompt(
  context: ProjectContext
): string {
  const packageDependencies =
    context.package?.dependencies ?? [];

  const devDependencies =
    context.package?.devDependencies ?? [];

  const fileDependencies =
    context.dependencies;

  return `
# Dependencies

## Package Dependencies

${
  packageDependencies.length
    ? packageDependencies.map((pkg: string) => `- ${pkg}`).join("\n")
    : "None Detected"
}

## Development Dependencies

${
  devDependencies.length
    ? devDependencies.map((pkg: string) => `- ${pkg}`).join("\n")
    : "None Detected"
}

## File Import Relationships

${
  fileDependencies.length
    ? fileDependencies
        .map(
          (dependency) => `
${dependency.file}

${
  dependency.imports.length
    ? dependency.imports
        .map((imp: string) => `   → ${imp}`)
        .join("\n")
    : "   No Imports"
}
`
        )
        .join("\n")
    : "No Dependency Information Available"
}
`;
}