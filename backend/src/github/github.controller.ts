import { Request, Response } from "express";
import { connectGithubSchema } from "./github.validation";
import {
  getGithubUser,
  getUserRepositories,
} from "./github.service";

export async function connect(req: Request, res: Response) {
  try {
    const { token } = connectGithubSchema.parse(req.body);

    const user = await getGithubUser(token);

    return res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function repositories(req: Request, res: Response) {
  try {
    const { token } = connectGithubSchema.parse(req.body);

    const repos = await getUserRepositories(token);

    return res.json({
      success: true,
      data: repos,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}