import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CHARACTERS_FILE = join(process.cwd(), "data", "characters.json");

export async function GET() {
  try {
    const data = readFileSync(CHARACTERS_FILE, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: "Could not load characters" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, updates } = await req.json();
    const data = JSON.parse(readFileSync(CHARACTERS_FILE, "utf-8"));
    const idx = data.findIndex((c: { id: string }) => c.id === id);
    if (idx === -1) return NextResponse.json({ error: "Character not found" }, { status: 404 });

    data[idx] = { ...data[idx], ...updates };
    writeFileSync(CHARACTERS_FILE, JSON.stringify(data, null, 2), "utf-8");
    return NextResponse.json({ success: true, character: data[idx] });
  } catch {
    return NextResponse.json({ error: "Could not update character" }, { status: 500 });
  }
}
