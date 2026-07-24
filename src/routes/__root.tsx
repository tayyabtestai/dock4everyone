import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { installSessionOnlyAuth } from "../lib/session-only-auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-6">Error / 404</p>
        <h1 className="font-serif text-6xl text-ink">Not in the archive.</h1>
        <p className="mt-4 text-muted-foreground">
          The page you're looking for isn't here — or was never catalogued.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Back to Dock
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-6">Error</p>
        <h1 className="font-serif text-4xl text-ink">Something didn't load.</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Try again, or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-secondary"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dock — Free Resources, Better Learning" },
      { name: "description", content: "A quiet archive of curated PDFs, repositories, guides, and AI frameworks for the modern practitioner. No noise, just utility." },
      { name: "author", content: "Dock" },
      { property: "og:title", content: "Dock — Free Resources, Better Learning" },
      { property: "og:description", content: "A quiet archive of curated PDFs, repositories, guides, and AI frameworks for the modern practitioner. No noise, just utility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Dock — Free Resources, Better Learning" },
      { name: "twitter:description", content: "A quiet archive of curated PDFs, repositories, guides, and AI frameworks for the modern practitioner. No noise, just utility." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/145048d5-6074-4951-990c-0c41f54bf822" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/145048d5-6074-4951-990c-0c41f54bf822" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:ital@0;1&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    installSessionOnlyAuth();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster />
    </QueryClientProvider>
  );
}
