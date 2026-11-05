import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Host routing:
 *   exclusive.thenameless.studio/jatin   ->  /c/jatin
 *   hq.thenameless.studio/...            ->  /hq/...
 * On the Vercel preview URL both live at their real paths (/c/jatin, /hq).
 * Also refreshes the HQ auth session cookie.
 */
export async function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const clientHost = (process.env.CLIENT_HOST || "").toLowerCase();
  const hqHost = (process.env.HQ_HOST || "").toLowerCase();
  const { pathname } = req.nextUrl;

  let res: NextResponse;
  if (clientHost && host === clientHost && !pathname.startsWith("/c/") && !pathname.startsWith("/api/")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/c" : `/c${pathname}`;
    res = NextResponse.rewrite(url);
  } else if (hqHost && host === hqHost && !pathname.startsWith("/hq") && !pathname.startsWith("/api/") && !pathname.startsWith("/auth/") && !pathname.startsWith("/login")) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/" ? "/hq" : `/hq${pathname}`;
    res = NextResponse.rewrite(url);
  } else {
    res = NextResponse.next();
  }

  // Keep the Supabase session fresh for HQ.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    });
    await supabase.auth.getUser();
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico|woff2?)$).*)"],
};
