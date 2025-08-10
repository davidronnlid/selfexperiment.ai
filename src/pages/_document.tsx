import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Modular Health" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Modular Health" />
        <meta
          name="description"
          content="Understand yourself better with AI - Track your health metrics and daily data points"
        />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#0a0a0a" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#ffd700" />

        {/* iPhone Specific */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Apple Touch Icons - use the exact PNG with cache-busting */}
        <link rel="apple-touch-icon" href="/modular-health-logo.png?v=mh1" />
        <link rel="apple-touch-icon" sizes="152x152" href="/modular-health-logo.png?v=mh1" />
        <link rel="apple-touch-icon" sizes="180x180" href="/modular-health-logo.png?v=mh1" />

        {/* Favicon - single PNG as requested (with cache-busting) */}
        <link rel="icon" type="image/png" href="/modular-health-logo.png?v=mh1" />

        {/* Note: Viewport meta tag moved to _app.tsx to avoid Next.js warning */}
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
