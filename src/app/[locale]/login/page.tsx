import { LoginScreen } from "@/components/auth/login-screen";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const referralCode = ref?.trim() ? ref.trim().toUpperCase() : null;
  return <LoginScreen referralCode={referralCode} />;
}
