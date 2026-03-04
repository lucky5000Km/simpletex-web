import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

// 从请求头获取用户信息
function getUserFromRequest(request: NextRequest): { id: string; username: string } | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;

  try {
    const userInfo = JSON.parse(Buffer.from(authHeader, "base64").toString());
    return userInfo;
  } catch {
    return null;
  }
}

// 保存上传的图片
async function saveImage(file: File): Promise<string> {
  const uploadDir = path.join(process.cwd(), "feedback-images");
  
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch {
    // 目录可能已存在
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;
  const filePath = path.join(uploadDir, uniqueName);
  
  await writeFile(filePath, buffer);
  
  return uniqueName;
}

export async function POST(request: NextRequest) {
  try {
    const userInfo = getUserFromRequest(request);
    
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const latexResult = formData.get("latexResult") as string | null;
    const errorReason = formData.get("errorReason") as string | null;

    if (!image) {
      return NextResponse.json(
        { success: false, message: "请上传图片" },
        { status: 400 }
      );
    }

    // 保存图片，返回文件名
    const imageFileName = await saveImage(image);

    // 创建反馈记录
    const feedback = await prisma.parsingFeedback.create({
      data: {
        userId: userInfo?.id || null,
        imageUrl: imageFileName,  // 只存文件名
        latexResult: latexResult || null,
        errorReason: errorReason || "用户手动上报",
        status: "pending",
      },
    });

    return NextResponse.json({
      success: true,
      message: "感谢您的反馈！我们会尽快处理。",
      data: { id: feedback.id }
    });
  } catch (error) {
    console.error("Feedback API Error:", error);
    return NextResponse.json(
      { success: false, message: "提交反馈失败" },
      { status: 500 }
    );
  }
}
