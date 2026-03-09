/**
 * Messaging facade
 *
 * Import from here throughout the app — never import the providers directly.
 * This lets us swap implementations without touching page code.
 *
 * Quick reference:
 *   sendbirdProvider  — in-app real-time chat (primary)
 *   twilioClient      — SMS / WhatsApp to external recipients (secondary)
 *
 * Both providers expose an isEnabled() check so callers can degrade
 * gracefully when credentials are not yet configured.
 */

export { sendbirdProvider } from "./sendbird";
export type { SendbirdMessage, SendbirdChannelParams } from "./sendbird";

export { twilioClient } from "./twilio";
export type { SMSPayload, WhatsAppPayload, TwilioResult } from "./twilio";
