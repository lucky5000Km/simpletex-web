import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 审批用户（通过/拒绝）或启用/禁用，或设置API限制
export async function PATCH(request: NextRequest) {
  try {
    const { userId, action, apiLimit, resetUsed } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户ID" },
        { status: 400 }
      );
    }

    // 处理设置 API 限制
    if (apiLimit !== undefined) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { apiLimit: Math.max(0, parseInt(apiLimit) || 0) },
        select: {
          id: true,
          username: true,
          apiLimit: true,
          apiUsed: true,
        },
      });
      return NextResponse.json({
        success: true,
        message: `API调用限制已设置为 ${user.apiLimit} 次`,
        data: user,
      });
    }

    // 处理重置已使用次数
    if (resetUsed) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { apiUsed: 0 },
        select: {
          id: true,
          username: true,
          apiLimit: true,
          apiUsed: true,
        },
      });
      return NextResponse.json({
        success: true,
        message: "API调用次数已重置",
        data: user,
      });
    }

    // 处理用户状态操作
    if (!action) {
      return NextResponse.json(
        { success: false, message: "缺少操作参数" },
        { status: 400 }
      );
    }

    const validActions = ["approve", "reject", "enable", "disable"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { success: false, message: "无效的操作" },
        { status: 400 }
      );
    }

    let newStatus: string;
    switch (action) {
      case "approve":
        newStatus = "approved";
        break;
      case "reject":
        newStatus = "rejected";
        break;
      case "enable":
        newStatus = "approved";
        break;
      case "disable":
        newStatus = "disabled";
        break;
      default:
        return NextResponse.json(
          { success: false, message: "无效的操作" },
          { status: 400 }
        );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
    });

    const actionMessages: Record<string, string> = {
      approve: "已通过审批",
      reject: "已拒绝",
      enable: "已启用",
      disable: "已禁用",
    };

    return NextResponse.json({
      success: true,
      message: actionMessages[action],
      data: {
        id: user.id,
        username: user.username,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "缺少用户ID" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
