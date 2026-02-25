import { NextRequest, NextResponse } from "next/server";

const USERNAME = "simpletex";
const PASSWORD = "latex2024";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (username === USERNAME && password === PASSWORD) {
      return NextResponse.json({ success: true, token: "logged_in" });
    } else {
      return NextResponse.json({ success: false, message: "用户名或密码错误" }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
