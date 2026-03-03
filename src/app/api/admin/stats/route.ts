import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 获取API调用统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, all
    
    // 计算日期范围
    let startDate = new Date();
    if (period === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate = new Date(0); // 从1970年开始
    }

    // 总调用次数
    const totalCalls = await prisma.apiLog.count();

    // 期间的调用次数
    const periodCalls = await prisma.apiLog.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // 每日调用统计
    const dailyStats = await prisma.$queryRaw`
      SELECT date(createdAt) as date, COUNT(*) as count 
      FROM ApiLog 
      WHERE createdAt >= ${startDate}
      GROUP BY date(createdAt)
      ORDER BY date DESC
      LIMIT 30
    `;

    // 每个用户的调用统计
    const userStats = await prisma.apiLog.groupBy({
      by: ["userId"],
      _count: true,
      orderBy: {
        _count: {
          userId: "desc",
        },
      },
      take: 20,
    });

    // 获取用户详情
    const userIds = userStats.map((s: { userId: string }) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    const userMap = new Map(users.map((u: { id: string; username: string }) => [u.id, u.username]));

    const userCallStats = userStats.map((s: { userId: string; _count: number }) => ({
      userId: s.userId,
      username: userMap.get(s.userId) || "未知",
      count: s._count,
    }));

    // 成功/失败统计
    const successCount = await prisma.apiLog.count({
      where: { statusCode: { gte: 200, lt: 400 } },
    });

    const failCount = totalCalls - successCount;

    return NextResponse.json({
      success: true,
      data: {
        totalCalls,
        periodCalls,
        successCalls: successCount,
        failCalls: failCount,
        dailyStats: dailyStats || [],
        userCallStats,
      },
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { success: false, message: "服务器错误" },
      { status: 500 }
    );
  }
}
