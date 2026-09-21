/**
 * AI Traffic Cleaner - Edge Traffic Router
 * Runs on Cloudflare Pages Functions in under 2ms.
 */

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // 1. Instantly respond to CORS pre-flight requests from bots or tools
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, User-Agent",
      },
    });
  }

  // Extract raw incoming request headers
  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  const acceptHeader = request.headers.get("accept") || "";
  const acceptLanguage = request.headers.get("accept-language") || "";

  // Dynamic Query Overrides (Passed by App Embed URL query parameters if present)
  const isolateChatGPT = url.searchParams.get("cgpt") !== "0"; 
  const isolatePerplexity = url.searchParams.get("prpx") !== "0"; 
  const isolateClaude = url.searchParams.get("cld") !== "0"; 
  const blockUnknown = url.searchParams.get("unkn") !== "0"; 
  const whitelistRoute = url.searchParams.get("route") || "/llms.txt";

  // Prevent infinite loops: If bot is already on the target route, pass through cleanly
  if (url.pathname === whitelistRoute) {
    return context.next();
  }

  // --- STAGE 1: KNOWN AI SEARCH BOT INTERCEPTION ---
  const isChatGPT = userAgent.includes("gptbot") || userAgent.includes("chatgpt-user");
  const isPerplexity = userAgent.includes("perplexitybot");
  const isClaude = userAgent.includes("claudebot");

  const isMatchedAi = 
    (isChatGPT && isolateChatGPT) ||
    (isPerplexity && isolatePerplexity) ||
    (isClaude && isolateClaude);

  if (isMatchedAi) {
    // 302 Redirect AI bot directly to the text feed (/llms.txt)
    const redirectUrl = new URL(whitelistRoute, request.url);
    return Response.redirect(redirectUrl.toString(), 302);
  }

  // --- STAGE 2: UNKNOWN SCRAPER & HEADLESS BOT DETECTION ---
  if (blockUnknown) {
    const isRawAcceptHeader = acceptHeader === "*/*";
    const isMissingLanguageHeader = !acceptLanguage;
    const isKnownScraperString = 
      userAgent.includes("python") || 
      userAgent.includes("axios") || 
      userAgent.includes("curl") || 
      userAgent.includes("wget");

    if ((isRawAcceptHeader && isMissingLanguageHeader) || isKnownScraperString) {
      // Block unverified data scrapers immediately
      return new Response("Access Restricted", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  // --- STAGE 3: VERIFIED HUMAN TRAFFIC ---
  // Pass normal shopper request straight to standard Shopify storefront
  return context.next();
}