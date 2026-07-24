import { Request, Response } from "express";
import { connectGithubSchema } from "./github.validation";
import { getGithubUser } from "./github.service";

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