"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordForm() {
  return (
    <form className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>

        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
        />
      </div>

      <Button className="w-full">
        Send Reset Link
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="text-primary hover:underline"
        >
          Back to Login
        </Link>
      </p>
    </form>
  );
}