"use client";

import { useState } from "react";
import PageTemplate from "@/components/common/page-template";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, CheckCircle2, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [saved, setSaved] = useState(false);

  const providers = [
    {
      id: "openai",
      name: "OpenAI",
      description: "Industry-standard LLMs including GPT-4o and o1 reasoning models.",
      models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-preview", "o1-mini"],
      defaultModel: "gpt-4o",
    },
    {
      id: "nvidia",
      name: "NVIDIA NIM",
      description: "GPU-accelerated enterprise AI models hosted on NVIDIA NIM architecture.",
      models: [
        "meta/llama-3.1-405b-instruct",
        "meta/llama-3.1-70b-instruct",
        "meta/llama-3.1-8b-instruct",
        "mistralai/mixtral-8x22b-instruct-v0.1",
        "nvidia/nemotron-4-340b-instruct",
      ],
      defaultModel: "meta/llama-3.1-70b-instruct",
    },
    {
      id: "qwen",
      name: "Qwen",
      description: "Alibaba Cloud DashScope models optimized for code, reasoning, and long-context analysis.",
      models: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long", "qwen-vl-plus", "qwen-vl-max"],
      defaultModel: "qwen-max",
    },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageTemplate
      title="Settings"
      description="Manage your ForgeAI preferences and AI provider configurations."
    >
      <div className="space-y-6 max-w-4xl">
        {/* AI Provider Configuration Section */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <CardTitle>AI Provider & Model Preferences</CardTitle>
            </div>
            <CardDescription>
              Select your default AI provider for Repository Chat, Code Analysis, and Engineering Intelligence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {providers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    selectedProvider === p.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "hover:border-primary/50 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{p.name}</span>
                    {selectedProvider === p.id && (
                      <Badge variant="default" className="text-[10px]">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>{p.models.length} Models available</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Model details */}
            {selectedProvider && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Available Models for {providers.find(p => p.id === selectedProvider)?.name}:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {providers.find(p => p.id === selectedProvider)?.models.map((m) => (
                    <Badge key={m} variant="outline" className="font-mono text-xs bg-background">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button onClick={handleSave} className="gap-2">
                {saved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Preferences Saved</span>
                  </>
                ) : (
                  <span>Save AI Preferences</span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTemplate>
  );
}