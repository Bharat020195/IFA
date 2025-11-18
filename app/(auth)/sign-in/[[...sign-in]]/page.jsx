"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { supabaseBrowser } from "../../../../lib/supabaseBrowser";
import { Eye, EyeOff } from "lucide-react";

export default function SigninPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState("student");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorVisible(false);
    setErrorMessage("");
    setLoading(true);

    try {
      const { data, error } = await supabaseBrowser.auth.signInWithPassword({
        email: username,
        password,
      });

      if (error || !data?.user) {
        setErrorVisible(true);
        setErrorMessage(`Invalid credentials for ${username}`);
        setLoading(false);
        return;
      }

      const authId = data.user.id;

      // 1) Try to fetch by users.id (UUID)
      const { data: userById, error: errById } = await supabaseBrowser
        .from("users")
        .select("role")
        .eq("id", authId)
        .maybeSingle();

      let role = userById?.role ?? null;

      // 2) If not found by id, try matching public.users.userId (fallback)
      if (!role) {
        const { data: userByUserId, error: errByUserId } = await supabaseBrowser
          .from("users")
          .select("role")
          .eq("userId", username)
          .maybeSingle();

        role = userByUserId?.role ?? null;
      }

      const roleNormalized = role ? String(role).trim().toLowerCase() : null;

      if (loginType === "student") {
        if (roleNormalized !== "user") {
          await supabaseBrowser.auth.signOut();
          setErrorVisible(true);
          setErrorMessage(`No Student Id for UserId`);
          setLoading(false);
          return;
        }
      } else {
        if (roleNormalized !== "admin" && roleNormalized !== "superadmin") {
          await supabaseBrowser.auth.signOut();
          setErrorVisible(true);
          setErrorMessage(`No Admin Id for UID userId`);
          setLoading(false);
          return;
        }
      }

      localStorage.setItem("student_name", username);
      localStorage.setItem("user_id", authId);
      if (roleNormalized) localStorage.setItem("role", roleNormalized);

      router.push("/callback");
    } catch (err) {
      console.error(err);
      setErrorVisible(true);
      setErrorMessage("Unexpected error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center relative px-4">
      <header className="absolute top-0 left-0 w-full h-18 shadow-md bg-white flex items-center justify-between z-20 px-10">
        <div></div>
        <div></div>
        <div className="flex items-center gap-3 py-3">
          <Image src="/Logo.jpeg" alt="Institute Logo" width={115} height={70} className="rounded-md object-cover" />
          <h1 className="text-[#003366] text-2xl font-semibold">Institution for Aviators</h1>
        </div>
        <div className="flex gap-5 items-center">
          <button
            onClick={() => setLoginType("student")}
            className={`px-3 py-1 rounded-md border text-sm font-medium ${
              loginType === "student" ? "bg-[#003366] text-white border-[#003366]" : "text-[#003366] border-[#003366] bg-white"
            }`}
          >
            Student Login
          </button>

          <button
            onClick={() => setLoginType("admin")}
            className={`px-3 py-1 rounded-md border text-sm font-medium ${
              loginType === "admin" ? "bg-[#003366] text-white border-[#003366]" : "text-[#003366] border-[#003366] bg-white"
            }`}
          >
            Admin Login
          </button>
        </div>
      </header>

      <main className="mt-28 w-full max-w-[400px] shadow-lg">
        <div className="bg-white rounded-xl shadow-md p-10 text-center">
          <h2 className="text-[#003366] text-2xl font-bold mb-4">{loginType === "student" ? "Student Login" : "Admin Login"}</h2>

          <form id="loginForm" onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              id="username"
              placeholder="Username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder-gray-500 text-black"
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder-gray-500 text-black"
              />

              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-gray-700">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {errorVisible && <div className="text-red-500 text-sm mt-1">{errorMessage || "Invalid credentials or access denied"}</div>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 py-2 rounded-md text-white text-sm font-medium ${loading ? "bg-[#003366]/70 cursor-not-allowed" : "bg-[#003366] hover:bg-[#002855]"}`}
            >
              {loading ? "Checking…" : "Login"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
