import type { NextRequest } from "next/server";
import { withApiHandler } from "@/lib/errors";
import { handleLogin } from "@/server/middleware/login-handler";

export const POST = withApiHandler((request: NextRequest) => handleLogin(request, { staffOnly: false }));
