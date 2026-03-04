import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import fs from "fs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("file");

  if (!filename) {
    return NextResponse.json({ error: "缺少文件名" }, { status: 400 });
  }

  // 提取纯文件名（去掉路径前缀）
  const pureFileName = filename.split("/").pop() || filename;
  
  // 安全检查：防止路径遍历攻击
  const safePath = path.join(process.cwd(), "public", "feedback-images", pureFileName);
  const resolvedPath = path.resolve(safePath);
  
  if (!resolvedPath.startsWith(path.resolve(process.cwd(), "public", "feedback-images"))) {
    return NextResponse.json({ error: "无效的文件路径" }, { status: 400 });
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json({ error: "文件不存在" }, { status: 404 });
    }

    const fileBuffer = await readFile(resolvedPath);
    const ext = path.extname(filename).toLowerCase();
    
    const contentType = ext === ".png" ? "image/png" : 
                        ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
                        ext === ".gif" ? "image/gif" :
                        ext === ".webp" ? "image/webp" : "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Image serving error:", error);
    return NextResponse.json({ error: "读取文件失败" }, { status: 500 });
  }
}
