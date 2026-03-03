import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 验证密码
    if (user.password !== password) {
      return NextResponse.json(
        { success: false, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 检查是否被禁用
    if (user.status === "disabled") {
      return NextResponse.json(
        { success: false, message: "账号已被禁用，请联系管理员" },
        { status: 403 }
      );
    }

    // 检查用户状态
    if (user.status === "pending") {
      return NextResponse.json(
        { success: false, message: "账号正在等待审批，请联系管理员" },
        { status: 403 }
      );
    }

    if (user.status === "rejected") {
      return NextResponse.json(
        { success: false, message: "账号已被拒绝，请联系管理员" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "登录成功",
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
