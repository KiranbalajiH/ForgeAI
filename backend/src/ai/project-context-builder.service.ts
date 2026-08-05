export interface ProjectContext {
  repository: string;

  project: any;

  package: any;

  readme: {
    exists: boolean;
    content: string;
  };

  entryPoint: {
    exists: boolean;
    path: string | null;
  };

  architecture: {
    controllers: string[];
    services: string[];
    routes: string[];
    middleware: string[];
    models: string[];
    configs: string[];
  };

  dependencies: {
    file: string;
    imports: string[];
  }[];

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
      package: data.package,
      readme: data.readme,
      entryPoint: data.entryPoint,
      architecture: data.architecture,
      dependencies: data.dependencies,
      files: data.files,
    };
  }
}