// Uploaders are stored by email address. Only show the part before the "@" in the UI.
export function displayName(author) {
  const name = (author || "").split("@")[0].trim();
  return name || "a student";
}

export function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}
