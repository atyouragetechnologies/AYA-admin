import { executeVercelHandler } from "./vercel-polyfill";

// Import all legacy Vercel Serverless Functions from app/api
import checkAccess from "../app/api/check-access";
import createCashfreeOrder from "../app/api/create-cashfree-order";
import deleteAccount from "../app/api/delete-account";
import generateAnalysis from "../app/api/generate-analysis";
import pushSubscribe from "../app/api/push-subscribe";
import recommendStories from "../app/api/recommend-stories";
import recommendations from "../app/api/recommendations";
import sendNotifications from "../app/api/send-notifications";
import setUsername from "../app/api/set-username";
import subscribePush from "../app/api/subscribe-push";
import verifyCashfreeOrder from "../app/api/verify-cashfree-order";

const handlers: Record<string, Function> = {
  "/api/check-access": checkAccess,
  "/api/create-cashfree-order": createCashfreeOrder,
  "/api/delete-account": deleteAccount,
  "/api/generate-analysis": generateAnalysis,
  "/api/push-subscribe": pushSubscribe,
  "/api/recommend-stories": recommendStories,
  "/api/recommendations": recommendations,
  "/api/send-notifications": sendNotifications,
  "/api/set-username": setUsername,
  "/api/subscribe-push": subscribePush,
  "/api/verify-cashfree-order": verifyCashfreeOrder,
};

export async function handleApiRequest(request: Request, env: any): Promise<Response | null> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Find a matching handler
  const handler = handlers[pathname];
  if (handler) {
    // Execute using the Vercel Polyfill to convert standard Web Request/Response to Vercel syntax
    return await executeVercelHandler(handler, request, env);
  }

  return null; // Not an API request or not found
}
