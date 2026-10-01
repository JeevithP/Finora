import React from "react";
import { AuthCardLayout } from "@/components/auth/auth-card-layout";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthCardLayout>{children}</AuthCardLayout>;
}

