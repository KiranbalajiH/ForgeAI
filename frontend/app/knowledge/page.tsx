"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/app-layout";
import PageHeader from "@/components/common/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/axios";
import { Database, Upload, RefreshCw, Trash2, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface IngestedDocument {
  id: string;
  title: string;
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
  createdAt: string;
}

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<IngestedDocument[]>("/api/documents");
      setDocuments(response.data);
    } catch {
      // Quietly ignore or report error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for document status updates while items are PROCESSING or UPLOADED
  useEffect(() => {
    const hasUnfinishedDocs = documents.some(
      (doc) => doc.status === "UPLOADED" || doc.status === "PROCESSING"
    );
    if (!hasUnfinishedDocs) return;

    const timer = setInterval(() => {
      api.get<IngestedDocument[]>("/api/documents").then((res) => {
        setDocuments(res.data);
      }).catch(() => {});
    }, 3000);

    return () => clearInterval(timer);
  }, [documents]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await api.post("/api/documents", {
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      fetchDocuments();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to submit document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document from the knowledge base?")) return;
    try {
      await api.delete(`/api/documents/${id}`);
      fetchDocuments();
    } catch {
      alert("Failed to delete document.");
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Knowledge Base"
            description="Upload documents to construct the grounded semantic context used to answer user queries."
          />
          <Button variant="outline" size="sm" onClick={fetchDocuments} disabled={isLoading} className="gap-1.5 h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Document upload form card */}
          <Card className="md:col-span-1 border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Ingest New Content</CardTitle>
              </div>
              <CardDescription className="text-xs">Paste text content directly to chunk and index it.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="title" className="text-xs font-semibold text-muted-foreground">Document Title</label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Employee Handbook 2026"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="content" className="text-xs font-semibold text-muted-foreground">Text Content</label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste details here..."
                    className="min-h-[150px] text-xs"
                    required
                  />
                </div>
                {error && <p className="text-xs text-destructive flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{error}</p>}
                <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                  <Database className="h-4 w-4" />
                  {isSubmitting ? "Ingesting..." : "Ingest Document"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Document list card */}
          <Card className="md:col-span-2 border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Indexed Knowledge Sources</CardTitle>
              </div>
              <CardDescription className="text-xs">Grounded context references currently indexed in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 border rounded-lg border-dashed text-center">
                  <Database className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">No Knowledge Indexed</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">Paste and submit text to seed vector chunk lookup.</p>
                </div>
              ) : (
                <div className="divide-y border rounded-lg overflow-hidden">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 bg-card/50 hover:bg-card transition-colors">
                      <div className="flex flex-col min-w-0 pr-4">
                        <span className="font-semibold text-sm truncate">{doc.title}</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Uploaded {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {doc.status === "READY" && (
                          <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-500/10 border-emerald-500/20 gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Ready
                          </Badge>
                        )}
                        {doc.status === "PROCESSING" && (
                          <Badge variant="outline" className="text-xs text-blue-600 bg-blue-500/10 border-blue-500/20 gap-1.5">
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                            Processing
                          </Badge>
                        )}
                        {doc.status === "UPLOADED" && (
                          <Badge variant="outline" className="text-xs text-muted-foreground bg-muted border-border gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Uploaded
                          </Badge>
                        )}
                        {doc.status === "FAILED" && (
                          <Badge variant="outline" className="text-xs text-destructive bg-destructive/10 border-destructive/20 gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Failed
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
