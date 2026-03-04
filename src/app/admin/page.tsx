"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  apiLimit: number;
  apiUsed: number;
  createdAt: string;
  _count?: { apiLogs: number };
}

interface Stats {
  totalCalls: number;
  periodCalls: number;
  successCalls: number;
  failCalls: number;
  dailyStats: { date: string; count: number }[];
  userCallStats: { userId: string; username: string; count: number }[];
}

export default function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "feedback">("dashboard");
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  
  // 添加用户表单
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "", email: "", role: "user" });

  // 编辑用户用量限制
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editApiLimit, setEditApiLimit] = useState("");
  
  // 反馈管理
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  
  // 检查登录状态
  useEffect(() => {
    const savedUser = localStorage.getItem("simpletex_admin");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.role === "admin") {
          setIsLoggedIn(true);
          fetchStats();
          fetchUsers();
        }
      } catch (e) {
        console.error("Failed to parse admin info", e);
      }
    }
  }, []);

  // 获取统计数据
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/stats?period=${period}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isLoggedIn && activeTab === "dashboard") {
      fetchStats();
    }
  }, [isLoggedIn, activeTab, period, fetchStats]);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && activeTab === "users") {
      fetchUsers();
    }
    if (isLoggedIn && activeTab === "feedback") {
      fetchFeedbacks();
    }
  }, [isLoggedIn, activeTab, fetchUsers]);

  // 管理员登录
  const handleLogin = async () => {
    setLoginError("");
    try {
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem("simpletex_admin", JSON.stringify(data.data));
        setIsLoggedIn(true);
        fetchStats();
        fetchUsers();
      } else {
        setLoginError(data.message || "登录失败");
      }
    } catch (e) {
      setLoginError("登录出错");
    }
  };

  // 添加用户
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) {
      alert("用户名和密码不能为空");
      return;
    }
    
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await response.json();
      
      if (data.success) {
        alert("用户创建成功");
        setShowAddUser(false);
        setNewUser({ username: "", password: "", email: "", role: "user" });
        fetchUsers();
      } else {
        alert(data.message || "创建失败");
      }
    } catch (err) {
      alert("创建失败");
    }
  };

  // 审批用户
  const handleApprove = async (userId: string, action: "approve" | "reject" | "enable" | "disable") => {
    try {
      const response = await fetch("/api/admin/users/" + userId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });
      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to update user", err);
    }
  };

  // 保存 API 限制
  const handleSaveApiLimit = async () => {
    if (!editingUser) return;
    
    try {
      const response = await fetch("/api/admin/users/" + editingUser.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: editingUser.id, apiLimit: parseInt(editApiLimit) || 0 }),
      });
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        setEditingUser(null);
        fetchUsers();
      } else {
        alert(data.message || "保存失败");
      }
    } catch (err) {
      alert("保存失败");
    }
  };

  // 重置 API 使用次数
  const handleResetUsed = async (userId: string) => {
    if (!confirm("确定要重置该用户的API调用次数吗？")) return;
    
    try {
      const response = await fetch("/api/admin/users/" + userId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, resetUsed: true }),
      });
      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        fetchUsers();
      }
    } catch (err) {
      alert("重置失败");
    }
  };

  // 获取反馈列表
  const fetchFeedbacks = async () => {
    setFeedbackLoading(true);
    try {
      const savedUser = localStorage.getItem("simpletex_admin");
      if (!savedUser) return;
      
      const user = JSON.parse(savedUser);
      const authHeader = Buffer.from(JSON.stringify(user)).toString("base64");
      
      const response = await fetch("/api/admin/feedback", {
        headers: { "Authorization": authHeader },
      });
      const data = await response.json();
      
      if (data.success) {
        setFeedbacks(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch feedbacks", err);
    } finally {
      setFeedbackLoading(false);
    }
  };

  // 更新反馈状态
  const handleFeedbackStatus = async (id: string, status: string, adminNote: string = "") => {
    try {
      const savedUser = localStorage.getItem("simpletex_admin");
      if (!savedUser) return;
      
      const user = JSON.parse(savedUser);
      const authHeader = Buffer.from(JSON.stringify(user)).toString("base64");
      
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({ id, status, adminNote }),
      });
      const data = await response.json();
      
      if (data.success) {
        fetchFeedbacks();
      }
    } catch (err) {
      console.error("Failed to update feedback", err);
    }
  };

  // 删除用户
  const handleDelete = async (userId: string) => {
    if (!confirm("确定要删除该用户吗？")) return;
    
    try {
      const response = await fetch(`/api/admin/users/${userId}?id=${userId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      if (data.success) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to delete user", err);
    }
  };

  // 初始化管理员（首次部署时使用）
  const handleInitAdmin = async () => {
    if (!username || !password) {
      setLoginError("请输入用户名和密码");
      return;
    }
    
    try {
      const response = await fetch("/api/admin/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      
      if (data.success) {
        alert("管理员创建成功！请登录");
      } else {
        setLoginError(data.message);
      }
    } catch (err) {
      setLoginError("创建失败");
    }
  };

  // 退出
  const handleLogout = () => {
    localStorage.removeItem("simpletex_admin");
    setIsLoggedIn(false);
    setUsername("");
    setPassword("");
  };

  // 登录页面
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">管理后台</h1>
            <p className="text-slate-500 mt-2">管理员登录</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="请输入管理员用户名"
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
            
            <div className="border-t pt-4 mt-4">
              <p className="text-sm text-slate-500 mb-2">首次部署？创建管理员账号：</p>
              <button
                onClick={handleInitAdmin}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors text-sm"
              >
                创建管理员
              </button>
            </div>
            
            <div className="text-center mt-4">
              <a href="/" className="text-sm text-indigo-500 hover:text-indigo-600">
                ← 返回首页
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 管理员后台
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-slate-800">管理后台</h1>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-slate-600 hover:text-indigo-600">
              返回首页
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Tab 导航 */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "dashboard"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              数据统计
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              用户管理
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "feedback"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              反馈管理
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* 时间筛选 */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">API 调用统计</h2>
              <div className="flex gap-2">
                {(["7d", "30d", "all"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === p
                        ? "bg-indigo-500 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {p === "7d" ? "最近7天" : p === "30d" ? "最近30天" : "全部"}
                  </button>
                ))}
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm text-slate-500 mb-1">总调用次数</div>
                <div className="text-3xl font-bold text-slate-800">{stats?.totalCalls || 0}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm text-slate-500 mb-1">期间调用次数</div>
                <div className="text-3xl font-bold text-indigo-600">{stats?.periodCalls || 0}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm text-slate-500 mb-1">成功次数</div>
                <div className="text-3xl font-bold text-green-600">{stats?.successCalls || 0}</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="text-sm text-slate-500 mb-1">失败次数</div>
                <div className="text-3xl font-bold text-red-600">{stats?.failCalls || 0}</div>
              </div>
            </div>

            {/* 用户调用排行 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">用户调用排行</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">排名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">用户名</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">调用次数</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">占比</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {stats?.userCallStats.map((item, idx) => (
                      <tr key={item.userId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-600">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{item.username}</td>
                        <td className="px-4 py-3 text-slate-600">{item.count}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {stats.totalCalls > 0 ? ((item.count / stats.totalCalls) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                    {(!stats?.userCallStats || stats.userCallStats.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                          暂无数据
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            {/* 操作栏 */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">用户列表</h2>
              <button
                onClick={() => setShowAddUser(true)}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                添加用户
              </button>
            </div>

            {/* 添加用户弹窗 */}
            {showAddUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">添加用户</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">用户名 *</label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="请输入用户名"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">密码 *</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="请输入密码"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">邮箱 (可选)</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="请输入邮箱"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowAddUser(false)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleAddUser}
                      className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                    >
                      创建
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 编辑用户 API 限制弹窗 */}
            {editingUser && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">设置 API 调用限制</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                      <div className="px-4 py-2 bg-slate-50 rounded-lg text-slate-600">
                        {editingUser.username}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">当前已用 / 限制</label>
                      <div className="px-4 py-2 bg-slate-50 rounded-lg text-slate-600">
                        {editingUser.apiUsed} / {editingUser.apiLimit} 次
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">新限制次数</label>
                      <input
                        type="number"
                        value={editApiLimit}
                        onChange={(e) => setEditApiLimit(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="请输入调用次数限制"
                        min="0"
                      />
                      <p className="text-xs text-slate-500 mt-1">设置为 0 表示不限制</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setEditingUser(null)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={handleSaveApiLimit}
                      className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                    >
                      保存
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 用户列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">用户名</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">邮箱</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">角色</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">API限制/已用</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">注册时间</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          加载中...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                          暂无用户
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{user.username}</span>
                              {user.role === "admin" && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs">管理员</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {user.email || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                            {user.role === "admin" ? "管理员" : "普通用户"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              user.status === "approved" ? "bg-green-100 text-green-700" :
                              user.status === "rejected" ? "bg-red-100 text-red-700" :
                              "bg-slate-100 text-slate-700"
                            }`}>
                              {user.status === "pending" ? "待审批" :
                               user.status === "approved" ? "已通过" : 
                               user.status === "rejected" ? "已拒绝" : "已禁用"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-slate-500">
                              <span className={user.apiUsed >= user.apiLimit ? "text-red-600 font-medium" : ""}>
                                {user.apiUsed} / {user.apiLimit}
                              </span>
                              {user.apiUsed >= user.apiLimit && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">已用完</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                            {new Date(user.createdAt).toLocaleString("zh-CN")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              {/* API 限制操作 */}
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setEditApiLimit(String(user.apiLimit));
                                }}
                                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                                title="设置API限制"
                              >
                                配额
                              </button>
                              {user.apiUsed > 0 && (
                                <button
                                  onClick={() => handleResetUsed(user.id)}
                                  className="px-3 py-1 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded"
                                  title="重置使用次数"
                                >
                                  重置
                                </button>
                              )}
                              {user.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleApprove(user.id, "approve")}
                                    className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                                  >
                                    通过
                                  </button>
                                  <button
                                    onClick={() => handleApprove(user.id, "reject")}
                                    className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded"
                                  >
                                    拒绝
                                  </button>
                                </>
                              )}
                              {user.status === "approved" && user.role !== "admin" && (
                                <button
                                  onClick={() => handleApprove(user.id, "disable")}
                                  className="px-3 py-1 text-sm bg-slate-500 hover:bg-slate-600 text-white rounded"
                                >
                                  禁用
                                </button>
                              )}
                              {user.status === "disabled" && user.role !== "admin" && (
                                <button
                                  onClick={() => handleApprove(user.id, "enable")}
                                  className="px-3 py-1 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded"
                                >
                                  启用
                                </button>
                              )}
                              {user.status === "rejected" && user.role !== "admin" && (
                                <button
                                  onClick={() => handleApprove(user.id, "approve")}
                                  className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                                >
                                  重新审批
                                </button>
                              )}
                              {user.role !== "admin" && (
                                <button
                                  onClick={() => handleDelete(user.id)}
                                  className="px-3 py-1 text-sm text-red-500 hover:text-red-700"
                                >
                                  删除
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 反馈管理 */}
        {activeTab === "feedback" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">解析问题反馈列表</h2>
              </div>
              
              {feedbackLoading ? (
                <div className="p-8 text-center text-slate-400">加载中...</div>
              ) : feedbacks.length === 0 ? (
                <div className="p-8 text-center text-slate-400">暂无反馈记录</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">图片</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">解析结果</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">错误原因</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">提交时间</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {feedbacks.map((feedback) => (
                        <tr key={feedback.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            {feedback.imageUrl && (
                              <a href={`/api/feedback-image?file=${feedback.imageUrl}`} target="_blank" rel="noopener noreferrer">
                                <img src={`/api/feedback-image?file=${feedback.imageUrl}`} alt="反馈图片" className="w-16 h-16 object-cover rounded" />
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-sm text-slate-600 truncate font-mono">
                              {feedback.latexResult || "-"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-600">
                              {feedback.errorReason || "解析不正确"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              feedback.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                              feedback.status === "reviewed" ? "bg-blue-100 text-blue-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              {feedback.status === "pending" ? "待处理" :
                               feedback.status === "reviewed" ? "已处理" : "已解决"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500">
                            {new Date(feedback.createdAt).toLocaleString("zh-CN")}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              {feedback.status === "pending" && (
                                <>
                                  <button
                                    onClick={() => handleFeedbackStatus(feedback.id, "reviewed")}
                                    className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded"
                                  >
                                    标记已处理
                                  </button>
                                  <button
                                    onClick={() => handleFeedbackStatus(feedback.id, "resolved")}
                                    className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                                  >
                                    已解决
                                  </button>
                                </>
                              )}
                              {feedback.status === "reviewed" && (
                                <button
                                  onClick={() => handleFeedbackStatus(feedback.id, "resolved")}
                                  className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
                                >
                                  标记已解决
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
