"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Loader from "@/app/(auth)/callback/loading";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabaseBrowser.auth.getUser();

      if (!data?.user) {
        router.replace("/sign-in");
        return;
      }

      const uid = data.user.id;

      const { data: userRow } = await supabaseBrowser
        .from("users")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      const role = userRow?.role?.toLowerCase();

     router.replace('/callback')
    };

    checkUser();
  }, [router]);

  return (
    <div className="flex justify-center items-center bg-white">
      <Loader />
    </div>
  );
}
