// Shared data for the UI. The Supabase storage bucket name must match supabase/schema.sql.
export const BUCKET = "study-files";

export const subjects = ["All", "Mathematics", "Physical Sciences", "Life Sciences", "English", "Afrikaans", "History", "Geography", "Accounting", "Business Studies", "Economics", "CAT"];
export const grades = ["All Grades", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
export const types = ["All Types", "Notes", "Study Guide", "Exam Guidelines"];

export const subjectIcons = {
  "Mathematics": "➗",
  "Physical Sciences": "🧪",
  "Life Sciences": "🧬",
  "English": "📖",
  "Afrikaans": "📝",
  "History": "🏛️",
  "Geography": "🌍",
  "Accounting": "💼",
  "Business Studies": "📊",
  "Economics": "📈",
  "CAT": "💻",
};

// Apple system colors, one per subject. Used to tint each subject's icon tile.
export const subjectTones = {
  "Mathematics": "#007aff",
  "Physical Sciences": "#ff9500",
  "Life Sciences": "#34c759",
  "English": "#af52de",
  "Afrikaans": "#ff2d55",
  "History": "#a2845e",
  "Geography": "#30b0c7",
  "Accounting": "#5856d6",
  "Business Studies": "#ff3b30",
  "Economics": "#00c7be",
  "CAT": "#ffcc00",
};

// Which tag colour a resource type gets (see .tag--* in styles.css).
export function tagTone(type) {
  if (type === "Notes") return "blue";
  if (type === "Study Guide") return "green";
  if (type === "Exam Guidelines") return "orange";
  return "gray";
}
