"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import "katex/dist/katex.min.css";

interface HistoryItem {
  id: string;
  timestamp: number;
  imagePreview: string;
  latex: string;
  error?: string;
}

const API_URL = "/api/ocr";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [latex, setLatex] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check login status
  useEffect(() => {
    const loggedIn = localStorage.getItem("simpletex_logged_in");
    if (loggedIn === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  // Handle login
  const handleLogin = useCallback(async () => {
    setLoginError("");
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem("simpletex_logged_in", "true");
        setIsLoggedIn(true);
      } else {
        setLoginError(data.message || "登录失败");
      }
    } catch (e) {
      setLoginError("登录出错");
    }
  }, [username, password]);

  // Handle logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("simpletex_logged_in");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("simpletex-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = useCallback((items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem("simpletex-history", JSON.stringify(items));
  }, []);

  // Handle file selection
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件 (PNG, JPG, GIF, BMP, WebP)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("文件大小不能超过 10MB");
      return;
    }
    setError("");
    setImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setLatex("");
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  // Handle paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
          }
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handleFile]);

  // Submit for recognition
  const handleSubmit = useCallback(async () => {
    if (!image) return;
    
    setLoading(true);
    setError("");
    
    try {
      const formData = new FormData();
      formData.append("file", image);
      
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      console.log("API Response:", data);
      
      if (data.status === true || data.res?.latex) {
        const resultLatex = data.res?.latex || data.latex || "";
        setLatex(resultLatex);
        
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imagePreview,
          latex: resultLatex,
        };
        saveHistory([newItem, ...history.slice(0, 49)]);
      } else {
        setError(data.err_info?.err_msg || data.message || "识别失败，请重试");
      }
    } catch (err: any) {
      setError(err.message || "网络错误，请检查网络连接");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [image, imagePreview, history, saveHistory]);

  // Render preview using KaTeX
  useEffect(() => {
    if (latex && showPreview && previewRef.current) {
      import("katex").then((katexModule) => {
        const katex = katexModule.default || katexModule;
        if (previewRef.current) {
          try {
            previewRef.current.innerHTML = katex.renderToString(latex, {
              throwOnError: false,
              displayMode: true,
            });
          } catch (e) {
            previewRef.current.innerHTML = '<span class="text-red-500">渲染失败</span>';
          }
        }
      });
    }
  }, [latex, showPreview]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    if (latex) {
      try {
        // 尝试使用 Clipboard API
        await navigator.clipboard.writeText(latex);
      } catch (err) {
        // 回退方案：使用临时的 textarea 元素
        const textarea = document.createElement("textarea");
        textarea.value = latex;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand("copy");
        } catch (e) {
          console.error("Copy failed:", e);
        }
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [latex]);

  // Load from history
  const handleLoadHistory = useCallback((item: HistoryItem) => {
    setImagePreview(item.imagePreview);
    setLatex(item.latex);
    setImage(null);
    setShowHistory(false);
    setError("");
  }, []);

  // Delete history item
  const handleDeleteHistory = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newHistory = history.filter(item => item.id !== id);
    saveHistory(newHistory);
  }, [history, saveHistory]);

  // Clear all history
  const handleClearHistory = useCallback(() => {
    saveHistory([]);
  }, [saveHistory]);

  // Login page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">SimpleTex Web</h1>
            <p className="text-slate-500 mt-2">请先登录</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="请输入用户名"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="请输入密码"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            
            {loginError && (
              <p className="text-red-500 text-sm">{loginError}</p>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
            >
              登录
            </button>
          </div>
          
          <p className="text-center text-slate-400 text-sm mt-6">
            联系管理员获取账号
          </p>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">SimpleTex Web</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="relative px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              历史记录
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {history.length}
                </span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Upload Area */}
          <div className="space-y-6">
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                isDragOver
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-h-80 mx-auto rounded-lg shadow-md"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setImagePreview("");
                      setLatex("");
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-slate-600 mb-2">
                    拖拽图片到此处，或 <span className="text-indigo-500">点击选择文件</span>
                  </p>
                  <p className="text-sm text-slate-400">
                    支持 PNG, JPG, GIF, BMP, WebP (最大 10MB)
                  </p>
                  <p className="text-sm text-slate-400 mt-2">
                    也可以直接 <kbd className="px-2 py-1 bg-slate-200 rounded text-xs">Ctrl+V</kbd> 粘贴截图
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={!image || loading}
              className="w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  识别中...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  开始识别
                </>
              )}
            </button>
          </div>

          {/* Right: Result */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-medium text-slate-700">识别结果</h2>
              </div>
              <div className="p-6">
                {latex ? (
                  <div className="space-y-4">
                    {/* Preview (Top) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-600">公式预览</label>
                        <button
                          type="button"
                          onClick={() => setShowPreview(!showPreview)}
                          className="text-sm text-indigo-500 hover:text-indigo-600"
                        >
                          {showPreview ? "收起" : "展开"}
                        </button>
                      </div>
                      <div className="bg-slate-50 p-6 rounded-lg min-h-[80px] overflow-x-auto">
                        {showPreview ? (
                          <div ref={previewRef} />
                        ) : (
                          <p className="text-slate-400 text-sm">点击展开查看预览</p>
                        )}
                      </div>
                    </div>

                    {/* LaTeX Source (Bottom) - 可编辑 */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-600">LaTeX 源码 (可编辑)</label>
                        <button
                          type="button"
                          onClick={handleCopy}
                          className="text-sm text-indigo-500 hover:text-indigo-600 flex items-center gap-1"
                        >
                          {copied ? (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              已复制
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              复制
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={latex}
                        onChange={(e) => setLatex(e.target.value)}
                        className="w-full bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono h-32 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="在此编辑 LaTeX 源码..."
                        spellCheck={false}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        编辑后预览区将实时更新
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>上传图片并识别后显示结果</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* History Sidebar */}
      {showHistory && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setShowHistory(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-800">历史记录</h2>
                <div className="flex items-center gap-2">
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="text-sm text-red-500 hover:text-red-600"
                    >
                      清空
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>暂无历史记录</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLoadHistory(item)}
                      className="bg-slate-50 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                    >
                      <div className="flex gap-3">
                        <img
                          src={item.imagePreview}
                          alt="Thumbnail"
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-400 mb-1">
                            {new Date(item.timestamp).toLocaleString("zh-CN")}
                          </p>
                          <p className="text-sm text-slate-600 truncate font-mono">
                            {item.latex || item.error}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
