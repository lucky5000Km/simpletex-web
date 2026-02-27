"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import "katex/dist/katex.min.css";

// 符号分类 - 优化版
const symbolCategories = [
  {
    name: "基础",
    nameEn: "Basic",
    symbols: [
      { latex: "+", name: "+" },
      { latex: "-", name: "-" },
      { latex: "\\times", name: "×" },
      { latex: "\\div", name: "÷" },
      { latex: "=", name: "=" },
      { latex: "\\neq", name: "≠" },
      { latex: "<", name: "<" },
      { latex: ">", name: ">" },
      { latex: "\\leq", name: "≤" },
      { latex: "\\geq", name: "≥" },
      { latex: "\\pm", name: "±" },
      { latex: "\\mp", name: "∓" },
    ]
  },
  {
    name: "运算",
    nameEn: "Operations",
    symbols: [
      { latex: "\\frac{}{}", name: "a/b" },
      { latex: "\\sqrt{}", name: "√" },
      { latex: "x^n", name: "xⁿ" },
      { latex: "x_i", name: "xᵢ" },
      { latex: "x^{n}", name: "xⁿ" },
      { latex: "\\int", name: "∫" },
      { latex: "\\int_{a}^{b}", name: "∫ᵇₐ" },
      { latex: "\\sum", name: "Σ" },
      { latex: "\\sum_{i=1}^{n}", name: "Σⁿᵢ₌₁" },
      { latex: "\\prod", name: "Π" },
      { latex: "\\lim", name: "lim" },
      { latex: "\\infty", name: "∞" },
    ]
  },
  {
    name: "字母",
    nameEn: "Letters",
    symbols: [
      { latex: "\\alpha", name: "α" },
      { latex: "\\beta", name: "β" },
      { latex: "\\gamma", name: "γ" },
      { latex: "\\delta", name: "δ" },
      { latex: "\\theta", name: "θ" },
      { latex: "\\lambda", name: "λ" },
      { latex: "\\pi", name: "π" },
      { latex: "\\sigma", name: "σ" },
      { latex: "\\omega", name: "ω" },
      { latex: "\\Delta", name: "Δ" },
      { latex: "\\Sigma", name: "Σ" },
      { latex: "\\Omega", name: "Ω" },
    ]
  },
  {
    name: "符号",
    nameEn: "Symbols",
    symbols: [
      { latex: "\\in", name: "∈" },
      { latex: "\\notin", name: "∉" },
      { latex: "\\subset", name: "⊂" },
      { latex: "\\subseteq", name: "⊆" },
      { latex: "\\cup", name: "∪" },
      { latex: "\\cap", name: "∩" },
      { latex: "\\emptyset", name: "∅" },
      { latex: "\\forall", name: "∀" },
      { latex: "\\exists", name: "∃" },
      { latex: "\\partial", name: "∂" },
      { latex: "\\nabla", name: "∇" },
      { latex: "\\therefore", name: "∴" },
    ]
  },
  {
    name: "三角",
    nameEn: "Trig",
    symbols: [
      { latex: "\\sin", name: "sin" },
      { latex: "\\cos", name: "cos" },
      { latex: "\\tan", name: "tan" },
      { latex: "\\cot", name: "cot" },
      { latex: "\\sec", name: "sec" },
      { latex: "\\csc", name: "csc" },
      { latex: "\\arcsin", name: "arcsin" },
      { latex: "\\arccos", name: "arccos" },
      { latex: "\\arctan", name: "arctan" },
    ]
  },
  {
    name: "样式",
    nameEn: "Styles",
    symbols: [
      { latex: "\\mathbf{}", name: "粗体" },
      { latex: "\\mathrm{}", name: "正体" },
      { latex: "\\mathcal{}", name: "花体" },
      { latex: "\\mathbb{}", name: "黑板" },
      { latex: "\\overrightarrow{}", name: "向量" },
      { latex: "\\bar{}", name: "横线" },
      { latex: "\\hat{}", name: "尖帽" },
      { latex: "\\dot{}", name: "点" },
      { latex: "\\ddot{}", name: "双点" },
      { latex: "\\tilde{}", name: "波浪" },
    ]
  },
  {
    name: "容器",
    nameEn: "Containers",
    symbols: [
      { latex: "\\left( \\right)", name: "()" },
      { latex: "\\left[ \\right]", name: "[]" },
      { latex: "\\left\\{ \\right\\}", name: "{}" },
      { latex: "\\left| \\right|", name: "||" },
      { latex: "\\left\\| \\right\\|", name: "‖‖" },
      { latex: "\\begin{cases} \\end{cases}", name: "分段" },
      { latex: "\\begin{array}{c} \\end{array}", name: "数组" },
      { latex: "\\begin{pmatrix} \\end{pmatrix}", name: "矩阵" },
    ]
  },
];

// 公式模板
const formulaTemplates = [
  { name: "一元二次方程", latex: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}" },
  { name: "勾股定理", latex: "a^2 + b^2 = c^2" },
  { name: "欧拉公式", latex: "e^{i\\pi} + 1 = 0" },
  { name: "导数定义", latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}" },
  { name: "定积分", latex: "\\int_a^b f(x) dx = F(b) - F(a)" },
  { name: "均值不等式", latex: "\\frac{a+b}{2} \\geq \\sqrt{ab}" },
  { name: "二项式定理", latex: "(a+b)^n = \\sum_{k=0}^{n} C_n^k a^{n-k} b^k" },
  { name: "泰勒展开", latex: "e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}" },
];

export default function Editor() {
  const [latex, setLatex] = useState<string>("x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}");
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
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

  // 插入模板
  const insertTemplate = useCallback((templateLatex: string) => {
    setLatex(templateLatex);
    textareaRef.current?.focus();
  }, []);

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
          {/* 左侧：符号面板 - 鼠标悬停展开 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-medium text-slate-700">符号面板</h2>
              </div>
              <div className="p-2">
                {symbolCategories.map((category, idx) => (
                  <div key={idx} className="relative mb-1">
                    {/* 分类按钮 */}
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                      className="w-full px-3 py-2 text-sm bg-slate-100 hover:bg-indigo-50 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <span className="font-medium text-slate-700">{category.name}</span>
                      <svg 
                        className={`w-4 h-4 text-slate-400 transition-transform ${expandedCategory === category.name ? 'rotate-180' : ''}`} 
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* 悬停展开的符号网格 */}
                    <div 
                      className={`absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-3 z-20 w-full transition-all duration-200 ${
                        expandedCategory === category.name 
                          ? 'opacity-100 visible translate-y-0' 
                          : 'opacity-0 invisible -translate-y-2'
                      }`}
                    >
                      <div className="grid grid-cols-4 gap-1">
                        {category.symbols.map((symbol, sidx) => (
                          <button
                            key={sidx}
                            type="button"
                            onClick={() => insertSymbol(symbol.latex)}
                            className="p-2 text-sm bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded transition-colors flex items-center justify-center"
                            title={symbol.latex}
                          >
                            {symbol.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 中间+右侧：编辑区和预览（预览在下面） */}
          <div className="lg:col-span-3 space-y-4">
            {/* 编辑区 */}
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
                className="w-full h-32 p-4 text-sm font-mono resize-y focus:outline-none"
                placeholder="在此输入 LaTeX 公式，或点击左侧符号插入..."
                spellCheck={false}
              />
            </div>

            {/* 预览区 - 放到源码下面 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-medium text-slate-700">预览效果</h2>
              </div>
              <div className="p-8 min-h-[150px] flex items-center justify-center bg-slate-50">
                {latex ? (
                  <div ref={previewRef} className="text-2xl text-center" />
                ) : (
                  <p className="text-slate-400 text-sm">输入公式后显示预览</p>
                )}
              </div>
            </div>

            {/* 公式模板快捷入口 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h2 className="font-medium text-slate-700">常用公式模板</h2>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {formulaTemplates.map((template, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => insertTemplate(template.latex)}
                      className="px-3 py-2 text-sm bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors border border-slate-200 hover:border-indigo-300"
                    >
                      {template.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 使用说明 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-medium text-blue-800 mb-2">使用说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 点击或悬停左侧符号面板可插入对应 LaTeX 代码</li>
                <li>• 支持直接编辑 LaTeX 源码，预览实时更新</li>
                <li>• 点击常用公式模板可快速插入完整公式</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
