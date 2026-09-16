import AuthLayout from "@/components/auth/auth-layout";
import SignupForm from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start using Agentic RAG Knowledge Assistant today"
    >
      <SignupForm />
    </AuthLayout>
  );
}