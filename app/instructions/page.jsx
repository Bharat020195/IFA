"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { LogOut, Menu, X, Home, BarChart2 } from "lucide-react";

export default function InstructionsPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabaseBrowser.auth.getUser();

      if (error || !data?.user) {
        router.replace("/sign-in");
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
        <p className="text-gray-600 text-lg">Checking authentication...</p>
      </div>
    );
  }

  const startExam = () => {
    router.push("/test");
  };

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut();
    router.replace("/");
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center relative"
      style={{
        fontFamily: '"Segoe UI", Arial, sans-serif',
        backgroundColor: "#f4f6f9",
      }}
    >

      {/* ================= HEADER ================= */}
      <header
        className="absolute top-0 left-0 w-full flex items-center justify-center z-20"
        style={{
          height: "70px",
          backgroundColor: "white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          position: "relative",
        }}
      >
        {/* Left Menu Button */}
        <button
          onClick={() => setMenuOpen(true)}
          className="absolute left-5 text-[#003366] hover:text-[#001d3d] transition"
        >
          <Menu size={28} />
        </button>

        {/* Centered Logo */}
        <div className="flex items-center gap-3 py-3">
          <Image
            src="/Logo.jpeg"
            alt="Institute Logo"
            width={115}
            height={70}
            className="rounded-md object-cover"
          />
          <h1 className="text-[#003366] text-2xl font-semibold">
            Institution for Aviators
          </h1>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="absolute right-5 flex items-center gap-2 text-red-600 font-medium hover:text-red-800 transition"
        >
          <LogOut size={20} />
          Logout
        </button>
      </header>

      {/* ================= LEFT SLIDING MENU PANEL ================= */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-30 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close Button */}
        <div className="flex justify-end p-4">
          <button onClick={() => setMenuOpen(false)} className="text-gray-600 hover:text-black">
            <X size={26} />
          </button>
        </div>

        {/* Menu Options */}
        <nav className="mt-4 px-6 space-y-5 text-[#003366] text-lg font-medium">

          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-3 w-full text-left hover:text-[#001d3d]"
          >
            <Home size={22} /> Home
          </button>

          <button
            onClick={() => router.push("/report")}
            className="flex items-center gap-3 w-full text-left hover:text-[#001d3d]"
          >
            <BarChart2 size={22} /> Results
          </button>

        </nav>
      </div>

      {/* Background overlay when menu open */}
      {menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 bg-black/30 bg-opacity-40 z-20"
        />
      )}

      {/* ================= CONTENT ================= */}
      <div
        className="mx-auto text-left"
        style={{
          marginTop: "100px",
          backgroundColor: "#fff",
          padding: "30px 40px",
          borderRadius: "12px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          width: "80%",
          maxWidth: "700px",
        }}
      >
        <h2 className="text-center font-bold text-[#003366] text-2xl py-5">
          Exam Instructions
        </h2>

        <ol
          style={{
            lineHeight: 1.7,
            fontSize: "16px",
            color: "#333",
            paddingLeft: "20px",
          }}
        >
          <li style={{ marginBottom: "10px" }}>1. Read all questions carefully before answering.</li>
          <li style={{ marginBottom: "10px" }}>
            2. The total duration of the exam is{" "}
            <span style={{ fontWeight: "bold", color: "#003366" }}>180 minutes</span>.
          </li>
          <li style={{ marginBottom: "10px" }}>3. Do not refresh or close the browser window during the exam.</li>
          <li style={{ marginBottom: "10px" }}>
            4. Each question carries{" "}
            <span style={{ fontWeight: "bold", color: "#003366" }}>1 mark</span>. No negative marking.
          </li>
          <li style={{ marginBottom: "10px" }}>5. You can review and change your answers before submitting.</li>
          <li style={{ marginBottom: "10px" }}>6. Once submitted, you cannot reattempt the exam.</li>
          <li style={{ marginBottom: "10px" }}>7. Ensure a stable internet connection throughout the test.</li>
          <li style={{ marginBottom: "10px" }}>
            8. Use of mobile phones, notes, or other aids is strictly prohibited.
          </li>
          <li style={{ marginBottom: "10px" }}>
            9. Click the{" "}
            <span style={{ fontWeight: "bold", color: "#003366" }}>“Start Exam”</span>{" "}
            button below when you’re ready.
          </li>
        </ol>

        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <button
            onClick={startExam}
            style={{
              backgroundColor: "#003366",
              color: "white",
              border: "none",
              borderRadius: "8px",
              padding: "12px 30px",
              fontSize: "16px",
              cursor: "pointer",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#002855")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#003366")}
          >
            Start Exam
          </button>
        </div>
      </div>
    </div>
  );
}
