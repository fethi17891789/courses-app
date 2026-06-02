import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { PaymentsScreen } from "@/components/payments/payments-screen";

export default async function PaymentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <PaymentsScreen />;
}
