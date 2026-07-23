import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import {
  createProjectSchema,
  updateProjectSchema,
} from "./project.validation";
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "./project.service";

interface ProjectParams {
  id: string;
}

export async function create(req: AuthRequest, res: Response) {
  try {
    const data = createProjectSchema.parse(req.body);

    const project = await createProject(req.user!.id, data);

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getAll(req: AuthRequest, res: Response) {
  const projects = await getProjects(req.user!.id);

  return res.json({
    success: true,
    data: projects,
  });
}

export async function getOne(
  req: AuthRequest<ProjectParams>,
  res: Response
) {
  const project = await getProjectById(
    req.params.id,
    req.user!.id
  );

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  return res.json({
    success: true,
    data: project,
  });
}

export async function update(
  req: AuthRequest<ProjectParams>,
  res: Response
) {
  try {
    const data = updateProjectSchema.parse(req.body);

    await updateProject(req.params.id, req.user!.id, data);

    return res.json({
      success: true,
      message: "Project updated successfully",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function remove(
  req: AuthRequest<ProjectParams>,
  res: Response
) {
  await deleteProject(req.params.id, req.user!.id);

  return res.json({
    success: true,
    message: "Project deleted successfully",
  });
}