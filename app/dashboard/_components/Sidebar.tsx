"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  LogOut,
  LayoutDashboard,
  Newspaper,
  BookOpen,
} from "lucide-react";
import Image from "next/image";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const user = useSelector((state: any) => state?.admin?.user);
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) return console.error("Sign-out failed:", error.message);
    // clear role from localStorage on logout so next load is clean
    try {
      if (typeof window !== "undefined") localStorage.removeItem("user_role");
    } catch (e) {
      /* ignore */
    }
    router.push("/");
  }

  // Initialize role from redux user so server & first client render match.
  // We'll update from localStorage on mount if available.
  const initialRole = (user?.role ?? "") as string;
  const [role, setRole] = useState<string>(initialRole.toLowerCase() || "");

  useEffect(() => {
    // On client replace role with localStorage value if present
    if (typeof window === "undefined") return;
    const storedRole = localStorage.getItem("user_role");
    if (storedRole && storedRole.trim() !== "") {
      setRole(storedRole.toLowerCase());
    }
  }, [user]);

  useEffect(() => {
    if (!role) return;

    const inDashboard = pathname?.startsWith("/dashboard");

    if (inDashboard && role !== "admin" && role !== "superadmin") {
      router.push("/");
      return;
    }
    if (pathname === "/dashboard/admin" && role !== "superadmin") {
      router.push("/dashboard");
      return;
    }
  }, [role, pathname, router]);

  const menuItems =
    role === "superadmin"
      ? [
          { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
          { title: "Admin Management", href: "/dashboard/admin", icon: BookOpen },
          { title: "Student Management", href: "/dashboard/students", icon: Users },
          { title: "Questions", href: "/dashboard/questions", icon: BookOpen },
        ]
      : role === "admin"
      ? [
          { title: "Student Management", href: "/dashboard/students", icon: Users },
          { title: "Questions", href: "/dashboard/questions", icon: BookOpen },
          { title: "Student Reports", href: "/dashboard/reports", icon: Newspaper },
        ]
      : [];

  return (
    <aside
      className={
        collapsed
          ? "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 w-16 transition-all duration-300"
          : "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 w-64 transition-all duration-300"
      }
    >
      <div className="px-3 py-3 border-b border-gray-300 flex items-center justify-start h-16">
        <Image
          src="/Logo.jpeg"
          alt="No Logo Found"
          width={collapsed ? 40 : 160}
          height={collapsed ? 40 : 40}
          className="object-contain max-h-[50px]"
        />
      </div>

      <nav className="flex-1 mt-6 overflow-y-auto">
        {menuItems.map(({ title, href, icon: Icon }) => {
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={
                active
                  ? "mx-2 flex items-center rounded-lg px-4 py-3 text-sm bg-[#F4F8FF] font-semibold text-[#003366]"
                  : "mx-2 flex items-center rounded-lg px-4 py-3 text-sm hover:bg-gray-100 text-black"
              }
            >
              <Icon
                className={
                  active
                    ? collapsed
                      ? "h-5 w-5 text-[#003366]"
                      : "h-5 w-5 mr-3 text-[#003366]"
                    : collapsed
                    ? "h-5 w-5"
                    : "h-5 w-5 mr-3"
                }
              />
              {!collapsed && (
                <span className={active ? "font-medium text-[#003366]" : "font-medium"}>
                  {title}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-2 border-t">
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="w-full h-12 cursor-pointer text-red-600 hover:text-red-800"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start h-12 cursor-pointer text-red-600 hover:text-red-800"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Log out
          </Button>
        )}
      </div>
    </aside>
  );
}
