import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100 font-sans">
      <div className="max-w-md text-center border border-slate-800 bg-slate-950 p-8 rounded-xl shadow-2xl">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-900 text-slate-300 rounded-full mb-4 border border-slate-800 font-mono text-lg font-bold">
          404
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">Page Not Found</h1>
        <p className="mt-2 text-xs text-slate-400">
          The requested page or domain resource is unavailable in this environment.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Return to CV-TRUST Workspace
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("CV-TRUST Exception:", error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100 font-sans">
      <div className="max-w-md text-center border border-red-900/50 bg-slate-950 p-8 rounded-xl shadow-2xl">
        <h1 className="text-lg font-semibold tracking-tight text-red-400">
          Application Exception
        </h1>
        <p className="mt-2 text-xs text-slate-400">
          An unexpected error occurred in the execution context.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Retry
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-800"
          >
            Home
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
      { title: "CV-TRUST | Computer Vision Integrity Assurance Workspace" },
      { name: "description", content: "Trustworthy Computer Vision Integrity Assurance for Data, Models and Inference Outputs in Multi-Contributor Pipelines (PS 26228)." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased">{children}</div>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
