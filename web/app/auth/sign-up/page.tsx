import AuthLayout from "@/components/auth/auth-layout";
import SignUpForm from "@/components/auth/sign-up/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your healthcare journey with Sympto."
    >
      <SignUpForm />
    </AuthLayout>
  );
}