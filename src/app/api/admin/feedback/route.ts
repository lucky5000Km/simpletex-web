import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 从请求头获取用户信息进行权限验证
function getUserFromRequest(request: NextRequest): { id: string; username: string; role: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  try {
    const userInfo = JSON.parse(Buffer.from(authHeader, "base64").toString());
    return userInfo;
  } catch {
    return null;
  }
}

// 获取所有反馈列表
export async function GET(request: NextRequest) {
  try {
    const userInfo = getUserFromRequest(request);
    
    // 检查是否登录
    if (!userInfo) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    // 检查是否是管理员
    const user = await prisma.user.findUnique({
      where: { id: userInfo.id },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const feedbacks = await prisma.parsingFeedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: feedbacks
    });
  } catch (error) {
    console.error("Admin Feedback API Error:", error);
    return NextResponse.json(
      { success: false, message: "获取反馈列表失败" },
      { status: 500 }
    );
  }
}

// 更新反馈状态
export async function PATCH(request: NextRequest) {
  try {
    const userInfo = getUserFromRequest(request);
    
    if (!userInfo) {
      return NextResponse.json(
        { success: false, message: "请先登录" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userInfo.id },
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { success: false, message: "无权限" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, adminNote } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少反馈ID" },
        { status: 400 }
      );
    }

    const feedback = await prisma.parsingFeedback.update({
      where: { id },
      data: {
        status: status || undefined,
        adminNote: adminNote || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: feedback
    });
  } catch (error) {
    console.error("Admin Feedback PATCH API Error:", error);
    return NextResponse.json(
      { success: false, message: "更新反馈失败" },
      { status: 500 }
    );
  }
}
