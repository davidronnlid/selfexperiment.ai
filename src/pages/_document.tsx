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

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />

        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="icon" href="/favicon.ico" />

        {/* Viewport for mobile optimization */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
