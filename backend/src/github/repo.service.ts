import simpleGit from "simple-git";
import fs from "fs";
import path from "path";

export class RepoService {
  async cloneRepository(repoUrl: string, repoName: string) {
    const tempDir = path.join(process.cwd(), "temp");
    const repoPath = path.join(tempDir, repoName);

    // Delete existing copy if present
    if (fs.existsSync(repoPath)) {
      fs.rmSync(repoPath, { recursive: true, force: true });
    }

    const git = simpleGit();

    await git.clone(repoUrl, repoPath);

    return {
      success: true,
      path: repoPath,
    };
  }
}