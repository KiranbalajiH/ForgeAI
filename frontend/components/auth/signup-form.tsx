"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  signupSchema,
  SignupFormData,
} from "@/lib/auth-schema";

import { authService } from "@/services/auth-service";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(data: SignupFormData) {
    setServerError(null);
    try {
      await authService.signup(data);
      // Auto-login after signup
      const loginRes = await authService.login({ email: data.email, password: data.password });
      login(loginRes.data.token, loginRes.data.user);
      router.push("/");
    } catch (error: any) {
      console.error("Signup failed:", error);
      const msg = error?.response?.data?.message || error?.message || "Failed to create account.";
      setServerError(msg);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
    >
      {serverError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}
      <div className="space-y-2">
        <Label>Full Name</Label>

        <Input
          placeholder="John Doe"
          {...register("name")}
        />

        {errors.name && (
          <p className="text-sm text-red-500">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Email</Label>

        <Input
          type="email"
          placeholder="you@example.com"
          {...register("email")}
        />

        {errors.email && (
          <p className="text-sm text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Password</Label>

        <Input
          type="password"
          placeholder="••••••••"
          {...register("password")}
        />

        {errors.password && (
          <p className="text-sm text-red-500">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating..." : "Create Account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary hover:underline"
        >
          Sign In
        </Link>
      </p>
    </form>
  );
}