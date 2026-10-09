import { AuthCard, AuthForm } from "@/components/auth-form";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" subtitle="Log in to your wardrobe.">
      <AuthForm mode="login" />
    </AuthCard>
  );
}
