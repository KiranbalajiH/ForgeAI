export interface ProjectContext {
  repository: string;
  project: any;
  files: {
    path: string;
    size: number;
    content: string;
  }[];
}

export class ProjectContextBuilderService {
  build(data: any): ProjectContext {
    return {
      repository: data.repository,
      project: data.project,
      files: data.files,
    };
  }
}