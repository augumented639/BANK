import { 
  ALL_SEO_PAGES, 
  getPageByPath, 
  DOMAIN, 
  BRAND_NAME, 
  SUPPORT_EMAIL, 
  SeoPageData, 
  CORE_PAGES, 
  BANK_PAGES, 
  BLOG_POSTS, 
  TRUST_PAGES 
} from '../data/seoPages';

/**
 * Escapes HTML characters for safe server-side interpolation
 */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates JSON-LD structured data scripts
 */
function generateStructuredData(page: SeoPageData): string {
  const schemas: any[] = [];

  // 1. Organization Schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': BRAND_NAME,
    'url': DOMAIN,
    'logo': `${DOMAIN}/favicon.svg`,
    'email': SUPPORT_EMAIL,
    'contactPoint': {
      '@type': 'ContactPoint',
      'email': SUPPORT_EMAIL,
      'contactType': 'customer support',
    },
  });

  // 2. WebSite Schema
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': BRAND_NAME,
    'url': DOMAIN,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${DOMAIN}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  });

  // 3. WebApplication Schema (Truthful free tier details)
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': BRAND_NAME,
    'url': `${DOMAIN}${page.urlPath}`,
    'applicationCategory': 'FinanceApplication',
    'operatingSystem': 'All',
    'browserRequirements': 'Requires JavaScript and HTML5 support',
    'description': page.metaDescription,
    'offers': {
      '@type': 'Offer',
      'price': '0',
      'priceCurrency': 'USD',
      'description': 'Free tier includes 10 initial conversion credits without sign-up or credit card.',
    },
  });

  // 4. BreadcrumbList Schema (on inner pages)
  if (page.breadcrumbs && page.breadcrumbs.length > 1) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': page.breadcrumbs.map((b, idx) => ({
        '@type': 'ListItem',
        'position': idx + 1,
        'name': b.name,
        'item': `${DOMAIN}${b.path}`,
      })),
    });
  }

  // 5. FAQPage Schema (when visible FAQs exist on page)
  if (page.faqs && page.faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': page.faqs.map((faq) => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer,
        },
      })),
    });
  }

  // 6. BlogPosting Schema (for blog articles)
  if (page.category === 'blog') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': page.h1,
      'description': page.metaDescription,
      'author': {
        '@type': 'Organization',
        'name': BRAND_NAME,
      },
      'publisher': {
        '@type': 'Organization',
        'name': BRAND_NAME,
        'logo': {
          '@type': 'ImageObject',
          'url': `${DOMAIN}/favicon.svg`,
        },
      },
      'datePublished': page.publishDate || '2026-03-15',
      'dateModified': '2026-04-10',
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': `${DOMAIN}${page.urlPath}`,
      },
    });
  }

  return schemas.map((s) => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n');
}

/**
 * Builds full HTML document for a specific route
 */
export function renderPageHtml(pathname: string): { html: string; status: number } {
  const page = getPageByPath(pathname);

  // If path is not found, render custom 404 page
  if (!page) {
    return {
      status: 404,
      html: render404Html(pathname),
    };
  }

  const structuredDataHtml = generateStructuredData(page);

  // Related tools links
  const relatedLinksHtml = (page.relatedSlugs || [])
    .map((slug) => {
      const relPage = ALL_SEO_PAGES[slug];
      if (!relPage) return '';
      return `
        <a href="${relPage.urlPath}" class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-500 hover:shadow-md transition-all group block">
          <div class="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">${escapeHtml(relPage.primaryKeyword)}</div>
          <div class="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">${escapeHtml(relPage.h1)}</div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">${escapeHtml(relPage.metaDescription)}</p>
        </a>
      `;
    })
    .join('');

  // Breadcrumbs HTML
  const breadcrumbsHtml = (page.breadcrumbs || [])
    .map((b, idx, arr) => {
      const isLast = idx === arr.length - 1;
      return `
        <li class="inline-flex items-center">
          ${idx > 0 ? '<span class="mx-2 text-slate-400">/</span>' : ''}
          ${isLast 
            ? `<span class="text-slate-600 dark:text-slate-400 font-medium">${escapeHtml(b.name)}</span>`
            : `<a href="${b.path}" class="text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400">${escapeHtml(b.name)}</a>`
          }
        </li>
      `;
    })
    .join('');

  // Steps HTML
  const stepsHtml = (page.howItWorksSteps || [])
    .map((s) => `
      <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div class="w-8 h-8 rounded-xl bg-sky-600 text-white font-bold flex items-center justify-center text-sm mb-3">
          ${s.step}
        </div>
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">${escapeHtml(s.title)}</h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">${escapeHtml(s.description)}</p>
      </div>
    `)
    .join('');

  // Key Features HTML
  const featuresHtml = (page.keyFeatures || [])
    .map((f) => `
      <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <h3 class="text-base font-bold text-slate-800 dark:text-slate-100 mb-2">${escapeHtml(f.title)}</h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">${escapeHtml(f.description)}</p>
      </div>
    `)
    .join('');

  // FAQs HTML
  const faqsHtml = (page.faqs || [])
    .map((faq) => `
      <div class="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <h3 class="text-base font-bold text-slate-900 dark:text-slate-100 mb-2">${escapeHtml(faq.question)}</h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">${escapeHtml(faq.answer)}</p>
      </div>
    `)
    .join('');

  // Bank Specific Details Box if applicable
  const bankDetailsHtml = page.bankDetails ? `
    <div class="my-8 p-6 rounded-2xl border border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20">
      <h2 class="text-lg font-bold text-slate-900 dark:text-slate-100 mb-3">${escapeHtml(page.h1)} - Format Specifications</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
        <div><strong>Country / Currency:</strong> ${escapeHtml(page.bankDetails.country)} (${escapeHtml(page.bankDetails.currency)})</div>
        <div><strong>Standard Date Notation:</strong> ${escapeHtml(page.bankDetails.defaultDateFormat)}</div>
        <div class="md:col-span-2"><strong>Statement Layout:</strong> ${escapeHtml(page.bankDetails.statementLayoutNotes)}</div>
        <div class="md:col-span-2"><strong>Password Pattern:</strong> ${escapeHtml(page.bankDetails.passwordConventionHelp)}</div>
        <div class="md:col-span-2"><strong>Extracted Columns:</strong> ${escapeHtml(page.bankDetails.columnOrder.join(' • '))}</div>
      </div>
    </div>
  ` : '';

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.metaDescription)}" />
    <link rel="canonical" href="${DOMAIN}${page.urlPath}" />
    <meta name="theme-color" content="#0284c7" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/favicon.svg" />
    <link rel="manifest" href="/manifest.webmanifest" />

    <!-- Google Search Console Verification Tags -->
    <meta name="google-site-verification" content="googleb39d2bb795486d21" />
    <meta name="google-site-verification" content="I-K6Eu-igOg9UtI_IP28F3V8yqIfQOYtz1NUQpPEwpg" />

    <!-- Open Graph Social Metadata -->
    <meta property="og:site_name" content="${BRAND_NAME}" />
    <meta property="og:type" content="${page.category === 'blog' ? 'article' : 'website'}" />
    <meta property="og:title" content="${escapeHtml(page.title)}" />
    <meta property="og:description" content="${escapeHtml(page.metaDescription)}" />
    <meta property="og:url" content="${DOMAIN}${page.urlPath}" />
    <meta property="og:image" content="${DOMAIN}/og-image.png" />

    <!-- Twitter / X Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(page.title)}" />
    <meta name="twitter:description" content="${escapeHtml(page.metaDescription)}" />
    <meta name="twitter:image" content="${DOMAIN}/og-image.png" />

    <!-- Structured Data (JSON-LD) -->
${structuredDataHtml}
  </head>
  <body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen antialiased flex flex-col font-sans">
    <div id="root">
      <!-- Semantic Static Header & Navigation for Search Engine Crawlers -->
      <header class="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="/" class="flex items-center gap-3 group">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <span class="font-bold text-lg tracking-wider">BC</span>
            </div>
            <div>
              <span class="text-base font-bold text-slate-900 dark:text-white tracking-tight block">${BRAND_NAME}</span>
              <span class="text-[10px] text-sky-600 dark:text-sky-400 font-semibold tracking-wider uppercase block">AI & OCR Spreadsheet Engine</span>
            </div>
          </a>

          <nav aria-label="Main Navigation" class="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <a href="/pdf-bank-statement-to-excel" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">PDF to Excel</a>
            <a href="/pdf-bank-statement-to-csv" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">PDF to CSV</a>
            <a href="/scanned-bank-statement-to-excel" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Scanned OCR</a>
            <a href="/bank-statement-to-quickbooks" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">QuickBooks</a>
            <a href="/banks" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Bank Formats</a>
            <a href="/blog" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Guides</a>
            <a href="/pricing" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Pricing & Credits</a>
            <a href="/security" class="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">Security</a>
          </nav>
        </div>
      </header>

      <!-- Main Crawlable Semantic Content Body -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <!-- Breadcrumb Navigation -->
        ${page.breadcrumbs && page.breadcrumbs.length > 0 ? `
          <nav aria-label="Breadcrumb" class="mb-6">
            <ol class="flex flex-wrap items-center text-xs text-slate-600 dark:text-slate-400">
              ${breadcrumbsHtml}
            </ol>
          </nav>
        ` : ''}

        <!-- Hero Section -->
        <div class="text-center max-w-4xl mx-auto mb-10">
          ${page.heroBadge ? `
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800 mb-4">
              <span>★</span>
              <span>${escapeHtml(page.heroBadge)}</span>
            </div>
          ` : ''}
          <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-4">
            ${escapeHtml(page.h1)}
          </h1>
          ${page.introParagraphs.map((p) => `
            <p class="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-4">${escapeHtml(p)}</p>
          `).join('')}
        </div>

        <!-- Interactive Converter Tool Container (Hydrated by React on client load) -->
        <div id="interactive-converter-container" class="my-8"></div>

        ${bankDetailsHtml}

        <!-- How It Works Section -->
        <section class="my-12">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">How It Works: Step-by-Step Conversion</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            ${stepsHtml}
          </div>
        </section>

        <!-- Key Features Section -->
        <section class="my-12">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Key Features & Financial Extraction Capabilities</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${featuresHtml}
          </div>
        </section>

        <!-- Security and Ephemeral Processing Guarantee -->
        <section class="my-12 p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20">
          <h2 class="text-xl font-bold text-slate-900 dark:text-white mb-3">Security & In-Memory Ephemeral Processing Guarantee</h2>
          <p class="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-4">${escapeHtml(page.securityNote)}</p>
          <div class="flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span class="inline-flex items-center gap-1.5"><span class="text-emerald-500 font-bold">&check;</span> Zero Server Disk Retention</span>
            <span class="inline-flex items-center gap-1.5"><span class="text-emerald-500 font-bold">&check;</span> CSV & Excel Formula Injection Defense</span>
            <span class="inline-flex items-center gap-1.5"><span class="text-emerald-500 font-bold">&check;</span> End-to-End TLS Encryption</span>
            <span class="inline-flex items-center gap-1.5"><span class="text-emerald-500 font-bold">&check;</span> User-Controlled Local Data Deletion</span>
          </div>
        </section>

        <!-- Visible Frequently Asked Questions -->
        <section class="my-12">
          <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div class="space-y-4 max-w-4xl mx-auto">
            ${faqsHtml}
          </div>
        </section>

        <!-- Related Conversion Tools -->
        ${relatedLinksHtml ? `
          <section class="my-12">
            <h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">Related Conversion Tools & Guides</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              ${relatedLinksHtml}
            </div>
          </section>
        ` : ''}
      </main>

      <!-- Structured Semantic Footer with All Hub Links -->
      <footer class="mt-auto bg-slate-900 text-slate-400 border-t border-slate-800 text-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div class="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
            <!-- Col 1: Tools -->
            <div>
              <div class="text-white font-bold text-sm mb-3">Conversion Tools</div>
              <ul class="space-y-2">
                <li><a href="/pdf-bank-statement-to-excel" class="hover:text-white transition-colors">PDF to Excel</a></li>
                <li><a href="/pdf-bank-statement-to-csv" class="hover:text-white transition-colors">PDF to CSV</a></li>
                <li><a href="/scanned-bank-statement-to-excel" class="hover:text-white transition-colors">Scanned OCR to Excel</a></li>
                <li><a href="/bank-statement-image-to-excel" class="hover:text-white transition-colors">Image & Photo to Excel</a></li>
                <li><a href="/passbook-to-excel" class="hover:text-white transition-colors">Passbook to Excel</a></li>
                <li><a href="/bank-statement-reconciliation-excel" class="hover:text-white transition-colors">Reconciliation Audit</a></li>
              </ul>
            </div>

            <!-- Col 2: Targeted Banks -->
            <div>
              <div class="text-white font-bold text-sm mb-3">Targeted Banks</div>
              <ul class="space-y-2">
                <li><a href="/banks/sbi" class="hover:text-white transition-colors">SBI (State Bank of India)</a></li>
                <li><a href="/banks/hdfc" class="hover:text-white transition-colors">HDFC Bank</a></li>
                <li><a href="/banks/icici" class="hover:text-white transition-colors">ICICI Bank</a></li>
                <li><a href="/banks/axis" class="hover:text-white transition-colors">Axis Bank</a></li>
                <li><a href="/banks/kotak" class="hover:text-white transition-colors">Kotak Mahindra Bank</a></li>
                <li><a href="/banks/pnb" class="hover:text-white transition-colors">Punjab National Bank</a></li>
              </ul>
            </div>

            <!-- Col 3: US & Global Banks -->
            <div>
              <div class="text-white font-bold text-sm mb-3">Global & US Banks</div>
              <ul class="space-y-2">
                <li><a href="/banks/chase" class="hover:text-white transition-colors">Chase Bank</a></li>
                <li><a href="/banks/bank-of-america" class="hover:text-white transition-colors">Bank of America</a></li>
                <li><a href="/banks/wells-fargo" class="hover:text-white transition-colors">Wells Fargo</a></li>
                <li><a href="/banks/citi" class="hover:text-white transition-colors">Citibank</a></li>
                <li><a href="/banks/barclays" class="hover:text-white transition-colors">Barclays Bank</a></li>
                <li><a href="/banks/hsbc" class="hover:text-white transition-colors">HSBC Global</a></li>
              </ul>
            </div>

            <!-- Col 4: Accounting Integrations -->
            <div>
              <div class="text-white font-bold text-sm mb-3">Accounting Software</div>
              <ul class="space-y-2">
                <li><a href="/bank-statement-to-quickbooks" class="hover:text-white transition-colors">QuickBooks (QBO/CSV)</a></li>
                <li><a href="/bank-statement-to-xero-csv" class="hover:text-white transition-colors">Xero CSV Import</a></li>
                <li><a href="/bank-statement-to-google-sheets" class="hover:text-white transition-colors">Google Sheets</a></li>
                <li><a href="/for-accountants-and-bookkeepers" class="hover:text-white transition-colors">For CPAs & Bookkeepers</a></li>
                <li><a href="/pricing" class="hover:text-white transition-colors">Pricing & Free Credits</a></li>
              </ul>
            </div>

            <!-- Col 5: Company & Guides -->
            <div>
              <div class="text-white font-bold text-sm mb-3">Company & Guides</div>
              <ul class="space-y-2">
                <li><a href="/blog/how-to-convert-bank-statement-pdf-to-excel" class="hover:text-white transition-colors">PDF to Excel Guide</a></li>
                <li><a href="/blog/is-it-safe-to-upload-bank-statement-online" class="hover:text-white transition-colors">Security & Safety Guide</a></li>
                <li><a href="/security" class="hover:text-white transition-colors">Security Architecture</a></li>
                <li><a href="/privacy" class="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" class="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/about" class="hover:text-white transition-colors">About Us</a></li>
                <li><a href="/contact" class="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>

          <div class="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              &copy; ${new Date().getFullYear()} ${BRAND_NAME} (${DOMAIN}). All rights reserved.
            </div>
            <div class="flex items-center gap-4">
              <span>Support: <a href="mailto:${SUPPORT_EMAIL}" class="text-sky-400 hover:underline">${SUPPORT_EMAIL}</a></span>
              <span>•</span>
              <a href="/security" class="hover:underline">In-Memory Zero Retention</a>
            </div>
          </div>
        </div>
      </footer>
    </div>

    <!-- Client-side React Application Hydration Script -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  return { html, status: 200 };
}

/**
 * Builds custom 404 HTML page
 */
export function render404Html(pathname: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Page Not Found (404) | ${BRAND_NAME}</title>
    <meta name="description" content="The requested page could not be found. Return to Bank Statement Converter homepage or explore our PDF to Excel and CSV conversion tools." />
    <meta name="robots" content="noindex, follow" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col items-center justify-center p-6 text-center font-sans">
    <div class="max-w-md p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
      <div class="text-5xl font-extrabold text-sky-600 mb-4">404</div>
      <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h1>
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
        The URL <code class="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-xs">${escapeHtml(pathname)}</code> could not be found. It may have been moved or renamed.
      </p>
      <div class="space-y-3">
        <a href="/" class="block w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-bold transition-colors">
          Return to Bank Statement Converter
        </a>
        <div class="grid grid-cols-2 gap-2 text-xs text-sky-600 dark:text-sky-400">
          <a href="/pdf-bank-statement-to-excel" class="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">PDF to Excel</a>
          <a href="/pdf-bank-statement-to-csv" class="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">PDF to CSV</a>
          <a href="/banks/sbi" class="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">SBI Statement</a>
          <a href="/banks/chase" class="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">Chase Statement</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

/**
 * Builds dynamic XML sitemap
 */
export function renderSitemapXml(): string {
  const urls: string[] = [];

  for (const page of Object.values(ALL_SEO_PAGES)) {
    const priority = page.urlPath === '/' ? '1.0' : page.category === 'tool' ? '0.9' : page.category === 'bank' ? '0.8' : '0.7';
    const changefreq = page.urlPath === '/' ? 'daily' : page.category === 'blog' ? 'monthly' : 'weekly';
    const lastmod = '2026-04-10';

    urls.push(`  <url>
    <loc>${DOMAIN}${page.urlPath}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}
