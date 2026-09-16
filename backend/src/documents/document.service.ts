import { db } from "../utils/db";
import { logger } from "../utils/logger";
import { embeddingService } from "../embeddings/embedding.service";

export interface CreateDocumentInput {
  title: string;
  content: string;
  metadata?: any;
}

export interface TextChunk {
  content: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
}

export class DocumentService {
  async list() {
    return db.document.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async get(id: string) {
    return db.document.findUnique({
      where: { id },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return db.document.delete({
      where: { id },
    });
  }

  async create(input: CreateDocumentInput) {
    const document = await db.document.create({
      data: {
        title: input.title,
        content: input.content,
        status: "UPLOADED",
        metadata: input.metadata || {},
      },
    });

    // Start background processing asynchronously
    setImmediate(async () => {
      try {
        await this.processDocument(document.id, input.content);
      } catch (err) {
        logger.error(`[DocumentService] Error processing document ${document.id}:`, err);
        await db.document
          .update({
            where: { id: document.id },
            data: { status: "FAILED" },
          })
          .catch(() => {});
      }
    });

    return document;
  }

  private async processDocument(documentId: string, content: string) {
    logger.info(`[DocumentService] Processing document ${documentId}`);

    await db.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    // Chunk text with 500 chars size and 100 chars overlap
    const chunks = this.chunkText(content, 500, 100);
    logger.info(`[DocumentService] Generated ${chunks.length} chunks for document ${documentId}`);

    for (const chunk of chunks) {
      const embedding = await embeddingService.generateEmbedding(chunk.content);
      await db.documentChunk.create({
        data: {
          documentId,
          content: chunk.content,
          embedding: embedding as any, // Store float array as JSON
          metadata: {
            documentId,
            chunkIndex: chunk.chunkIndex,
            startChar: chunk.startChar,
            endChar: chunk.endChar,
          },
        },
      });
    }

    await db.document.update({
      where: { id: documentId },
      data: { status: "READY" },
    });

    logger.info(`[DocumentService] Document ${documentId} is READY`);
  }

  public chunkText(text: string, size: number = 500, overlap: number = 100): TextChunk[] {
    const chunks: TextChunk[] = [];
    if (!text || text.trim().length === 0) {
      return chunks;
    }

    let start = 0;
    let chunkIndex = 0;

    if (text.length <= size) {
      return [
        {
          content: text,
          chunkIndex: 0,
          startChar: 0,
          endChar: text.length,
        },
      ];
    }

    while (start < text.length) {
      const end = Math.min(start + size, text.length);
      chunks.push({
        content: text.slice(start, end),
        chunkIndex: chunkIndex++,
        startChar: start,
        endChar: end,
      });

      if (end >= text.length) break;
      start += size - overlap;
    }

    return chunks;
  }
}

export const documentService = new DocumentService();

