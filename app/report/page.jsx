"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabaseBrowser";
import { Menu, X, Home, BarChart2 } from "lucide-react";

export default function ReportPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabaseBrowser.auth.getUser();
        if (error || !data?.user) {
          router.replace("/sign-in");
          return;
        }
        setAuthUser(data.user);
        setCheckingAuth(false);
      } catch (e) {
        router.replace("/sign-in");
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!authUser) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: resRows, error: resErr } = await supabaseBrowser
          .from("results")
          .select("*")
          .eq("user_id", authUser.id)
          .order("test_dt", { ascending: false });

        if (resErr) {
          setResults([]);
          setErrorMsg("Failed to load results.");
        } else {
          setResults(resRows || []);
        }
      } catch (e) {
        setResults([]);
        setErrorMsg("Unexpected error loading results.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authUser]);

  function fmtDate(iso) {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  function parseReport(reportJson) {
    if (!reportJson) return [];
    try {
      return JSON.parse(reportJson);
    } catch {
      return [];
    }
  }

  function parseTopic(topicJson) {
    if (!topicJson) return null;
    try {
      return JSON.parse(topicJson);
    } catch {
      return null;
    }
  }

  function optionClass(optionLetter, qObj, userAnswer) {
    const correct = (qObj.correctAnswer || "").toString().trim();
    if (optionLetter === correct) {
      return "mb-[8px] bg-[#e6ffea] border border-green-400 p-3 rounded";
    }
    if (userAnswer && userAnswer === optionLetter && optionLetter !== correct) {
      return "mb-[8px] bg-[#ffe6e6] border border-red-400 p-3 rounded";
    }
    return "mb-[8px] p-3 rounded";
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f6f9]">
        <p className="text-gray-600 text-lg">Checking authentication...</p>
      </div>
    );
  }

  // Header component (kept same style as other pages)
  const Header = () => (
    <header
      className="absolute top-0 left-0 w-full flex items-center justify-center z-20"
      style={{
        height: "70px",
        backgroundColor: "white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        position: "relative",
      }}
    >
      <button onClick={() => setMenuOpen(true)} className="absolute left-5 text-[#003366] hover:text-[#001d3d] transition">
        <Menu size={26} />
      </button>

      <div className="flex items-center gap-3 py-3">
        <Image src="/Logo.jpeg" alt="Institute Logo" width={115} height={70} className="rounded-md object-cover" />
        <h1 className="text-[#003366] text-2xl font-semibold">Institution for Aviators</h1>
      </div>
    </header>
  );

  // LIST
  function ResultsList() {
    if (loading) return <div className="py-8 text-center text-gray-600">Loading your results...</div>;
    if (errorMsg) return <div className="text-red-600 py-4">{errorMsg}</div>;
    if (!results.length) return <div className="py-8 text-center text-gray-600">You have no results yet.</div>;

    return (
      <div className="space-y-3">
        {results.map((r, idx) => (
          <button
            key={`${r.user_id}_${r.test_dt}_${idx}`}
            onClick={() => setSelectedResult(r)}
            className="w-full text-left p-3 rounded border hover:shadow-sm transition flex justify-between items-center"
          >
            <div>
              <div className="font-medium text-[#003366]">Result Date: {fmtDate(r.test_dt)}</div>
              <div className="text-sm text-gray-600">Marks: {r.marks} • Total: {r.total_questions}</div>
            </div>
            <div className="text-right text-sm text-gray-500">View</div>
          </button>
        ))}
      </div>
    );
  }

  // DETAIL: styled to match the screenshot (Report Card)
  function ResultDetail({ row }) {
    const topic = parseTopic(row.topic);
    const totalQuestions = Number(row.total_questions ?? 0);
    const marks = Number(row.marks ?? 0);
    // compute attempted and correct from report
    const report = parseReport(row.report);
    const attempted = report.filter((r) => r.userAnswer && r.userAnswer !== null && r.userAnswer !== "").length;
    const correct = report.filter((r) => r.isCorrect).length;

    return (
      <div className="flex justify-center w-full px-4 text-black">
        <div
          className="w-full max-w-[760px] bg-white rounded-2xl border shadow-xl p-6"
          style={{ borderColor: "rgba(0,0,0,0.12)" }}
        >
          {/* Top: small logo + title */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Image src="/Logo.jpeg" alt="logo" width={60} height={60} className="object-cover rounded-md" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#003366]">Report Card</div>
              <div className="text-sm text-gray-600">Performance Summary</div>
            </div>
          </div>

          {/* Summary + Topic table */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Summary */}
            <div>
              <h3 className="text-xl font-semibold text-[#003366] mb-3">Summary</h3>
              <div className="text-[15px] leading-7 text-black">
                <div>Total Questions: <span className="font-medium">{totalQuestions}</span></div>
                <div>Total Attempted: <span className="font-medium">{attempted}</span></div>
                <div>Total Correct Answers: <span className="font-medium">{correct}</span></div>
                <div>Total Marks: <span className="font-medium">{marks}</span></div>
              </div>
            </div>

            {/* Topic-wise table */}
            <div>
              <h3 className="text-xl font-semibold text-[#003366] mb-3">Topic-wise Percentage</h3>

              <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="text-left pb-3 border-b">Topic</th>
                      <th className="text-center pb-3 border-b">Correct</th>
                      <th className="text-center pb-3 border-b">Total</th>
                      <th className="text-right pb-3 border-b">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topic && topic.length ? topic : []).map((t) => (
                      <tr key={t.topic}>
                        <td className="py-3 border-b">{t.topic}</td>
                        <td className="py-3 text-center border-b">{t.correct}</td>
                        <td className="py-3 text-center border-b">{t.total}</td>
                        <td className="py-3 text-right border-b">{t.pct}%</td>
                      </tr>
                    ))}

                    {/* If no topic summary provided, show topics derived from report (fallback) */}
                    {(!topic || topic.length === 0) && report.length > 0 && (() => {
                      const byTopic = {};
                      report.forEach((q) => {
                        const tp = q.topic || "General";
                        if (!byTopic[tp]) byTopic[tp] = { total: 0, correct: 0 };
                        byTopic[tp].total += 1;
                        if (q.isCorrect) byTopic[tp].correct += 1;
                      });
                      return Object.keys(byTopic).map((tp) => {
                        const obj = byTopic[tp];
                        const pct = obj.total ? Math.round((obj.correct / obj.total) * 100) : 0;
                        return (
                          <tr key={tp}>
                            <td className="py-3 border-b">{tp}</td>
                            <td className="py-3 text-center border-b">{obj.correct}</td>
                            <td className="py-3 text-center border-b">{obj.total}</td>
                            <td className="py-3 text-right border-b">{pct}%</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Spacer line */}
          <div className="my-6 border-t" />

          {/* Back button centered */}
          <div className="flex justify-center">
            <button
              onClick={() => setSelectedResult(null)}
              className="px-6 py-2 rounded-lg border border-black text-black bg-white hover:bg-gray-50"
              style={{ minWidth: 150 }}
            >
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center relative bg-[#f4f4f4]">
      <Header />

      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-30 transform transition-transform duration-300 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-4">
          <button onClick={() => setMenuOpen(false)} className="text-gray-600 hover:text-black"><X size={26} /></button>
        </div>

        <nav className="mt-4 px-6 space-y-5 text-[#003366] text-lg font-medium">
          <button onClick={() => { setMenuOpen(false); router.push("/"); }} className="flex items-center gap-3 w-full text-left hover:text-[#001d3d]">
            <Home size={20} /> Home
          </button>

          <button onClick={() => { setMenuOpen(false); }} className="flex items-center gap-3 w-full text-left hover:text-[#001d3d]">
            <BarChart2 size={20} /> Results
          </button>
        </nav>
      </div>

      {menuOpen && <div onClick={() => setMenuOpen(false)} className="fixed inset-0 bg-black/20 z-20" />}

      <main className="w-full max-w-[1100px] mt-28 px-4 pb-12">
        {/* If selectedResult is present, only show the detail card (no outer white container) */}
        {selectedResult ? (
          <ResultDetail row={selectedResult} />
        ) : (
          // list view kept inside white container
          <div className="bg-white rounded-[12px] p-6 shadow-[0px_2px_8px_rgba(0,0,0,0.1)] border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[20px] font-bold text-[#003366]">My Results</div>
                <div className="text-sm text-gray-600">Showing results for the logged-in user</div>
              </div>
              <div>
                <button onClick={() => {
                  // refresh results
                  if (authUser) {
                    (async () => {
                      setLoading(true);
                      const { data: resRows, error: resErr } = await supabaseBrowser
                        .from("results")
                        .select("*")
                        .eq("user_id", authUser.id)
                        .order("test_dt", { ascending: false });
                      if (!resErr) setResults(resRows || []);
                      setLoading(false);
                    })();
                  }
                }} className="px-3 py-1 border rounded text-sm text-black">Refresh</button>
              </div>
            </div>

            <ResultsList />
          </div>
        )}
      </main>
    </div>
  );
}

// small header exported below (keeps file consistent)
function Header() {
  return (
    <header
      className="absolute top-0 left-0 w-full flex items-center justify-center z-20"
      style={{
        height: "70px",
        backgroundColor: "white",
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        position: "relative",
      }}
    >
      <div className="flex items-center gap-3 py-3">
        <Image src="/Logo.jpeg" alt="Institute Logo" width={115} height={70} className="rounded-md object-cover" />
        <h1 className="text-[#003366] text-2xl font-semibold">Institution for Aviators</h1>
      </div>
    </header>
  );
}
