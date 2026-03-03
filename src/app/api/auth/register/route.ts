import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { username, password, email } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "用户名已存在" },
        { status: 400 }
      );
    }

    // 创建用户（默认状态为 pending，需要管理员审批）
    const user = await prisma.user.create({
      data: {
        username,
        password, // 生产环境应该加密
        email,
        role: "user",
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "注册成功，请等待管理员审批",
      data: {
        id: user.id,
        username: user.username,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
