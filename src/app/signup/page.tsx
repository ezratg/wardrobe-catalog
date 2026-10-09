import { AuthCard, AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthCard title="Start your wardrobe" subtitle="Snap your clothes, and we'll turn them into a catalog.">
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
