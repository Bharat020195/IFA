"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { Menu, X, Home, BarChart2, LogOut } from "lucide-react";

export default function TestPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentQ, setCurrentQ] = useState(1);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef({});
  const [selectedOption, setSelectedOption] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(15);
  const timerRef = useRef(null);
  const [isChecking, setIsChecking] = useState(true);

  // UI: menu drawer
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

  useEffect(() => {
    // ensure any previous test data cleared so test starts fresh on (re)enter
    try {
      localStorage.removeItem("answers");
      localStorage.removeItem("totalQuestions");
      localStorage.removeItem("totalAttempted");
      localStorage.removeItem("totalCorrect");
      localStorage.removeItem("totalMarks");
    } catch (e) {
      // ignore
    }

    loadQuestionsFromSupabase();
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (answers[currentQ]) {
      clearInterval(timerRef.current);
      setTimeLeft(0);
    } else {
      resetTimer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQ, answers]);

  useEffect(() => {
    setSelectedOption(answers[currentQ] ?? null);
  }, [currentQ, answers]);

  useEffect(() => {
    answersRef.current = answers;
    try {
      localStorage.setItem("answers", JSON.stringify(answers));
    } catch (e) {
      // ignore storage errors
    }
  }, [answers]);

  async function loadQuestionsFromSupabase() {
    try {
      const { data, error } = await supabaseBrowser
        .from("questions")
        .select("*")
        .order("Question", { ascending: true });

      if (error) {
        alert("Failed to load questions from Supabase!");
        setLoading(false);
        return;
      }

      setQuestions(data || []);
      setTotalQuestions((data || []).length || 0);
      setLoading(false);

      if ((data || []).length > 0) {
        setCurrentQ(1);
        setAnswers({});
        setSelectedOption(null);
        clearInterval(timerRef.current);
        setTimeLeft(15);
        resetTimer();
      }
    } catch (err) {
      alert("Failed to load questions from Supabase!");
      setLoading(false);
    }
  }

  function loadQuestion(qNo) {
    if (disableNavButtons()) return;
    if (qNo < 1) qNo = 1;
    if (qNo > totalQuestions) qNo = totalQuestions;
    setCurrentQ(qNo);
  }

  function resetTimer() {
    clearInterval(timerRef.current);
    setTimeLeft(15);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function disableNavButtons() {
    return timeLeft > 0;
  }

  function confirmAnswer() {
    if (!selectedOption) {
      alert("Please select an answer first!");
      return;
    }
    setAnswers((prev) => {
      const next = { ...prev, [currentQ]: selectedOption };
      return next;
    });
    clearInterval(timerRef.current);
    setTimeLeft(0);
  }

  function resetAnswer() {
    setSelectedOption(null);
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ];
      return copy;
    });
  }

  function goPrevious() {
    if (disableNavButtons()) return;
    setCurrentQ((c) => (c > 1 ? c - 1 : 1));
  }

  function goNext() {
    if (disableNavButtons()) return;
    setCurrentQ((c) => (c < totalQuestions ? c + 1 : totalQuestions));
  }

  // ---------- UPDATED: submitTest now persists results to public.results ----------
  async function submitTest() {
    clearInterval(timerRef.current);

    const storedAnswers = answersRef.current || {};
    const totalAttempted = Object.keys(storedAnswers).length;

    // Build per-question report array
    const reportArray = [];
    let totalCorrect = 0;

    // topic aggregation: { topicName: { total, correct } }
    const topicAgg = {};

    for (let i = 1; i <= totalQuestions; i++) {
      const q = questions[i - 1] || {};
      const correctAns = (q.Correct || "").toString().trim();
      const userAns = (storedAnswers[i] || "").toString();
      const isCorrect = userAns !== "" && userAns === correctAns;
      if (isCorrect) totalCorrect++;

      // collect topic aggregation (use lowercase 'topic' column if present)
      const topicName = (q.topic ?? "General").toString();
      if (!topicAgg[topicName]) topicAgg[topicName] = { total: 0, correct: 0 };
      topicAgg[topicName].total += 1;
      if (isCorrect) topicAgg[topicName].correct += 1;

      reportArray.push({
        questionNo: i,
        question: q.Question ?? "",
        topic: topicName,
        userAnswer: userAns || null,
        correctAnswer: correctAns || null,
        isCorrect,
      });
    }

    // build topic summary array for storing in results.topic column
    const topicSummary = Object.keys(topicAgg).map((t) => {
      const obj = topicAgg[t];
      return {
        topic: t,
        total: obj.total,
        correct: obj.correct,
        pct: obj.total ? Math.round((obj.correct / obj.total) * 100) : 0,
      };
    });

    const totalMarks = totalCorrect;
    const totalQuestionsStr = String(totalQuestions);
    const totalAttemptedStr = String(totalAttempted);
    const totalCorrectStr = String(totalCorrect);
    const totalMarksStr = String(totalMarks);
    const test_dt = new Date().toISOString();
    const reportJson = JSON.stringify(reportArray);
    const topicJson = JSON.stringify(topicSummary);

    // try to get user id
    let userId = null;
    try {
      const { data: userData } = await supabaseBrowser.auth.getUser();
      userId = userData?.user?.id ?? null;
    } catch (e) {
      // ignore
    }

    const resultPayload = {
      user_id: userId ?? "anonymous",
      marks: totalMarksStr,
      report: reportJson,
      test_dt,
      total_questions: totalQuestionsStr,
      topic: topicJson,
    };

    try {
      // upsert row into results table (on user_id)
      await supabaseBrowser.from("results").upsert([resultPayload], {
        onConflict: "user_id",
      });
    } catch (e) {
      console.error("Failed to write results to Supabase:", e);
      // continue — still navigate to report
    }

    // store summary to localStorage (existing behavior)
    try {
      localStorage.setItem("totalQuestions", totalQuestionsStr);
      localStorage.setItem("totalAttempted", totalAttemptedStr);
      localStorage.setItem("totalCorrect", totalCorrectStr);
      localStorage.setItem("totalMarks", totalMarksStr);
    } catch (e) {
      // ignore
    }

    // Finally navigate to report page
    router.push("/report");
  }

  // Exit test handler: clear stored data, stop timer and redirect to /instructions
  const handleExitTest = async () => {
    // stop timer
    clearInterval(timerRef.current);

    // clear local storage test keys
    try {
      localStorage.removeItem("answers");
      localStorage.removeItem("totalQuestions");
      localStorage.removeItem("totalAttempted");
      localStorage.removeItem("totalCorrect");
      localStorage.removeItem("totalMarks");
    } catch (e) {
      // ignore
    }

    // reset in-memory state (optional since navigating away)
    setAnswers({});
    answersRef.current = {};
    setSelectedOption(null);
    setCurrentQ(1);
    setTimeLeft(15);

    // navigate to instructions page
    router.replace("/instructions");
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
        <p className="text-gray-600 text-lg">Checking authentication...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <p className="text-gray-600">Loading test...</p>
      </div>
    );
  }

  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f4f4]">
        <div className="bg-white p-6 rounded-lg shadow-md border border-black">
          <p>No questions available.</p>
        </div>
      </div>
    );
  }

  const qObj = questions[currentQ - 1] || {};

  // helper to determine if navigation is allowed (timer completed)
  const navAllowed = !disableNavButtons();

  return (
    <div className="min-h-screen bg-[#f4f4f4] font-sans text-black">
    
      <header
        className="absolute top-0 left-0 w-full flex items-center justify-center z-20"
        style={{
          height: "70px",
          backgroundColor: "white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
          position: "relative",
        }}
      >
        {/* Left Menu Button */}
        <button
          onClick={() => setMenuOpen(true)}
          className="absolute left-5 text-[#003366] hover:text-[#001d3d] transition"
        >
          <Menu size={26} />
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

        {/* Exit Test button on Right */}
        <button
          onClick={handleExitTest}
          className="absolute right-5 flex items-center gap-2 text-red-600 font-medium hover:text-red-800 transition"
          title="Exit test and return to instructions"
        >
          <LogOut size={18} />
          Exit Test
        </button>
      </header>

      {/* Left sliding menu (drawer) */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-30 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setMenuOpen(false)} className="text-gray-600 hover:text-black">
            <X size={26} />
          </button>
        </div>

        <nav className="mt-4 px-6 space-y-5 text-[#003366] text-lg font-medium">
          <button
            onClick={() => {
              setMenuOpen(false);
              router.push("/");
            }}
            className="flex items-center gap-3 w-full text-left hover:text-[#001d3d]"
          >
            <Home size={20} /> Home
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              router.push("/report");
            }}
            className="flex items-center gap-3 w-full text-left hover:text-[#001d3d]"
          >
            <BarChart2 size={20} /> Results
          </button>
        </nav>
      </div>

      {/* overlay */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} className="fixed inset-0 bg-black/20 bg-opacity-40 z-20" />
      )}

      {/* Main card */}
      <div className="mx-5 bg-white rounded-[12px] p-[10px] shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border" style={{ marginTop: 90 }}>
        <div id="navigator" className="mb-[12px] border p-3 rounded bg-white">
          <div className="grid grid-cols-30 gap-2 w-full">
            {Array.from({ length: Math.max(totalQuestions, 100) }).map((_, i) => {
              const num = i + 1;
              const isAnswered = !!answers[num];
              const isCurrent = num === currentQ;

              return (
                <button
                  key={num}
                  onClick={() => loadQuestion(num)}
                  type="button"
                  className={`flex items-center justify-center 
            w-full h-[26px] text-[11px] font-bold rounded-[4px]
            ${isAnswered ? "bg-[#8aff8a]" : "bg-[#ffe680]"}
            ${isCurrent ? "ring-2 ring-[#003366]" : ""}
          `}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center w-full gap-[10px] mb-4">
          <div className="flex gap-[20px] font-bold text-[16px] flex-wrap">
            <span id="qNo">Question No: {currentQ}</span>
            <span>Marks: 1</span>
            <span id="timer" className="text-red-600 ml-[25px] text-[16px]">
              {timeLeft > 0 ? timeLeft : 0}
            </span>
            <span>Your Answer:</span>
          </div>

          <div className="flex gap-[14px] ml-[20px]">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="opt"
                value="A"
                checked={selectedOption === "A"}
                onChange={() => setSelectedOption("A")}
              />{" "}
              A
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="opt"
                value="B"
                checked={selectedOption === "B"}
                onChange={() => setSelectedOption("B")}
              />{" "}
              B
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="opt"
                value="C"
                checked={selectedOption === "C"}
                onChange={() => setSelectedOption("C")}
              />{" "}
              C
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="opt"
                value="D"
                checked={selectedOption === "D"}
                onChange={() => setSelectedOption("D")}
              />{" "}
              D
            </label>
          </div>

          <div className="ml-auto flex gap-[10px]">
            <button
              className="px-[6px] py-[6px] rounded-[6px] cursor-pointer text-[14px] bg-white text-black border border-black font-bold"
              onClick={confirmAnswer}
              type="button"
            >
              Confirm Answer
            </button>
            <button
              className="px-[6px] py-[6px] rounded-[6px] cursor-pointer text-[14px] bg-white text-black border border-black font-bold"
              onClick={resetAnswer}
              type="button"
            >
              Reset Answer
            </button>
          </div>
        </div>

        <h3 id="questionText" className="mt-[8px] text-[18px] font-bold mb-3">
          {qObj.Question || "Loading..."}
        </h3>

        <div id="optionsBox" className="mt-[12px] p-[12px] bg-white rounded-[8px] border">
          <div id="optA" className="mb-[8px]">
            A) {qObj.A}
          </div>
          <div id="optB" className="mb-[8px]">
            B) {qObj.B}
          </div>
          <div id="optC" className="mb-[8px]">
            C) {qObj.C}
          </div>
          <div id="optD" className="mb-[8px]">
            D) {qObj.D}
          </div>
        </div>

        <div className="mt-[20px] flex gap-[10px]">
          {/* Previous button: highlighted style only when navAllowed */}
          <button
            id="prevBtn"
            onClick={goPrevious}
            disabled={!navAllowed}
            type="button"
            className={`px-[10px] py-[10px] rounded-[8px] text-[16px] border font-bold transition-all
              ${
                !navAllowed
                  ? "bg-white text-black border border-black cursor-not-allowed"
                  : "bg-[#003366] text-white border-transparent hover:bg-[#002855] cursor-pointer"
              }`}
          >
            Previous
          </button>

          {/* Next button: highlighted style only when navAllowed */}
          <button
            id="nextBtn"
            onClick={goNext}
            disabled={!navAllowed}
            type="button"
            style={{
              display: currentQ === totalQuestions ? "none" : "inline-block",
            }}
            className={`px-[10px] py-[10px] rounded-[8px] text-[16px] border font-bold transition-all
              ${
                !navAllowed
                  ? "bg-white text-black border border-black cursor-not-allowed"
                  : "bg-[#003366] text-white border-transparent hover:bg-[#002855] cursor-pointer"
              }`}
          >
            Next
          </button>

          <button
            id="submitBtn"
            className="px-[10px] py-[10px] rounded-[8px] text-[16px] border border-black"
            onClick={submitTest}
            type="button"
            style={{
              display: currentQ === totalQuestions ? "inline-block" : "none",
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
