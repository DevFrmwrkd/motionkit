// Anonymous client id for feedback voting dedup.
// Stored in localStorage so the same browser gets one stable id.
// Signed-in users override this via their user id on the server.
const STORAGE_KEY = "motionkit_feedback_client_id";

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `anon-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
