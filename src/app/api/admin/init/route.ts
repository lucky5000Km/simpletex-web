import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 创建管理员账号
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 检查是否已存在管理员
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "admin" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { success: false, message: "管理员账号已存在" },
        { status: 400 }
      );
    }

    // 创建管理员
    const admin = await prisma.user.create({
      data: {
        username,
        password, // 生产环境应该加密
        role: "admin",
        status: "approved",
      },
    });

    return NextResponse.json({
      success: true,
      message: "管理员账号创建成功",
      data: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}

// 检查管理员是否存在
export async function GET() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "admin" },
      select: {
        id: true,
        username: true,
      },
    });

    return NextResponse.json({
      success: true,
      exists: !!admin,
      data: admin,
    });
  } catch (error) {
    console.error("Check admin error:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
