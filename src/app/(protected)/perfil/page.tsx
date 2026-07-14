import { redirect } from "next/navigation";
import { PerfilManager } from "@/features/perfil/perfil-manager";
import { requireSession } from "@/lib/auth-guards";
import { getPerfilUsuario } from "@/server/services/perfil";

type PerfilPageProps = {
  searchParams: Promise<{ alterarSenha?: string }>;
};

export default async function PerfilPage({ searchParams }: PerfilPageProps) {
  const session = await requireSession();
  const profile = await getPerfilUsuario(session.user.id);

  if (!profile) {
    redirect("/login");
  }

  const params = await searchParams;

  return (
    <PerfilManager
      initialProfile={profile}
      openPasswordInitially={params.alterarSenha === "1"}
    />
  );
}
