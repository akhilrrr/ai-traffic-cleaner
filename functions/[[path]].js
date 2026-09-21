const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
};

function withCors(response) {
  const newHeaders = new Headers(response.headers);
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
  const accept = (request.headers.get("accept") || "").toLowerCase();
  const acceptLanguage = request.headers.get("accept-language");

  // 1. CORS Pre-Flight Request Handling
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  // 2. Dynamic /llms.txt Auto-Generation
  if (url.pathname === "/llms.txt") {
    try {
      const catalogResponse = await fetch(`${url.origin}/products.json?limit=50`);
      let markdownContent = `# ${url.hostname} — AI Store Catalog\n\n`;
      markdownContent += `> Dynamically generated product summary for AI crawlers and assistants.\n\n`;

      if (catalogResponse.ok) {
        const catalogData = await catalogResponse.json();
        if (catalogData.products && catalogData.products.length > 0) {
          catalogData.products.forEach((product) => {
            markdownContent += `## ${product.title}\n`;
            if (product.product_type) {
              markdownContent += `- Category: ${product.product_type}\n`;
            }
            if (product.variants && product.variants.length > 0) {
              markdownContent += `- Starting Price: $${product.variants[0].price}\n`;
            }
            markdownContent += `- Product Link: ${url.origin}/products/${product.handle}\n\n`;
          });
        } else {
          markdownContent += `Welcome to ${url.hostname}. Explore our catalog at ${url.origin}.\n`;
        }
      } else {
        markdownContent += `Welcome to ${url.hostname}. Explore our catalog at ${url.origin}.\n`;
      }

      return withCors(
        new Response(markdownContent, {
          status: 200,
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        })
      );
    } catch (error) {
      return withCors(
        new Response(`# ${url.hostname} Catalog\nVisit ${url.origin} for complete store products.`, {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      );
    }
  }

  // 3. Known AI Crawler Interception
  const aiBots = [
    "gptbot",
    "chatgpt-user",
    "perplexitybot",
    "claudebot",
    "anthropic-ai",
    "cohere-ai",
    "bytespider",
  ];

  const isKnownAiBot = aiBots.some((bot) => userAgent.includes(bot));

  if (isKnownAiBot) {
    return withCors(Response.redirect(`${url.origin}/llms.txt`, 302));
  }

  // 4. Unknown Scraper & Automation Bot Detection
  const botTools = ["python", "axios", "curl", "wget", "headlesschrome", "puppeteer", "scrapy"];
  const isAutomatedTool = botTools.some((tool) => userAgent.includes(tool));
  const isMissingLanguageAndBroadAccept = accept.includes("*/*") && !acceptLanguage;

  if (isAutomatedTool || isMissingLanguageAndBroadAccept) {
    return withCors(
      new Response("Access Restricted: Automated scraping activity detected.", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }

  // 5. Standard Shopper Passthrough
  const response = await context.next();
  return withCors(response);
}