import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";
import { getUserSettingsCollection, serializeUserSettings } from "@/lib/mongodb";
import { emailToName, findOrCreateUserByEmail, userHasPassword } from "@/lib/users";
import type { UserSettingsResponse } from "@/types/project";

async function buildSettingsResponse(
  doc: Record<string, unknown>,
  collection: Awaited<ReturnType<typeof getUserSettingsCollection>>,
  leaderEmail: string,
): Promise<UserSettingsResponse> {
  const userId = (doc.userId as ObjectId).toHexString();
  const normalizedLeader = leaderEmail.toLowerCase();
  const subordinates = await collection
    .find({ managerEmail: normalizedLeader, email: { $ne: normalizedLeader } })
    .toArray();

  return {
    ...serializeUserSettings(doc),
    isManager: subordinates.length > 0,
    hasPassword: await userHasPassword(userId),
    subordinates: subordinates.map((s) => ({
      id: (s.userId as ObjectId).toHexString(),
      email: s.email ?? "",
      name: s.name ?? emailToName(s.email ?? ""),
    })),
  };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const email = session.user.email.toLowerCase();
    const collection = await getUserSettingsCollection();

    let doc = await collection.findOne({ userId: new ObjectId(userId) });
    if (!doc) {
      await findOrCreateUserByEmail(email, session.user.name ?? undefined);
      doc = await collection.findOne({ userId: new ObjectId(userId) });
    }

    if (!doc) {
      return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
    }

    return NextResponse.json(await buildSettingsResponse(doc, collection, email));
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const email = session.user.email.toLowerCase();
    const body = await req.json();
    const collection = await getUserSettingsCollection();

    const managerEmail =
      body.managerEmail !== undefined
        ? body.managerEmail?.trim().toLowerCase() || undefined
        : undefined;
    const managerName =
      body.managerName !== undefined ? body.managerName?.trim() || undefined : undefined;
    const emailSignature =
      body.emailSignature !== undefined ? body.emailSignature?.trim() || undefined : undefined;

    if (managerEmail === email) {
      return NextResponse.json({ error: "Você não pode ser seu próprio gestor" }, { status: 400 });
    }

    const $set: Record<string, unknown> = {
      userId: new ObjectId(userId),
      email,
      name: session.user.name ?? emailToName(email),
      updatedAt: new Date().toISOString(),
    };
    const $unset: Record<string, string> = { managerId: "" };

    if (body.managerEmail !== undefined) {
      if (managerEmail) {
        $set.managerEmail = managerEmail;
        $set.managerName = managerName || emailToName(managerEmail);
      } else {
        $unset.managerEmail = "";
        $unset.managerName = "";
      }
    }

    if (body.emailSignature !== undefined) {
      $set.emailSignature = emailSignature;
    }

    if (body.horasContratadasMes !== undefined) {
      const horas = Number(body.horasContratadasMes);
      if (body.horasContratadasMes === null || body.horasContratadasMes === "") {
        $unset.horasContratadasMes = "";
      } else if (!Number.isFinite(horas) || horas < 0) {
        return NextResponse.json({ error: "Horas contratadas inválidas" }, { status: 400 });
      } else {
        $set.horasContratadasMes = horas;
      }
    }

    if (body.horasContratadasDia !== undefined) {
      const horasDia = Number(body.horasContratadasDia);
      if (body.horasContratadasDia === null || body.horasContratadasDia === "") {
        $unset.horasContratadasDia = "";
      } else if (!Number.isFinite(horasDia) || horasDia < 0) {
        return NextResponse.json({ error: "Horas por dia inválidas" }, { status: 400 });
      } else {
        $set.horasContratadasDia = horasDia;
      }
    }

    if (body.emailSignatureImage !== undefined) {
      const imageData = typeof body.emailSignatureImage === "string" ? body.emailSignatureImage.trim() : "";
      if (imageData) {
        if (imageData.length > 1_200_000) {
          return NextResponse.json({ error: "Imagem muito grande (máx. ~900 KB)" }, { status: 400 });
        }
        $set.emailSignatureImage = imageData;
        $set.emailSignatureImageMime = body.emailSignatureImageMime?.trim() || "image/png";
      } else {
        $unset.emailSignatureImage = "";
        $unset.emailSignatureImageMime = "";
      }
    }

    await collection.updateOne(
      { userId: new ObjectId(userId) },
      {
        $set,
        ...(Object.keys($unset).length > 0 ? { $unset } : {}),
        $setOnInsert: { _id: new ObjectId(), createdAt: new Date().toISOString() },
      },
      { upsert: true },
    );

    const doc = await collection.findOne({ userId: new ObjectId(userId) });
    if (!doc) {
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json(await buildSettingsResponse(doc, collection, email));
  } catch (err) {
    console.error("[PUT /api/settings]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
