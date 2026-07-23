import { PrismaClient } from "@prisma/client";
import {
  CreateProjectInput,
  UpdateProjectInput,
} from "./project.validation";

const prisma = new PrismaClient();

export async function createProject(
  userId: string,
  data: CreateProjectInput
) {
  return prisma.project.create({
    data: {
      title: data.title,
      description: data.description,
      userId,
    },
  });
}

export async function getProjects(userId: string) {
  return prisma.project.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getProjectById(
  id: string,
  userId: string
) {
  return prisma.project.findFirst({
    where: {
      id,
      userId,
    },
  });
}

export async function updateProject(
  id: string,
  userId: string,
  data: UpdateProjectInput
) {
  return prisma.project.updateMany({
    where: {
      id,
      userId,
    },
    data,
  });
}

export async function deleteProject(
  id: string,
  userId: string
) {
  return prisma.project.deleteMany({
    where: {
      id,
      userId,
    },
  });
}