# SimpleTex Web - 公式识别服务

## 1. Project Overview

- **项目名称**: SimpleTex Web
- **类型**: Web 应用 (Next.js + Tailwind CSS)
- **核心功能**: 上传图片识别 LaTeX 数学公式
- **目标用户**: 需要将图片公式转换为 LaTeX 的用户

## 2. UI/UX Specification

### Layout Structure

- **Header**: 固定顶部，包含 Logo 和标题
- **Main Area**: 
  - 左侧: 图片上传区域 (拖拽/点击上传)
  - 右侧: 识别结果展示 (LaTeX 源码 + 渲染预览)
- **History Sidebar**: 右侧滑出，显示历史记录

### Responsive Breakpoints
- Mobile (<768px): 单列布局
- Desktop (≥768px): 双列布局

### Visual Design

**Color Palette**:
- Primary: `#6366f1` (Indigo-500)
- Primary Hover: `#4f46e5` (Indigo-600)
- Background: `#f8fafc` (Slate-50)
- Card Background: `#ffffff`
- Text Primary: `#1e293b` (Slate-800)
- Text Secondary: `#64748b` (Slate-500)
- Border: `#e2e8f0` (Slate-200)
- Success: `#22c55e` (Green-500)
- Error: `#ef4444` (Red-500)

**Typography**:
- Font Family: `Inter, system-ui, sans-serif`
- Headings: 24px (h1), 20px (h2), 16px (h3)
- Body: 14px
- Code/LaTeX: `JetBrains Mono, monospace`, 14px

**Spacing**:
- Container padding: 24px
- Card padding: 20px
- Element gap: 16px

**Visual Effects**:
- Card shadow: `0 1px 3px rgba(0,0,0,0.1)`
- Hover transitions: 150ms ease
- Drag-over highlight: dashed border with primary color

### Components

1. **Upload Zone**
   - 虚线边框区域
   - 支持点击选择文件
   - 支持拖拽上传
   - 支持粘贴截图 (Ctrl+V)
   - 显示上传图标和提示文字
   - Drag-over 状态: 边框变实、背景色变化

2. **Image Preview**
   - 上传后显示图片缩略图
   - 支持重新上传/删除

3. **Result Card**
   - LaTeX 源码显示 (可复制)
   - 公式实时渲染预览 (KaTeX)
   - 一键复制按钮
   - 状态: 识别中 (loading spinner)、成功、失败

4. **History List**
   - 时间戳
   - 缩略图
   - LaTeX 片段预览
   - 点击恢复结果
   - 删除按钮

5. **Header**
   - Logo + 标题
   - 历史记录按钮 (带 badge 显示数量)

## 3. Functionality Specification

### Core Features

1. **图片上传识别**
   - 支持格式: PNG, JPG, JPEG, GIF, BMP, WebP
   - 最大文件大小: 10MB
   - 调用 Simpletex API 进行识别

2. **拖拽上传**
   - 拖拽图片到上传区域
   - 视觉反馈

3. **粘贴识别**
   - 支持 Ctrl+V 粘贴剪贴板图片
   - 适合截图识别场景

4. **结果展示**
   - 原始 LaTeX 源码
   - KaTeX 实时渲染
   - 一键复制到剪贴板

5. **历史记录**
   - LocalStorage 本地存储
   - 显示最近 50 条记录
   - 支持删除单条
   - 支持清空全部

### API Integration

- **Endpoint**: `https://api.simpletex.cn/api/v1/latex/ocr`
- **Method**: POST
- **Headers**: 
  - `Token`: 用户 API Token
  - `Content-Type`: `multipart/form-data`
- **Body**: `image` (文件二进制)
- **Response**: JSON 包含 `latex` 字段

### Edge Cases
- API 请求失败: 显示错误信息，支持重试
- 无效文件格式: 提示支持格式
- 文件过大: 提示大小限制
- 网络错误: 提示检查网络

## 4. Acceptance Criteria

- [ ] 可以上传图片并成功识别 LaTeX
- [ ] 支持拖拽上传
- [ ] 支持 Ctrl+V 粘贴截图
- [ ] 识别结果显示源码和渲染效果
- [ ] 可以复制 LaTeX 源码
- [ ] 历史记录正确保存和显示
- [ ] 可以从历史记录恢复
- [ ] 错误处理友好
- [ ] 界面美观，Tailwind 样式正确
