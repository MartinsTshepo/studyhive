import {useState, useEffect, useRef } from "react";
import {v4 as uuidv4 } from "uuid";
import {supabase } from "./supabase";
import {useResponsive, getResponsivePadding } from "./hooks/useResponsive";
import {createColorScheme, createBorderStyle, getSystemDarkMode } from "./hooks/darkModeUtils";

const BUCKET = "study-files";


const subjects = ["All","Mathematics","Physical Sciences","Life Sciences","English","Afrikaans","History","Geography","Accounting","Business Studies","Economics","CAT"];
const grades = ["All Grades","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const types = ["All Types","Notes","Study Guide","Exam Guidelines"];
const subjectIcons = {"Mathematics":"∑","Physical Sciences":"⚗","Life Sciences":"🧬","English":"📖","Afrikaans":"📝","History":"🏛","Geography":"🌍","Accounting":"💼","Business Studies":"📊","Economics":"📈","CAT":"💻"};
const typeColors = {"Notes":{bg:"#dbeafe",color:"#1e40af"},"Study Guide":{bg:"#d1fae5",color:"#065f46"},"Exam Guidelines":{bg:"#fef3c7",color:"#92400e"}};

export default function App() {
  // Responsive design
  const { isMobile } = useResponsive();
  
  // Detect system dark mode preference
  const [dark, setDark] = useState(() => getSystemDarkMode());
  const [view, setView] = useState("home");
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [search, setSearch] = useState("");
  const [activeSubject, setActiveSubject] = useState("All");
  const [activeGrade, setActiveGrade] = useState("All Grades");
  const [activeType, setActiveType] = useState("All Types");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [form, setForm] = useState({ title:"", subject:"Mathematics", grade:"Grade 12", type:"Notes", author:"", description:"" });
  const [file, setFile] = useState(null);
  const fileRef = useRef();
  
  // Auth state
  const [user, setUser] = useState(null);
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [initialUploads, setInitialUploads] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [setupUploading, setSetupUploading] = useState(false);
  const [setupErr, setSetupErr] = useState("");
  const [setupProgress, setSetupProgress] = useState("");

  // Create color scheme based on dark mode
  const c = createColorScheme(dark);

  // Check user profile for initial setup completion
  const checkUserProfile = async (userId) => {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (!data) {
      // New user - create profile and flag for setup
      await supabase.from("user_profiles").insert([{ user_id: userId, initial_uploads_completed: false }]);
      setNeedsInitialSetup(true);
    } else {
      setNeedsInitialSetup(!data.initial_uploads_completed);
    }
  };

  // Load user bookmarks from database
  const loadBookmarks = async (userId) => {
    const { data } = await supabase
      .from("user_bookmarks")
      .select("resource_id")
      .eq("user_id", userId);
    if (data) setBookmarks((data || []).map(b => b.resource_id));
  };

  // Load resources from Supabase
  const loadResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("Load error:", error.message);
    setResources(data || []);
    setLoading(false);
  };

  // Check user session on mount
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        loadBookmarks(session.user.id);
        checkUserProfile(session.user.id);
      }
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadBookmarks(session.user.id);
        checkUserProfile(session.user.id);
        if (event === "SIGNED_IN") {
          setAuthModal(false);
          setAuthEmail("");
          setAuthPassword("");
        }
      } else {
        setUser(null);
        setBookmarks([]);
        setNeedsInitialSetup(false);
      }
    });

    return () => authListener?.subscription?.unsubscribe();
  }, []);

  // Listen for system dark mode preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => setDark(e.matches);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadResources(); }, []);

  const filtered = resources.filter(r => {
    const mS = activeSubject === "All" || r.subject === activeSubject;
    const mG = activeGrade === "All Grades" || r.grade === activeGrade;
    const mT = activeType === "All Types" || r.type === activeType;
    const mQ = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.subject?.toLowerCase().includes(search.toLowerCase());
    return mS && mG && mT && mQ;
  });

  const isBookmarked = id => bookmarks.includes(id);
  const toggleBookmark = async (id) => {
    if (!user) {
      setAuthModal(true);
      return;
    }
    const isBookmarked = bookmarks.includes(id);
    if (isBookmarked) {
      await supabase.from("user_bookmarks").delete().eq("user_id", user.id).eq("resource_id", id);
      setBookmarks(b => b.filter(x => x !== id));
    } else {
      await supabase.from("user_bookmarks").insert([{ user_id: user.id, resource_id: id }]);
      setBookmarks(b => [...b, id]);
    }
  };

  // Auth functions
  const handleAuth = async () => {
    setAuthErr("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        setAuthErr("Check your email to confirm signup!");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
        setUser(data.user);
        setAuthModal(false);
        setAuthEmail("");
        setAuthPassword("");
      }
    } catch (e) {
      setAuthErr(e.message);
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBookmarks([]);
    setView("home");
  };

  // Handle initial setup uploads
  const handleInitialSetupUpload = async (file) => {
    setSetupErr("");
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      setSetupErr("Only PDF files are allowed for initial setup.");
      return;
    }

    setSetupUploading(true);
    setSetupProgress(`Uploading PDF ${initialUploads.length + 1}/3...`);

    try {
      // Verify session is active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setSetupErr("Session expired. Please log in again.");
        setSetupUploading(false);
        return;
      }

      const ext = file.name.split(".").pop();
      const path = `setup/${session.user.id}/${uuidv4()}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });

      if (storageErr) {
        setSetupErr(`Upload failed: ${storageErr.message}`);
        setSetupUploading(false);
        setSetupProgress("");
        return;
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const newUpload = {
        subject: "Setup",
        grade: "All Grades",
        type: "Notes",
        title: file.name,
        author: session.user.email,
        description: "Initial setup resource",
        file_url: urlData.publicUrl,
        file_name: file.name,
        user_id: session.user.id,
        created_at: new Date().toISOString()
      };
      
      const { error: dbErr } = await supabase
        .from("resources")
        .insert([newUpload])
        .select();

      if (dbErr) {
        console.error("Setup DB Error Details:", dbErr);
        setSetupErr(`Save failed: ${dbErr.message}`);
        setSetupUploading(false);
        setSetupProgress("");
        return;
      }

      const updatedUploads = [...initialUploads, newUpload];
      setInitialUploads(updatedUploads);

      if (updatedUploads.length >= 3) {
        setSetupProgress("Setup complete! Redirecting...");
        await supabase.from("user_profiles").update({ initial_uploads_completed: true }).eq("user_id", session.user.id);
        setNeedsInitialSetup(false);
        setView("home");
      }
    } catch (e) {
      console.error("Setup Upload Exception:", e);
      setSetupErr(`Error: ${e.message}`);
    }
    setSetupUploading(false);
    setSetupProgress("");
  };

  const resetUpload = () => {
    setUploadOpen(false); setUploadDone(false); setFile(null);
    setUploadErr(""); setUploadProgress("");
    setForm({ title:"", subject:"Mathematics", grade:"Grade 12", type:"Notes", author: user?.email || "", description:"" });
  };

  const openUploadModal = () => {
    if (!user) {
      setAuthModal(true);
      return;
    }
    setForm({ title:"", subject:"Mathematics", grade:"Grade 12", type:"Notes", author: user.email, description:"" });
    setUploadOpen(true);
  };

  const handleUpload = async () => {
    setUploadErr("");
    if (!user) {
      setUploadErr("Please log in to share resources.");
      setAuthModal(true);
      return;
    }
    if (!form.title.trim()) {
      setUploadErr("Please fill in the title.");
      return;
    }
    setUploading(true);
    let file_url = null, file_name = null;

    try {
      // Verify session is active
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        setUploadErr("Session expired. Please log in again.");
        setUploading(false);
        setAuthModal(true);
        return;
      }

      if (file) {
        setUploadProgress("Uploading file...");
        const ext = file.name.split(".").pop();
        const path = `${session.user.id}/${uuidv4()}.${ext}`;

        const { error: storageErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: true });

        if (storageErr) {
          setUploadErr(`File upload failed: ${storageErr.message}`);
          setUploading(false); setUploadProgress(""); return;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
        file_url = urlData.publicUrl;
        file_name = file.name;
      }

      setUploadProgress("Saving resource...");
      const resourceData = {
        ...form,
        file_url,
        file_name,
        user_id: session.user.id,
        created_at: new Date().toISOString()
      };

      const { error: dbErr } = await supabase
        .from("resources")
        .insert([resourceData])
        .select();

      if (dbErr) {
        console.error("DB Error Details:", dbErr);
        setUploadErr(`Save failed: ${dbErr.message}`);
        setUploading(false); setUploadProgress(""); return;
      }

      setUploadDone(true);
      loadResources();
    } catch (e) {
      console.error("Upload Exception:", e);
      setUploadErr(`Unexpected error: ${e.message}`);
    }
    setUploading(false); setUploadProgress("");
  };

  // Shared styles
  const responsivePadding = getResponsivePadding(isMobile);
  const nav = { background: dark?"rgba(0,0,0,0.9)":"rgba(255,255,255,0.9)", backdropFilter:"blur(20px)", borderBottom: createBorderStyle(c.border, dark), padding:`0 ${responsivePadding}px`, display:"flex", alignItems:"center", justifyContent:"space-between", height: isMobile?48:56, position:"sticky", top:0, zIndex:100 };
  const navBtn = a => ({ background: a?(dark?"rgba(37,99,235,0.15)":"#eff6ff"):"transparent", border:"none", color: a?c.accent:c.muted, padding:"6px 14px", borderRadius:8, cursor:"pointer", fontSize: isMobile?12:14, fontWeight: a?600:400 });
  const iconBtn = { background:"transparent", border: createBorderStyle(c.border, dark), color:c.text, width:36, height:36, borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 };
  const pill = a => ({ padding:"6px 14px", borderRadius:20, border: createBorderStyle(a?c.accent:c.border, dark), background: a?c.accent:"transparent", color: a?"#fff":c.muted, cursor:"pointer", fontSize:13, fontWeight: a?600:400, whiteSpace:"nowrap" });
  const primaryBtn = { padding: isMobile?"8px 12px":"11px 22px", borderRadius:12, background:c.accent, color:"#fff", border:"none", cursor:"pointer", fontWeight:600, fontSize: isMobile?13:14 };
  const mobileMenuPanel = { position:"absolute", top:48, left:0, right:0, background: dark?"rgba(0,0,0,0.97)":"rgba(255,255,255,0.98)", backdropFilter:"blur(20px)", borderBottom: createBorderStyle(c.border, dark), display:"flex", flexDirection:"column", padding:"8px 16px 16px", gap:4, zIndex:99, boxShadow:"0 8px 24px rgba(0,0,0,0.15)" };
  const mobileMenuBtn = a => ({ background: a?(dark?"rgba(37,99,235,0.15)":"#eff6ff"):"transparent", border:"none", color: a?c.accent:c.text, padding:"12px 14px", borderRadius:10, cursor:"pointer", fontSize:15, fontWeight: a?600:400, textAlign:"left", width:"100%" });
  const inp = { width:"100%", padding:"10px 14px", borderRadius:10, border: createBorderStyle(c.border, dark), background:c.surface, color:c.text, fontSize: isMobile?13:14, outline:"none", boxSizing:"border-box", marginBottom:10 };
  const grid = { display:"grid", gridTemplateColumns: isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))", gap: isMobile?12:16 };
  const Card = ({ r }) => {
    const tc = typeColors[r.type] || { bg:"#f3f4f6", color:"#374151" };
    return (
      <div
        style={{ background:c.card, border: createBorderStyle(hoveredCard===r.id?c.accent:c.border, dark), borderRadius: isMobile?12:16, padding: isMobile?16:20, cursor:"pointer", transition:"all 0.18s", boxShadow: hoveredCard===r.id?(dark?c.glow:"0 4px 20px rgba(37,99,235,0.12)"):(dark?"none":"0 1px 4px rgba(0,0,0,0.05)") }}
        onMouseEnter={() => setHoveredCard(r.id)}
        onMouseLeave={() => setHoveredCard(null)}
        onClick={() => { setSelected(r); setView("viewer"); }}
      >
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:tc.bg, color:tc.color }}>{r.type}</span>
          <button style={{ background:"transparent", border:"none", cursor:"pointer", color: isBookmarked(r.id)?"#f59e0b":c.muted, fontSize:18, padding:0 }}
            onClick={e => { e.stopPropagation(); toggleBookmark(r.id); }}>
            {isBookmarked(r.id) ? "★" : "☆"}
          </button>
        </div>
        <div style={{ fontSize:14, fontWeight:600, margin:"8px 0 6px", lineHeight:1.4, color:c.text }}>{r.title}</div>
        <div style={{ fontSize:12, color:c.muted, marginBottom:8, lineHeight:1.5 }}>{(r.description||"No description.").substring(0,90)}...</div>
        <div style={{ fontSize:12, color:c.muted, display:"flex", gap:10 }}>
          <span>📚 {r.subject}</span><span>{r.grade}</span>
        </div>
        <div style={{ fontSize:11, color:c.muted, marginTop:5 }}>by {r.author}</div>
        {r.file_url && <div style={{ fontSize:11, color:c.accent, marginTop:4 }}>📎 File attached</div>}
      </div>
    );
  };

  // Viewer page
  if (view === "viewer" && selected) {
    return (
      <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", background:c.bg, minHeight:"100vh", color:c.text }}>
        <nav style={nav}>
          <div style={{ fontWeight:700, fontSize: isMobile?16:18, color:c.accent, cursor:"pointer" }} onClick={() => { setView("home"); setSelected(null); }}>⌬ StudyHive</div>
          <button style={iconBtn} onClick={() => setDark(d => !d)}>{dark ? "☀️" : "🌙"}</button>
        </nav>
        <div style={{ maxWidth:680, margin:"0 auto", padding: isMobile?16:28 }}>
          <button style={{ background:"transparent", border:"none", color:c.accent, cursor:"pointer", fontSize:14, fontWeight:500, marginBottom:16 }} onClick={() => { setView("browse"); setSelected(null); }}>← Back</button>
          <div style={{ background:c.card, border: createBorderStyle(c.border, dark), borderRadius: isMobile?16:20, overflow:"hidden", boxShadow: dark?c.glow:"0 4px 24px rgba(0,0,0,0.08)" }}>
            <div style={{ background: dark?"#0d1f4a":"#1e40af", padding: isMobile?"24px 20px 20px":"32px 32px 28px", color:"#fff" }}>
              <div style={{ fontSize:11, fontWeight:600, opacity:0.7, textTransform:"uppercase", letterSpacing:1 }}>{selected.type} · {selected.grade}</div>
              <div style={{ fontSize:22, fontWeight:700, margin:"8px 0 4px", lineHeight:1.3 }}>{selected.title}</div>
              <div style={{ fontSize:13, opacity:0.75 }}>by {selected.author} · {new Date(selected.created_at).toLocaleDateString("en-ZA")}</div>
            </div>
            <div style={{ padding:32 }}>
              <p style={{ fontSize:15, color:c.muted, lineHeight:1.7, marginBottom:24 }}>{selected.description || "No description provided."}</p>
              {selected.file_url ? (
                <div style={{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:14, overflow:"hidden" }}>
                  {/\.(jpg|jpeg|png|gif|webp)$/i.test(selected.file_url)
                    ? <img src={selected.file_url} alt={selected.title} style={{ width:"100%" }} />
                    : /\.pdf$/i.test(selected.file_url)
                    ? <iframe src={selected.file_url} style={{ width:"100%", height:600, border:"none" }} title={selected.title} />
                    : <div style={{ padding: isMobile?20:32, textAlign:"center" }}>
                        <div style={{ fontSize:40, marginBottom:8 }}>📄</div>
                        <div style={{ fontWeight:600, marginBottom:12 }}>{selected.file_name}</div>
                        <a href={selected.file_url} target="_blank" rel="noreferrer" style={{ ...primaryBtn, textDecoration:"none", display:"inline-block" }}>⬇ Download File</a>
                      </div>
                  }
                </div>
              ) : (
                <div style={{ background:c.surface, border: createBorderStyle(c.border, dark), borderRadius:14, padding: isMobile?20:32, textAlign:"center" }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>📄</div>
                  <div style={{ color:c.muted }}>No file attached to this resource.</div>
                </div>
              )}
              <div style={{ display:"flex", gap:12, marginTop:24 }}>
                <button style={{ ...primaryBtn, background: isBookmarked(selected.id)?"#f59e0b":c.accent, flex:1 }} onClick={() => toggleBookmark(selected.id)}>
                  {isBookmarked(selected.id) ? "★ Bookmarked" : "☆ Bookmark"}
                </button>
                {selected.file_url && (
                  <a href={selected.file_url} target="_blank" rel="noreferrer"
                    style={{ ...primaryBtn, background:"transparent", border: createBorderStyle(c.border, dark), color:c.text, textDecoration:"none", flex:1, textAlign:"center" }}>
                    ⬇ Download
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif", background:c.bg, minHeight:"100vh", color:c.text }}>

      {/* Initial Setup Page */}
      {needsInitialSetup && user ? (
        <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:c.bg }}>
          <nav style={nav}>
            <div style={{ fontWeight:700, fontSize:18, color:c.accent }}>StudyHive</div>
            <button style={iconBtn} onClick={() => setDark(d => !d)}>{dark ? "☀️" : "🌙"}</button>
          </nav>
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
            <div style={{ maxWidth:520, textAlign:"center" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>📚</div>
              <div style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>Welcome to StudyHive!⌬</div>
              <p style={{ fontSize:15, color:c.muted, marginBottom:28, lineHeight:1.6 }}>To get started and share knowledge with other SA students, please upload <strong>3 PDF resources</strong>. These can be notes, study guides, or exam guidelines.</p>
              
              <div style={{ background:c.card, border: createBorderStyle(c.border, dark), borderRadius:16, padding: isMobile?20:32, marginBottom:24 }}>
                <div style={{ display:"flex", gap:16, marginBottom:20 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} style={{ flex:1, padding:12, borderRadius:12, background: i <= initialUploads.length ? "#10b981" : c.surface, color: i <= initialUploads.length ? "#fff" : c.muted, fontWeight:600, fontSize:14 }}>
                      {i <= initialUploads.length ? "✓" : i}
                    </div>
                  ))}
                </div>
                <div style={{ textAlign:"left", marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:c.muted, marginBottom:8 }}>Upload Type:</div>
                  <select style={{ ...inp, marginBottom:0 }} value={form.type} onChange={e => setForm(f => ({ ...f, type:e.target.value }))}>
                    <option>Notes</option>
                    <option>Textbook</option>
                    <option>Study Guide</option>
                    <option>Exam Guidelines</option>
                    <option>ATP</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:c.muted, marginBottom:8 }}>PDF Upload:</div>
                  <input 
                    ref={fileRef} 
                    type="file" 
                    accept=".pdf" 
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        handleInitialSetupUpload(e.target.files[0]);
                        e.target.value = "";
                      }
                    }}
                    style={{ display:"none" }}
                  />
                  <div
                    style={{ border: createBorderStyle(c.border, dark, 2), borderStyle:"dashed", borderRadius:12, padding: isMobile?"24px":"32px", textAlign:"center", color:c.muted, fontSize:13, cursor:"pointer", background:c.surface }}
                    onClick={() => fileRef.current?.click()}
                  >
                    <div style={{ fontSize:28, marginBottom:8 }}>📄</div>
                    <div style={{ fontWeight:600, marginBottom:4 }}>Click to upload PDF</div>
                    <div style={{ fontSize:11 }}>Only PDF files allowed</div>
                  </div>
                </div>
                {setupErr && <div style={{ color:"#dc2626", fontSize:13, marginTop:12, padding:"8px 12px", background:"#fef2f2", borderRadius:8 }}>{setupErr}</div>}
                {setupProgress && <div style={{ color:c.accent, fontSize:13, marginTop:12, textAlign:"center", fontWeight:600 }}>{setupProgress}</div>}
              </div>

              {initialUploads.length > 0 && (
                <div style={{ textAlign:"left", marginBottom:24 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:c.muted, marginBottom:8 }}>Uploaded ({initialUploads.length}/3):</div>
                  {initialUploads.map((upload, idx) => (
                    <div key={idx} style={{ padding:10, background:c.surface, borderRadius:8, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:c.text }}>📄 {upload.file_name}</div>
                        <div style={{ fontSize:11, color:c.muted, marginTop:2 }}>{upload.type}</div>
                      </div>
                      <div style={{ fontSize:16 }}>✓</div>
                    </div>
                  ))}
                </div>
              )}

              {initialUploads.length === 3 && (
                <div style={{ textAlign:"center", padding:20, background:"#f0fdf4", borderRadius:12, border:"1px solid #bbf7d0", color:"#065f46" }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🎉</div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>All set!</div>
                  <div style={{ fontSize:13 }}>You're ready to explore StudyHive. Welcome aboard! ⌬</div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : !user ? (
        // Not logged in - show home page
        <></>
      ) : (
        // Logged in with setup complete - show normal app
        <></>
      )}

      {/* Normal App (only shown when not in setup) */}
      {!needsInitialSetup && (
      <>
      {uploadOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(8px)" }}>
          <div style={{ background:c.card, border:`1px solid ${c.border}`, borderRadius:20, padding:32, width:"92%", maxWidth:440, maxHeight:"90vh", overflowY:"auto", boxShadow: dark?c.glow:"0 8px 40px rgba(0,0,0,0.15)" }}>
            {uploadDone ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🎉</div>
                <div style={{ fontWeight:700, fontSize:22, marginBottom:8 }}>Shared successfully!</div>
                <div style={{ color:c.muted, fontSize:14, marginBottom:24 }}>Your resource is now live on StudyHive. Thank you for contributing!⌬</div>
                <button style={{ ...primaryBtn, width:"100%" }} onClick={resetUpload}>Done</button>
              </div>
            ) : (
              <>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                  <div style={{ fontWeight:700, fontSize:18 }}>Share a Resource</div>
                  <button style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:22, color:c.muted }} onClick={resetUpload}>✕</button>
                </div>
                <input id="resourceTitle" name="resourceTitle" style={inp} placeholder="Resource title *" value={form.title} onChange={e => setForm(f => ({ ...f, title:e.target.value }))} />
                <div style={{ fontSize:13, color:c.muted, marginBottom:10, padding:"8px 12px", background:c.surface, borderRadius:8 }}>👤 Sharing as: <strong>{user?.email}</strong></div>
                <textarea id="resourceDescription" name="resourceDescription" style={{ ...inp, height:80, resize:"none" }} placeholder="Short description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} />
                <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                  <select id="resourceSubject" name="resourceSubject" style={{ ...inp, marginBottom:0, flex:1 }} value={form.subject} onChange={e => setForm(f => ({ ...f, subject:e.target.value }))}>
                    {subjects.filter(s => s !== "All").map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select id="resourceGrade" name="resourceGrade" style={{ ...inp, marginBottom:0, flex:1 }} value={form.grade} onChange={e => setForm(f => ({ ...f, grade:e.target.value }))}>
                    {grades.filter(g => g !== "All Grades").map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <select style={inp} value={form.type} onChange={e => setForm(f => ({ ...f, type:e.target.value }))}>
                  {types.filter(t => t !== "All Types").map(t => <option key={t}>{t}</option>)}
                </select>
                <div
                  style={{ border: createBorderStyle(file?c.accent:c.border, dark, 2), borderStyle:"dashed", borderRadius:12, padding: isMobile?"16px":"20px", textAlign:"center", color: file?c.accent:c.muted, fontSize:13, marginBottom:14, cursor:"pointer", background: file?c.accentBg:c.surface }}
                  onClick={() => fileRef.current.click()}
                >
                  {file
                    ? <>📎 {file.name} ({(file.size/1024/1024).toFixed(1)}MB)</>
                    : <><div style={{ fontSize:28, marginBottom:4 }}>📂</div>Tap to attach a file<br /><span style={{ fontSize:11 }}>PDF, Word, Image — max 50MB</span></>
                  }
                  <input ref={fileRef} type="file" style={{ display:"none" }} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx" onChange={e => setFile(e.target.files[0] || null)} />
                </div>
                {uploadErr && <div style={{ color:"#dc2626", fontSize:13, marginBottom:10, padding:"8px 12px", background:"#fef2f2", borderRadius:8 }}>{uploadErr}</div>}
                {uploadProgress && <div style={{ color:c.accent, fontSize:13, marginBottom:10, textAlign:"center" }}>{uploadProgress}</div>}
                <button style={{ ...primaryBtn, width:"100%", opacity: uploading?0.7:1, cursor: uploading?"not-allowed":"pointer" }} onClick={handleUpload} disabled={uploading}>
                  {uploading ? `${uploadProgress} ⏳` : "Share with StudyHive ⌬"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

     {/* Nav */}
      <nav style={{ ...nav, position:"sticky" }}>
        <div style={{ fontWeight:700, fontSize:18, color:c.accent, cursor:"pointer" }} onClick={() => { setView("home"); setMobileMenuOpen(false); }}>⌬ StudyHive</div>

        {isMobile ? (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button style={iconBtn} onClick={() => setDark(d => !d)}>{dark ? "☀️" : "🌙"}</button>
            <button style={iconBtn} onClick={() => setMobileMenuOpen(o => !o)} aria-label="Menu">{mobileMenuOpen ? "✕" : "☰"}</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", gap:4 }}>
              <button style={navBtn(view==="home")} onClick={() => setView("home")}>Home</button>
              <button style={navBtn(view==="browse")} onClick={() => setView("browse")}>Browse</button>
              <button style={navBtn(view==="library")} onClick={() => setView("library")}>Library{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}</button>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {user ? (
                <>
                  <div style={{ fontSize:13, color:c.muted }}>👤 {user.email.split("@")[0]}</div>
                  <button style={{ ...primaryBtn, padding:"7px 16px", fontSize:13, borderRadius:10 }} onClick={openUploadModal}>+ Share</button>
                  <button style={{ ...primaryBtn, padding:"7px 16px", fontSize:13, borderRadius:10, background:"#ef4444" }} onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <>
                  <button style={{ ...primaryBtn, padding:"7px 16px", fontSize:13, borderRadius:10 }} onClick={() => { setAuthMode("login"); setAuthModal(true); }}>Login</button>
                  <button style={{ ...primaryBtn, padding:"7px 16px", fontSize:13, borderRadius:10, background:"#10b981" }} onClick={() => { setAuthMode("signup"); setAuthModal(true); }}>Sign Up</button>
                </>
              )}
              <button style={iconBtn} onClick={() => setDark(d => !d)}>{dark ? "☀️" : "🌙"}</button>
            </div>
          </>
        )}

        {isMobile && mobileMenuOpen && (
          <div style={mobileMenuPanel}>
            <button style={mobileMenuBtn(view==="home")} onClick={() => { setView("home"); setMobileMenuOpen(false); }}>Home</button>
            <button style={mobileMenuBtn(view==="browse")} onClick={() => { setView("browse"); setMobileMenuOpen(false); }}>Browse</button>
            <button style={mobileMenuBtn(view==="library")} onClick={() => { setView("library"); setMobileMenuOpen(false); }}>Library{bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}</button>
            <div style={{ height:1, background:c.border, margin:"8px 0" }} />
            {user ? (
              <>
                <div style={{ fontSize:13, color:c.muted, padding:"6px 14px" }}>👤 {user.email.split("@")[0]}</div>
                <button style={{ ...primaryBtn, width:"100%", textAlign:"center" }} onClick={() => { openUploadModal(); setMobileMenuOpen(false); }}>+ Share</button>
                <button style={{ ...primaryBtn, width:"100%", textAlign:"center", background:"#ef4444", marginTop:8 }} onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Logout</button>
              </>
            ) : (
              <>
                <button style={{ ...primaryBtn, width:"100%", textAlign:"center" }} onClick={() => { setAuthMode("login"); setAuthModal(true); setMobileMenuOpen(false); }}>Login</button>
                <button style={{ ...primaryBtn, width:"100%", textAlign:"center", background:"#10b981", marginTop:8 }} onClick={() => { setAuthMode("signup"); setAuthModal(true); setMobileMenuOpen(false); }}>Sign Up</button>
              </>
            )}
          </div>
        )}
      </nav>

      {/* Auth Modal */}
      {authModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, backdropFilter:"blur(8px)", padding: isMobile?12:0 }}>
          <div style={{ background:c.card, border: createBorderStyle(c.border, dark), borderRadius:20, padding: isMobile?24:32, width:"100%", maxWidth:420, boxShadow: dark?c.glow:"0 8px 40px rgba(0,0,0,0.15)", position:"relative", display:"flex", flexDirection:"column", gap:12 }}>
            <div style={{ fontWeight:700, fontSize: isMobile?18:20, marginBottom:8 }}>{authMode === "login" ? "Login" : "Sign Up"}</div>
            <input id="authEmail" name="email" autoComplete="email" style={{...inp, marginBottom:0 }} placeholder="Email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} type="email" />
            <input id="authPassword" name="password" autoComplete="current-password" style={{...inp, marginBottom:0 }} placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} type="password" />
            {authErr && <div style={{ color: authErr.includes("Check your email") ? "#10b981" : "#dc2626", fontSize:13, padding:"10px 12px", background: authErr.includes("Check your email") ? "#f0fdf4" : "#fef2f2", borderRadius:8, textAlign:"center" }}>{authErr}</div>}
            <button style={{ ...primaryBtn, width:"100%", marginTop:4, opacity: authLoading?0.7:1, cursor: authLoading?"not-allowed":"pointer" }} onClick={handleAuth} disabled={authLoading}>
              {authLoading ? "Loading..." : authMode === "login" ? "Login" : "Sign Up"}
            </button>
            <button style={{ ...primaryBtn, width:"100%", background:"transparent", border: createBorderStyle(c.border, dark), color:c.text }} onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthErr(""); }}>
              {authMode === "login" ? "Need an account? Sign Up" : "Already have an account? Login"}
            </button>
            <button style={{ background:"transparent", border:"none", cursor:"pointer", fontSize:22, color:c.muted, position:"absolute", top:12, right:12 }} onClick={() => { setAuthModal(false); setAuthErr(""); }}>✕</button>
          </div>
        </div>
      )}

      {/* Home */}
      {view === "home" && (
        <>
          <div style={{ padding:"52px 24px 32px", textAlign:"center" }}>
            <div style={{ fontSize:40, fontWeight:700, letterSpacing:"-1px",}}>StudyHive ⌬</div>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:2, color:c.accent, textTransform:"uppercase", marginBottom:12 }}>Beta 02 · Live</div>
            <p style={{ fontSize:16, color:c.muted, marginBottom:28, maxWidth:480, margin:"0 auto 28px" }}>Free study notes, guides & exam resources — shared by SA students, for SA students.</p>
            <div style={{ maxWidth:520, margin:"0 auto", position:"relative" }}>
              <input
                id="searchHome"
                name="search"
                style={{ width:"100%", padding:"14px 48px 14px 20px", borderRadius:16, border:`1.5px solid ${c.border}`, background:c.card, color:c.text, fontSize:15, outline:"none", boxSizing:"border-box", boxShadow: dark?c.glow:"0 2px 12px rgba(0,0,0,0.07)" }}
                placeholder="Search notes, study guides, subjects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setView("browse")}
              />
              <span style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", color:c.muted, fontSize:18 }}>🔍</span>
            </div>
            {search && <button style={{ ...primaryBtn, marginTop:14, fontSize:13, borderRadius:10, padding:"8px 22px" }} onClick={() => setView("browse")}>Search →</button>}
          </div>

          <div style={{ padding:"0 24px 28px" }}>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:14 }}>Browse by subject</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12, maxWidth:"100%" }}>
              {subjects.filter(s => s !== "All").map(sub => (
                <div key={sub}
                  style={{ background: activeSubject===sub?c.accentBg:c.surface, border:`1px solid ${activeSubject===sub?c.accent:c.border}`, borderRadius:14, padding:"16px 12px", textAlign:"center", cursor:"pointer", transition:"all 0.15s", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}
                  onClick={() => { setActiveSubject(sub); setView("browse"); }}>
                  <div style={{ fontSize:28, marginBottom:6 }}>{subjectIcons[sub] || "📚"}</div>
                  <div style={{ fontSize:12, fontWeight:500, color:c.text, lineHeight:"1.3" }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding:"0 24px 40px" }}>
            <div style={{ fontSize:18, fontWeight:600, marginBottom:14 }}>
              {loading ? "Loading..." : resources.length === 0 ? "Be the first to share! ⌬" : "🔥 Recently shared"}
            </div>
            {loading ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:c.muted }}>
                <div style={{ fontSize:36, marginBottom:10 }}>⏳</div>Loading from StudyHive...
              </div>
            ) : resources.length === 0 ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:c.muted }}>
                <div style={{ fontSize:44, marginBottom:10 }}>📭</div>
                <div style={{ fontWeight:600, marginBottom:6 }}>No resources yet</div>
                <div style={{ fontSize:13, marginBottom:18 }}>Be the first SA student to share study material!</div>
                <button style={{ ...primaryBtn, borderRadius:12 }} onClick={openUploadModal}>+ Share a resource</button>
              </div>
            ) : (
              <div style={grid}>{resources.slice(0,4).map(r => <Card key={r.id} r={r} />)}</div>
            )}
          </div>
        </>
      )}

      {/* Browse */}
      {view === "browse" && (
        <>
          <div style={{ padding: isMobile?"20px 16px 0":"24px 24px 0" }}>
            <div style={{ position:"relative" }}>
              <input id="searchBrowse" name="search" style={{ width:"100%", padding:"13px 44px 13px 18px", borderRadius:14, border: createBorderStyle(c.border, dark, 1.5), background:c.card, color:c.text, fontSize:14, outline:"none", boxSizing:"border-box" }} placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} />
              <span style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:c.muted }}>🔍</span>
            </div>
          </div>
          <div style={{ padding: isMobile?"12px 16px 8px":"16px 24px 8px" }}>
            {[["Grade", grades, activeGrade, setActiveGrade], ["Subject", subjects, activeSubject, setActiveSubject], ["Type", types, activeType, setActiveType]].map(([label, opts, active, setter]) => (
              <div key={label} style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:c.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>{label}</div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {opts.map(o => <button key={o} style={pill(active === o)} onClick={() => setter(o)}>{o}</button>)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: isMobile?"0 16px 40px":"0 24px 40px" }}>
            <div style={{ fontSize:13, color:c.muted, marginBottom:14 }}>{filtered.length} resource{filtered.length !== 1 ? "s" : ""} found</div>
            {loading
              ? <div style={{ textAlign:"center", padding:"40px 0", color:c.muted }}>⏳ Loading...</div>
              : filtered.length === 0
              ? <div style={{ textAlign:"center", padding:"48px 0", color:c.muted }}>
                  <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
                  <div style={{ fontWeight:600 }}>No resources found</div>
                  <div style={{ fontSize:13, marginTop:4, marginBottom:16 }}>Be the first to share this!</div>
                  <button style={{ ...primaryBtn, borderRadius:12 }} onClick={openUploadModal}>+ Share a resource</button>
                </div>
              : <div style={grid}>{filtered.map(r => <Card key={r.id} r={r} />)}</div>
            }
          </div>
        </>
      )}

      {/* Library */}
      {view === "library" && (
        <div style={{ padding:"28px 24px" }}>
          <div style={{ fontSize:18, fontWeight:600, marginBottom:18 }}>⭐ My Library</div>
          {bookmarks.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:c.muted }}>
              <div style={{ fontSize:44, marginBottom:10 }}>📚</div>
              <div style={{ fontWeight:600 }}>No bookmarks yet</div>
              <div style={{ fontSize:13, marginTop:4, marginBottom:18 }}>Star resources to save them here.</div>
              <button style={{ ...primaryBtn, borderRadius:12 }} onClick={() => setView("browse")}>Browse resources</button>
            </div>
          ) : (
            <div style={grid}>{resources.filter(r => bookmarks.includes(r.id)).map(r => <Card key={r.id} r={r} />)}</div>
          )}
        </div>
      )}

      <div style={{ textAlign:"center", padding:"24px", borderTop:`1px solid ${c.border}`, color:c.muted, fontSize:12 }}>
        StudyHive Beta 02 · Built for South African students · Free forever ⌬
      </div>
      </>
      )}
    </div>
  );
}
