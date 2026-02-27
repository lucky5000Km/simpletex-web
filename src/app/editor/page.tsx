"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import "katex/dist/katex.min.css";

// 符号分类
const symbolCategories = [
  {
    name: "基础运算",
    symbols: [
      { latex: "+", name: "加号" },
      { latex: "-", name: "减号" },
      { latex: "\\times", name: "乘号" },
      { latex: "\\div", name: "除号" },
      { latex: "=", name: "等于" },
      { latex: "\\neq", name: "不等于" },
      { latex: "<", name: "小于" },
      { latex: ">", name: "大于" },
      { latex: "\\leq", name: "小于等于" },
      { latex: "\\geq", name: "大于等于" },
      { latex: "\\pm", name: "正负" },
      { latex: "\\mp", name: "负正" },
    ]
  },
  {
    name: "分数与根号",
    symbols: [
      { latex: "\\frac{}{}", name: "分数" },
      { latex: "\\sqrt{}", name: "根号" },
      { latex: "\\sqrt[]{}", name: "n次根" },
      { latex: "\\frac{a}{b}", name: "分数示例" },
      { latex: "x^2", name: "平方" },
      { latex: "x^n", name: "n次方" },
      { latex: "x_i", name: "下标" },
      { latex: "x^{n}", name: "上标" },
    ]
  },
  {
    name: "希腊字母",
    symbols: [
      { latex: "\\alpha", name: "α" },
      { latex: "\\beta", name: "β" },
      { latex: "\\gamma", name: "γ" },
      { latex: "\\delta", name: "δ" },
      { latex: "\\epsilon", name: "ε" },
      { latex: "\\theta", name: "θ" },
      { latex: "\\lambda", name: "λ" },
      { latex: "\\mu", name: "μ" },
      { latex: "\\pi", name: "π" },
      { latex: "\\sigma", name: "σ" },
      { latex: "\\omega", name: "ω" },
      { latex: "\\Delta", name: "Δ" },
      { latex: "\\Sigma", name: "Σ" },
      { latex: "\\Pi", name: "Π" },
      { latex: "\\Omega", name: "Ω" },
    ]
  },
  {
    name: "集合运算",
    symbols: [
      { latex: "\\in", name: "属于" },
      { latex: "\\notin", name: "不属于" },
      { latex: "\\subset", name: "真子集" },
      { latex: "\\subseteq", name: "子集" },
      { latex: "\\cup", name: "并集" },
      { latex: "\\cap", name: "交集" },
      { latex: "\\emptyset", name: "空集" },
      { latex: "\\mathbb{R}", name: "实数集" },
      { latex: "\\mathbb{Z}", name: "整数集" },
      { latex: "\\mathbb{N}", name: "自然数" },
    ]
  },
  {
    name: "微积分",
    symbols: [
      { latex: "\\int", name: "积分" },
      { latex: "\\int_{a}^{b}", name: "定积分" },
      { latex: "\\infty", name: "无穷" },
      { latex: "\\partial", name: "偏导" },
      { latex: "\\nabla", name: "梯度" },
      { latex: "\\lim", name: "极限" },
      { latex: "\\lim_{x \\to \\infty}", name: "极限示例" },
      { latex: "\\sum", name: "求和" },
      { latex: "\\sum_{i=1}^{n}", name: "求和示例" },
      { latex: "\\prod", name: "连乘" },
    ]
  },
  {
    name: "三角函数",
    symbols: [
      { latex: "\\sin", name: "正弦" },
      { latex: "\\cos", name: "余弦" },
      { latex: "\\tan", name: "正切" },
      { latex: "\\cot", name: "余切" },
      { latex: "\\sec", name: "正割" },
      { latex: "\\csc", name: "余割" },
      { latex: "\\arcsin", name: "反正弦" },
      { latex: "\\arccos", name: "反余弦" },
      { latex: "\\arctan", name: "反正切" },
    ]
  },
  {
    name: "括号与修饰",
    symbols: [
      { latex: "\\left(", name: "左圆括号" },
      { latex: "\\right)", name: "右圆括号" },
      { latex: "\\left[", name: "左方括号" },
      { latex: "\\right]", name: "右方括号" },
      { latex: "\\left\\{", name: "左花括号" },
      { latex: "\\right\\}", name: "右花括号" },
      { latex: "\\left|", name: "左竖线" },
      { latex: "\\right|", name: "右竖线" },
      { latex: "\\overrightarrow{}", name: "向量" },
      { latex: "\\bar{}", name: "平均数" },
      { latex: "\\hat{}", name: "帽子" },
      { latex: "\\dot{}", name: "点" },
      { latex: "\\ddot{}", name: "双点" },
    ]
  },
  {
    name: "常用公式",
    symbols: [
      { latex: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}", name: "求根公式" },
      { latex: "e^{i\\pi} + 1 = 0", name: "欧拉公式" },
      { latex: "\\sin^2\\theta + \\cos^2\\theta = 1", name: "勾股定理" },
      { latex: "f(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}", name: "导数定义" },
      { latex: "\\int f(x)dx = F(x) + C", name: "不定积分" },
    ]
  }
];

export default function Editor() {
  const [latex, setLatex] = useState<string>("x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 实时渲染预览
  useEffect(() => {
    if (latex && previewRef.current) {
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
  }, [latex]);

  // 插入符号
  const insertSymbol = useCallback((symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = latex;
    
    // 在光标位置插入
    const newText = text.slice(0, start) + symbol + text.slice(end);
    setLatex(newText);
    
    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      const newPos = start + symbol.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }, [latex]);

  // 复制
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(latex);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = latex;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [latex]);

  // 清空
  const handleClear = useCallback(() => {
    setLatex("");
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>
            <h1 className="text-xl font-semibold text-slate-800">公式编辑器</h1>
          </div>
          <a href="/" className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors">
            ← 返回首页
          </a>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* 左侧：符号面板 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-medium text-slate-700">符号面板</h2>
              </div>
              <div className="p-3 space-y-4">
                {symbolCategories.map((category, idx) => (
                  <div key={idx}>
                    <h3 className="text-xs font-medium text-slate-500 mb-2">{category.name}</h3>
                    <div className="grid grid-cols-4 gap-1">
                      {category.symbols.map((symbol, sidx) => (
                        <button
                          key={sidx}
                          type="button"
                          onClick={() => insertSymbol(symbol.latex)}
                          className="p-2 text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors flex items-center justify-center"
                          title={symbol.name}
                        >
                          {symbol.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 中间：编辑区 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="font-medium text-slate-700">LaTeX 源码</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded transition-colors"
                  >
                    清空
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1"
                  >
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={latex}
                onChange={(e) => setLatex(e.target.value)}
                className="w-full h-48 p-4 text-sm font-mono resize-y focus:outline-none"
                placeholder="在此输入 LaTeX 公式，或点击左侧符号插入..."
                spellCheck={false}
              />
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-medium text-blue-800 mb-2">使用说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 点击左侧符号面板可插入对应 LaTeX 代码</li>
                <li>• 支持直接编辑 LaTeX 源码</li>
                <li>• 右侧实时预览渲染效果</li>
                <li>• 常用公式模板可快速插入</li>
              </ul>
            </div>
          </div>

          {/* 右侧：预览区 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-medium text-slate-700">预览</h2>
              </div>
              <div className="p-6 min-h-[200px] flex items-center justify-center">
                {latex ? (
                  <div ref={previewRef} className="text-center" />
                ) : (
                  <p className="text-slate-400 text-sm">输入公式后显示预览</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
