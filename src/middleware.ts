import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { NextResponse, type NextRequest } from "next/server";

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let intl middleware handle locale redirects first (e.g. / -> /fr)
  const intlResponse = intlMiddleware(request);

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  // Extract locale from path
  const localeMatch = pathname.match(/^\/(fr|ar)(\/|$)/);
  const preferredLocale = request.cookies.get("preferred-locale")?.value;
  const locale = localeMatch ? localeMatch[1] : (preferredLocale || "fr");

  // Redirect to preferred locale if on wrong one and cookie is set
  if (localeMatch && preferredLocale && localeMatch[1] !== preferredLocale) {
    const isNavigatingDirectly = !request.headers.get("referer");
    if (isNavigatingDirectly) {
      const url = request.nextUrl.clone();
      url.pathname = pathname.replace(/^\/(fr|ar)/, `/${preferredLocale}`);
      return NextResponse.redirect(url);
    }
  }

  const isLoginPage = pathname.startsWith(`/${locale}/login`);
  const isRootPage =
    pathname === "/" ||
    pathname === `/${locale}` ||
    pathname === `/${locale}/`;

  // Set up Supabase client with cookie handling
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERROR: Missing Supabase environment variables in Middleware!");
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect logic
  if (!user && !isLoginPage && !isRootPage) {
    const url = request.nextUrl.clone();
    const targetLocale = preferredLocale || locale;
    url.pathname = `/${targetLocale}/login`;
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    const targetLocale = preferredLocale || locale;
    url.pathname = `/${targetLocale}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Copy intl headers (locale, etc.) onto the response
  intlResponse.headers.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
