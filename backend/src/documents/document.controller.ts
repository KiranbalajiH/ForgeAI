import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { documentService } from "./document.service";

export class DocumentController {
  async list(_req: AuthRequest, res: Response) {
    try {
      const docs = await documentService.list();
      return res.json(docs);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async get(req: AuthRequest, res: Response) {
    try {
      const doc = await documentService.get(req.params.id);
      if (!doc) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      return res.json(doc);
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { title, content, metadata } = req.body;
      if (!title || !content) {
        return res.status(400).json({ success: false, message: "Title and content are required" });
      }
      const doc = await documentService.create({ title, content, metadata });
      return res.status(201).json({ success: true, document: doc });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await documentService.delete(req.params.id);
      return res.json({ success: true, message: "Document deleted successfully" });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
