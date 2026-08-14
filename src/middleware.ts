import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_OPTIONS,
  buildAccessCookie,
  readAccessCookie,
} from "./lib/access-cookie";
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
  const isResetPage = pathname.startsWith(`/${locale}/reset-password`);
  const isLegalPage = pathname.startsWith(`/${locale}/legal`);
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

  // PERF : `getClaims()` verifie la signature du JWT localement (WebCrypto)
  // quand le projet utilise des cles asymetriques, la ou `getUser()` faisait un
  // aller-retour vers le serveur Auth (~180 ms) sur chaque navigation.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const user = claims?.sub
    ? { id: claims.sub, user_metadata: claims.user_metadata ?? {} }
    : null;

  // Redirect logic
  if (!user && !isLoginPage && !isResetPage && !isLegalPage && !isRootPage) {
    const url = request.nextUrl.clone();
    const targetLocale = preferredLocale || locale;
    url.pathname = `/${targetLocale}/login`;
    return NextResponse.redirect(url);
  }

  let accessCookieToSet: string | null = null;

  if (user && !isLoginPage && !isResetPage && user.user_metadata?.role === "prof") {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Verification deja faite il y a moins de 10 minutes pour ce compte : on
    // saute l'aller-retour RPC (voir lib/access-cookie.ts).
    const cached = await readAccessCookie(
      request.cookies.get(ACCESS_COOKIE)?.value,
      user.id,
    );

    if (!cached && serviceKey && supabaseUrl) {
      try {
        // Acces actif = sa propre cle OU (prof d'ecole) l'abonnement du
        // directeur. La fonction has_active_access gere les deux cas.
        const res = await fetch(
          `${supabaseUrl}/rest/v1/rpc/has_active_access`,
          {
            method: "POST",
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ p_user: user.id }),
          }
        );
        const hasAccess = await res.json();
        const expired = hasAccess !== true;

        if (expired) {
          // Do NOT call supabase.auth.signOut() here — it doesn't reliably
          // clear browser session cookies from Edge middleware.
          // Instead, redirect to login with ?expired=true so the client can
          // call signOut() itself and properly clear the session.
          const url = request.nextUrl.clone();
          const targetLocale = preferredLocale || locale;
          url.pathname = `/${targetLocale}/login`;
          url.searchParams.set("expired", "true");

          // Clear the Supabase session cookies in the redirect response
          // so the browser doesn't keep sending them on subsequent requests.
          const redirectResponse = NextResponse.redirect(url);
          request.cookies.getAll().forEach(({ name }) => {
            if (name.startsWith("sb-")) {
              redirectResponse.cookies.delete(name);
            }
          });
          redirectResponse.cookies.delete(ACCESS_COOKIE);
          return redirectResponse;
        }

        // Acces confirme : on memorise le resultat pour 10 minutes.
        accessCookieToSet = await buildAccessCookie(user.id);
      } catch {
        // Si la verification echoue, on laisse passer (sans rien memoriser,
        // pour que la prochaine navigation retente la verification).
      }
    }
  }

  if (user && isLoginPage) {
    const isExpiredParam = request.nextUrl.searchParams.get("expired") === "true";
    if (!isExpiredParam) {
      const url = request.nextUrl.clone();
      const targetLocale = preferredLocale || locale;
      url.pathname = `/${targetLocale}/dashboard`;
      return NextResponse.redirect(url);
    }
  }

  if (accessCookieToSet) {
    response.cookies.set(ACCESS_COOKIE, accessCookieToSet, ACCESS_COOKIE_OPTIONS);
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
