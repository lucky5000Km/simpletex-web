import { NextRequest, NextResponse } from "next/server";

const API_TOKEN = process.env.SIMPLETEX_API_TOKEN;

export async function POST(request: NextRequest) {
  try {
    if (!API_TOKEN) {
      return NextResponse.json({ error: "API token not configured" }, { status: 500 });
    }
    
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ status: false, err_info: { err_msg: "no image data find", err_type: "image_missing" } }, { status: 400 });
    }

    // Create new FormData for upstream
    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name);

    // Forward to Simpletex API
    const response = await fetch("https://server.simpletex.cn/api/latex_ocr", {
      method: "POST",
      headers: {
        "token": API_TOKEN,
      },
      body: upstreamFormData,
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("OCR API Error:", error);
    return NextResponse.json({ status: false, err_info: { err_msg: String(error), err_type: "server_error" } }, { status: 500 });
  }
}
