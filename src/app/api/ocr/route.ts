import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const API_TOKEN = process.env.SIMPLETEX_API_TOKEN;

// 从请求头获取用户信息进行权限验证
function getUserFromRequest(request: NextRequest): { id: string; username: string; status: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  try {
    const userInfo = JSON.parse(Buffer.from(authHeader, "base64").toString());
    return userInfo;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const userInfo = getUserFromRequest(request);
  
  const logData = {
    endpoint: "/api/ocr",
    method: "POST",
    ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };
  
  try {
    if (!userInfo) {
      return NextResponse.json(
        { status: false, err_info: { err_msg: "未登录", err_type: "unauthorized" } },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userInfo.id },
    });

    if (!user) {
      await prisma.apiLog.create({
        data: { ...logData, userId: userInfo.id, statusCode: 401 },
      });
      return NextResponse.json(
        { status: false, err_info: { err_msg: "用户不存在", err_type: "unauthorized" } },
        { status: 401 }
      );
    }

    if (user.status === "disabled") {
      await prisma.apiLog.create({
        data: { ...logData, userId: user.id, statusCode: 403 },
      });
      return NextResponse.json(
        { status: false, err_info: { err_msg: "账号已被禁用", err_type: "forbidden" } },
        { status: 403 }
      );
    }

    if (user.status !== "approved") {
      await prisma.apiLog.create({
        data: { ...logData, userId: user.id, statusCode: 403 },
      });
      return NextResponse.json(
        { status: false, err_info: { err_msg: "账号未通过审批", err_type: "forbidden" } },
        { status: 403 }
      );
    }

    // 检查 API 调用次数限制
    if (user.apiLimit > 0 && user.apiUsed >= user.apiLimit) {
      await prisma.apiLog.create({
        data: { ...logData, userId: user.id, statusCode: 429 },
      });
      return NextResponse.json(
        { status: false, err_info: { err_msg: "API调用次数已达上限", err_type: "quota_exceeded" } },
        { status: 429 }
      );
    }

    if (!API_TOKEN) {
      await prisma.apiLog.create({
        data: { ...logData, userId: user.id, statusCode: 500 },
      });
      return NextResponse.json({ error: "API token not configured" }, { status: 500 });
    }
    
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      await prisma.apiLog.create({
        data: { ...logData, userId: user.id, statusCode: 400 },
      });
      return NextResponse.json({ status: false, err_info: { err_msg: "no image data find", err_type: "image_missing" } }, { status: 400 });
    }

    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name);

    const response = await fetch("https://server.simpletex.cn/api/latex_ocr", {
      method: "POST",
      headers: {
        "token": API_TOKEN,
      },
      body: upstreamFormData,
    });

    const data = await response.json();
    
    await prisma.apiLog.create({
      data: { ...logData, userId: user.id, statusCode: response.status },
    });

    // 调用成功，增加 API 使用计数
    await prisma.user.update({
      where: { id: user.id },
      data: { apiUsed: { increment: 1 } },
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("OCR API Error:", error);
    
    if (userInfo) {
      await prisma.apiLog.create({
        data: { ...logData, userId: userInfo.id, statusCode: 500 },
      });
    }
    
    return NextResponse.json({ status: false, err_info: { err_msg: String(error), err_type: "server_error" } }, { status: 500 });
  }
}
