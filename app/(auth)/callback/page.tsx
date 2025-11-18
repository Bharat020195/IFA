"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "../../../store/hooks";
import { setUser } from "../../../store/reducers/userSlice";
import { supabaseBrowser } from "../../../lib/supabaseBrowser";
import { Loader } from "lucide-react";

export default function AuthCallbackPage() {
const router = useRouter();
const dispatch = useAppDispatch();
const [loading, setLoading] = useState(true);

useEffect(() => {
(async () => {
try {
const {
data: { session },
} = await supabaseBrowser.auth.getSession();

    if (!session) {
      router.replace("/sign-in");
      return;
    }

    const {
      data: { user: authUser },
    } = await supabaseBrowser.auth.getUser();

    const userId = authUser?.id ?? null;
    const email = authUser?.email ?? "";
    const fullNameMeta = authUser?.user_metadata?.full_name ?? "";

    let role = null;
    let full_name = fullNameMeta || null;

    if (userId) {
      const { data: userRow, error: userErr } = await supabaseBrowser
        .from("users")
        .select("role,full_name")
        .eq("id", userId)
        .maybeSingle();

      if (!userErr && userRow) {
        role = userRow.role ?? null;
        if (userRow.full_name) full_name = userRow.full_name;
      }
    }

    const userForStore = {
      id: userId,
      email,
      full_name,
      role,
    };

    dispatch(setUser(userForStore));
  
    localStorage.setItem("user_role", role || "");



    if (role === "admin" || role === "superadmin") {
      router.replace("/dashboard");
    } else {
      router.replace("/instructions");
    }
  } catch (err) {
    router.replace("/sign-in");
  } finally {
    setLoading(false);
  }
})();


}, [router, dispatch]);

return ( <div className="flex h-screen w-full items-center justify-center bg-white text-black"> <div className="flex flex-col items-center gap-2"> <Loader className="h-10 w-10 animate-spin text-blue-600" /> <h3 className="text-xl font-bold">Authenticating...</h3> <p>Please wait while we verify your credentials</p> </div> </div>
);
}
