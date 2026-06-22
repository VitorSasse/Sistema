import { redirect } from "next/navigation";
import { AccessEntry } from "@/components/access/access-entry";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/inicio");
  }

  return <AccessEntry mode="home" />;
}
