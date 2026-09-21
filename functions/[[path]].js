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
  if (url.pathname === '/llms.txt') {
  try {
    const shopifyOrigin = 'https://ai-test-1-g9qgh2pw.myshopify.com';
    const response = await fetch(`${shopifyOrigin}/products.json?limit=50`, {
      headers: { 'User-Agent': 'AITrafficCleaner/1.0' }
    });

    if (!response.ok) {
      throw new Error(`Shopify returned status ${response.status}`);
    }

    const data = await response.json();
    let markdown = `# Store Catalog Summary\n\nGenerated for AI Crawlers and Search Agents.\n\n## Products\n\n`;

    if (data.products && data.products.length > 0) {
      for (const product of data.products) {
        const title = product.title || 'Untitled Product';
        const handle = product.handle || '';
        const price = product.variants?.[0]?.price ? product.variants[0].price : 'N/A';
        
        markdown += `- **${title}** - Price: ${price}\n  Link: ${shopifyOrigin}/products/${handle}\n\n`;
      }
    } else {
      markdown += `No public products currently found.\n`;
    }

    return new Response(markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(`# Store Catalog\n\nError generating live catalog: ${err.message}`, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
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