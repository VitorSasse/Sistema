import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withUnscopedPrisma } from "@/lib/prisma";
import { alterarSenhaSchema } from "@/lib/validators/perfil";

export async function PATCH(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const parsed = alterarSenhaSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Revise os campos informados.",
        issues: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const usuario = await withUnscopedPrisma((db) =>
    db.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, senhaHash: true }
    })
  );

  if (!usuario) {
    return NextResponse.json({ message: "Usuario nao encontrado." }, { status: 404 });
  }

  const senhaAtualCorreta = await bcrypt.compare(parsed.data.senhaAtual, usuario.senhaHash);

  if (!senhaAtualCorreta) {
    return NextResponse.json(
      {
        message: "A senha atual esta incorreta.",
        issues: { fieldErrors: { senhaAtual: ["A senha atual esta incorreta."] } }
      },
      { status: 400 }
    );
  }

  const repeteSenhaAtual = await bcrypt.compare(parsed.data.novaSenha, usuario.senhaHash);

  if (repeteSenhaAtual) {
    return NextResponse.json(
      {
        message: "A nova senha deve ser diferente da senha atual.",
        issues: { fieldErrors: { novaSenha: ["A nova senha deve ser diferente da senha atual."] } }
      },
      { status: 400 }
    );
  }

  const senhaHash = await bcrypt.hash(parsed.data.novaSenha, 10);

  await withUnscopedPrisma((db) =>
    db.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash }
    })
  );

  return NextResponse.json({ message: "Senha alterada com sucesso." });
}
