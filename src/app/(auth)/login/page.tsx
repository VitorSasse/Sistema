import { redirect } from "next/navigation";
import { AccessEntry } from "@/components/access/access-entry";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return <AccessEntry mode="login" />;
}
