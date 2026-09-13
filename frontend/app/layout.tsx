"use client";

import "./globals.css";
import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/lib/auth-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));

  return (
    <html lang="en">
      <head>
        <title>CloudDocs — Cloud-Native Document & Project Management</title>
        <meta name="description" content="DevOps-Driven Document & Project Management Platform" />
      </head>
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
