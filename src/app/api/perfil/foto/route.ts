import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withUnscopedPrisma } from "@/lib/prisma";

const dataUrlPattern = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=]+)$/i;

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ message: "Nao autenticado." }, { status: 401 });
  }

  const usuario = await withUnscopedPrisma((db) =>
    db.usuario.findUnique({
      where: { id: session.user.id },
      select: { fotoPerfilUrl: true }
    })
  );
  const match = usuario?.fotoPerfilUrl?.match(dataUrlPattern);

  if (!match) {
    return NextResponse.json({ message: "Foto de perfil nao encontrada." }, { status: 404 });
  }

  return new NextResponse(Buffer.from(match[2], "base64"), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": match[1],
      "X-Content-Type-Options": "nosniff"
    }
  });
}
