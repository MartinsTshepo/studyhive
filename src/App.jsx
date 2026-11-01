import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";
import { useTheme } from "./hooks/useTheme";
import Icon, { Logo } from "./components/Icon";
import Sheet from "./components/Sheet";
import SearchField from "./components/SearchField";
import ResourceCard from "./components/ResourceCard";
import { BUCKET, subjects, grades, types, subjectIcons, subjectTones, tagTone } from "./constants";
import { displayName, formatDate } from "./utils";

const ACCEPTED_FILES = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.ppt,.pptx";
const blankForm = (author = "") => ({ title: "", subject: "Mathematics", grade: "Grade 12", type: "Notes", author, description: "" });

export default function App() {
  const { dark, toggle: toggleTheme } = useTheme();

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
  const [form, setForm] = useState(blankForm());
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);
  const [initialUploads, setInitialUploads] = useState([]);
  const [setupUploading, setSetupUploading] = useState(false);
  const [setupErr, setSetupErr] = useState("");
  const [setupProgress, setSetupProgress] = useState("");

  // ---------- Supabase: profile, bookmarks, resources ----------

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadResources(); }, []);

  // ---------- Navigation (keeps the phone's Back gesture inside the app) ----------

  const resourcesRef = useRef([]);
  useEffect(() => { resourcesRef.current = resources; }, [resources]);

  useEffect(() => {
    window.history.replaceState({ view: "home", id: null }, "");
    const onPopState = (e) => {
      const s = e.state ?? { view: "home", id: null };
      const resource = s.id ? resourcesRef.current.find((r) => r.id === s.id) ?? null : null;
      if (s.view === "viewer" && !resource) {
        setView("browse");
        setSelected(null);
      } else {
        setView(s.view);
        setSelected(resource);
      }
      window.scrollTo(0, 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (nextView, resource = null) => {
    if (nextView === view && !resource) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setView(nextView);
    setSelected(resource);
    window.history.pushState({ view: nextView, id: resource?.id ?? null }, "");
    window.scrollTo(0, 0);
  };

  // ---------- Filtering and bookmarks ----------

  const filtered = resources.filter(r => {
    const mS = activeSubject === "All" || r.subject === activeSubject;
    const mG = activeGrade === "All Grades" || r.grade === activeGrade;
    const mT = activeType === "All Types" || r.type === activeType;
    const mQ = !search || r.title?.toLowerCase().includes(search.toLowerCase()) || r.subject?.toLowerCase().includes(search.toLowerCase());
    return mS && mG && mT && mQ;
  });

  const hasFilters = activeSubject !== "All" || activeGrade !== "All Grades" || activeType !== "All Types" || !!search;
  const resetFilters = () => {
    setActiveSubject("All");
    setActiveGrade("All Grades");
    setActiveType("All Types");
    setSearch("");
  };

  const isBookmarked = id => bookmarks.includes(id);
  const toggleBookmark = async (id) => {
    if (!user) {
      setAuthModal(true);
      return;
    }
    // Update the star straight away so it feels instant on a slow connection, then undo it if Supabase says no.
    const wasBookmarked = bookmarks.includes(id);
    setBookmarks(b => wasBookmarked ? b.filter(x => x !== id) : [...b, id]);
    const { error } = wasBookmarked
      ? await supabase.from("user_bookmarks").delete().eq("user_id", user.id).eq("resource_id", id)
      : await supabase.from("user_bookmarks").insert([{ user_id: user.id, resource_id: id }]);
    if (error) {
      console.error("Bookmark error:", error.message);
      setBookmarks(b => wasBookmarked ? (b.includes(id) ? b : [...b, id]) : b.filter(x => x !== id));
    }
  };

  // ---------- Auth ----------

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthErr("");
    setAuthModal(true);
  };

  const handleAuth = async () => {
    setAuthErr("");
    setAuthLoading(true);
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          // Send the confirmation link back to wherever the site is hosted (GitHub Pages path included).
          options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        });
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
    setSelected(null);
    setView("home");
  };

  const openAccount = () => {
    if (user) setAccountOpen(true);
    else openAuth("login");
  };

  // ---------- Uploads ----------

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
        loadResources();
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
    setForm(blankForm(user?.email || ""));
  };

  const openUploadModal = () => {
    if (!user) {
      openAuth("login");
      return;
    }
    setForm(blankForm(user.email));
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

  // ---------- Pieces of UI ----------

  const setupMode = needsInitialSetup && !!user;
  const initial = user?.email?.[0] ?? "?";

  const tabs = [
    { id: "home", label: "Home", icon: "home" },
    { id: "browse", label: "Browse", icon: "grid" },
    { id: "library", label: "Library", icon: "star", count: bookmarks.length },
  ];
  const activeTab = tabs.findIndex(t => t.id === view);

  // One filter: a scrolling row of pills on phones, a sidebar list (Subject) or pill row (Grade, Type) on desktop.
  const renderFilter = (label, opts, active, setter, className = "") => (
    <div className={`filter-group ${className}`.trim()}>
      <h2 className="filter-group__title">{label}</h2>
      <div className="filter-group__options" role="group" aria-label={label}>
        {opts.map(o => (
          <button key={o} type="button" className="chip" aria-pressed={active === o} onClick={() => setter(o)}>
            <span>{o}</span>
            <Icon name="check" size={16} strokeWidth={2.6} className="chip__check" />
          </button>
        ))}
      </div>
    </div>
  );

  const openCard = (r) => navigate("viewer", r);
  const renderCard = (r) => (
    <ResourceCard key={r.id} resource={r} bookmarked={isBookmarked(r.id)} onOpen={openCard} onToggleBookmark={toggleBookmark} />
  );
  const skeletons = (
    <div className="cards" aria-busy="true" aria-label="Loading resources">
      {[0, 1, 2].map(i => <div key={i} className="card card--skeleton" aria-hidden="true" />)}
    </div>
  );

  const toolbar = (
    <header className="toolbar">
      <div className="toolbar__inner">
        <button type="button" className="brand" onClick={() => !setupMode && navigate("home")} aria-label="StudyHive home">
          <Logo size={28} />
          <span>StudyHive</span>
        </button>

        {!setupMode && (
          <nav className="toolbar__nav segmented" aria-label="Sections" data-idle={activeTab < 0} style={{ "--i": Math.max(activeTab, 0), "--n": tabs.length }}>
            <span className="segmented__thumb" aria-hidden="true" />
            {tabs.map(t => (
              <button key={t.id} type="button" className="segmented__item" aria-current={view === t.id ? "page" : undefined} onClick={() => navigate(t.id)}>
                {t.label}
                {t.count > 0 && <span className="segmented__count">{t.count}</span>}
              </button>
            ))}
          </nav>
        )}

        <div className="toolbar__actions">
          {!setupMode && (
            <button type="button" className="toolbar__plus" aria-label="Share a resource" onClick={openUploadModal}>
              <Icon name="plus" size={20} strokeWidth={2.4} />
            </button>
          )}
          {!setupMode && user && (
            <button type="button" className="btn btn--primary btn--sm toolbar__share" onClick={openUploadModal}>
              <Icon name="plus" size={16} strokeWidth={2.6} />
              Share
            </button>
          )}
          {!setupMode && !user && (
            <>
              <button type="button" className="btn btn--plain btn--sm toolbar__login" onClick={() => openAuth("login")}>Log in</button>
              <button type="button" className="btn btn--primary btn--sm toolbar__signup" onClick={() => openAuth("signup")}>Sign up</button>
            </>
          )}
          {!setupMode && user && (
            <button type="button" className="avatar toolbar__avatar" aria-label="Account" onClick={openAccount}>{initial}</button>
          )}
          {setupMode && (
            <button type="button" className="btn btn--plain btn--sm" onClick={handleLogout}>Log out</button>
          )}
          <button type="button" className="icon-btn" aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme}>
            <Icon name={dark ? "sun" : "moon"} size={20} />
          </button>
        </div>
      </div>
    </header>
  );

  // ---------- First login: upload three PDFs ----------

  if (setupMode) {
    return (
      <div className="app">
        {toolbar}
        <main className="main">
          <div className="setup">
            <h1 className="setup__title">Welcome to StudyHive</h1>
            <p className="setup__lede">To start sharing knowledge with other SA students, upload 3 PDF resources. Notes, study guides and exam guidelines all work.</p>

            <div className="setup__card">
              <div className="setup__steps" role="img" aria-label={`${initialUploads.length} of 3 uploaded`}>
                {[1, 2, 3].map(i => (
                  <div key={i} className="setup__step" data-done={i <= initialUploads.length}>
                    {i <= initialUploads.length ? <Icon name="check" size={20} strokeWidth={2.6} /> : i}
                  </div>
                ))}
              </div>

              <div>
                <label className="form__label" htmlFor="setupType">Resource type</label>
                <select id="setupType" className="field" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option>Notes</option>
                  <option>Textbook</option>
                  <option>Study Guide</option>
                  <option>Exam Guidelines</option>
                  <option>ATP</option>
                </select>
              </div>

              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  className="visually-hidden"
                  tabIndex={-1}
                  onChange={e => {
                    if (e.target.files?.[0]) {
                      handleInitialSetupUpload(e.target.files[0]);
                      e.target.value = "";
                    }
                  }}
                />
                <button type="button" className="dropzone" disabled={setupUploading} onClick={() => fileRef.current?.click()}>
                  <Icon name="file" size={28} />
                  <strong>Choose a PDF</strong>
                  <small>Only PDF files are allowed</small>
                </button>
              </div>

              {setupErr && <div className="notice notice--error" role="alert">{setupErr}</div>}
              {setupProgress && <div className="notice notice--info" role="status">{setupProgress}</div>}

              {initialUploads.length > 0 && (
                <ul className="setup__list" aria-label="Uploaded files">
                  {initialUploads.map((upload, idx) => (
                    <li key={idx}>
                      <span>{upload.file_name}</span>
                      <Icon name="check" size={18} strokeWidth={2.6} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------- The app ----------

  return (
    <div className="app">
      {toolbar}

      <main className="main">
        {/* Home */}
        {view === "home" && (
          <div className="page">
            <section className="hero">
              <h1 className="hero__title">StudyHive</h1>
              <p className="hero__sub">Free study notes, guides and exam resources, shared by SA students for SA students.</p>
              <SearchField id="searchHome" value={search} onChange={setSearch} onSubmit={() => navigate("browse")} placeholder="Search notes and guides" />
            </section>

            <section className="section" aria-labelledby="home-subjects">
              <div className="section__head">
                <h2 id="home-subjects" className="section__title">Subjects</h2>
              </div>
              <div className="subjects">
                {subjects.filter(s => s !== "All").map(sub => (
                  <button
                    key={sub}
                    type="button"
                    className="subject"
                    style={{ "--tone": subjectTones[sub] }}
                    onClick={() => { setActiveSubject(sub); navigate("browse"); }}
                  >
                    <span className="subject__icon" aria-hidden="true">{subjectIcons[sub] || "📚"}</span>
                    <span className="subject__name">{sub}</span>
                    <Icon name="chevronRight" size={18} className="subject__chev" />
                  </button>
                ))}
              </div>
            </section>

            <section className="section" aria-labelledby="home-recent">
              <div className="section__head">
                <h2 id="home-recent" className="section__title">Recently shared</h2>
                {resources.length > 0 && <button type="button" className="link-btn" onClick={() => navigate("browse")}>See all</button>}
              </div>
              {loading ? skeletons : resources.length === 0 ? (
                <div className="empty">
                  <div className="empty__icon"><Icon name="file" size={30} /></div>
                  <h3 className="empty__title">No resources yet</h3>
                  <p className="empty__text">Be the first South African student to share study material.</p>
                  <button type="button" className="btn btn--primary" onClick={openUploadModal}>Share a resource</button>
                </div>
              ) : (
                <div className="cards">{resources.slice(0, 6).map(renderCard)}</div>
              )}
            </section>
          </div>
        )}

        {/* Browse */}
        {view === "browse" && (
          <div className="page">
            <div className="browse">
              <div className="browse__header">
                <h1 className="page-title">Browse</h1>
                <SearchField id="searchBrowse" block value={search} onChange={setSearch} placeholder="Search resources" />
              </div>

              {renderFilter("Grade", grades, activeGrade, setActiveGrade, "filter-group--inline filter-group--grade")}
              <aside className="filters" aria-label="Subjects">
                {renderFilter("Subject", subjects, activeSubject, setActiveSubject)}
              </aside>
              {renderFilter("Type", types, activeType, setActiveType, "filter-group--inline filter-group--type")}

              <div className="browse__results">
                <div className="results-bar">
                  <span aria-live="polite">{filtered.length} resource{filtered.length !== 1 ? "s" : ""}</span>
                  {hasFilters && <button type="button" className="link-btn" onClick={resetFilters}>Clear filters</button>}
                </div>
                {loading ? skeletons : filtered.length === 0 ? (
                  <div className="empty">
                    <div className="empty__icon"><Icon name="search" size={30} /></div>
                    <h3 className="empty__title">No resources found</h3>
                    <p className="empty__text">{hasFilters ? "Try a different search or clear the filters." : "Nothing has been shared yet."}</p>
                    <button type="button" className="btn btn--primary" onClick={openUploadModal}>Share a resource</button>
                  </div>
                ) : (
                  <div className="cards">{filtered.map(renderCard)}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Library */}
        {view === "library" && (
          <div className="page">
            <h1 className="page-title">Library</h1>
            <div className="section" style={{ marginTop: 16 }}>
              {!user ? (
                <div className="empty">
                  <div className="empty__icon"><Icon name="star" size={30} /></div>
                  <h3 className="empty__title">Save resources for later</h3>
                  <p className="empty__text">Log in to star resources and find them here.</p>
                  <button type="button" className="btn btn--primary" onClick={() => openAuth("login")}>Log in</button>
                </div>
              ) : bookmarks.length === 0 ? (
                <div className="empty">
                  <div className="empty__icon"><Icon name="star" size={30} /></div>
                  <h3 className="empty__title">No bookmarks yet</h3>
                  <p className="empty__text">Star a resource and it will show up here.</p>
                  <button type="button" className="btn btn--primary" onClick={() => navigate("browse")}>Browse resources</button>
                </div>
              ) : (
                <div className="cards">{resources.filter(r => bookmarks.includes(r.id)).map(renderCard)}</div>
              )}
            </div>
          </div>
        )}

        {/* Viewer */}
        {view === "viewer" && selected && (() => {
          const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(selected.file_url || "");
          const isPdf = /\.pdf$/i.test(selected.file_url || "");
          const saved = isBookmarked(selected.id);
          return (
            <div className="page">
              <button type="button" className="back" onClick={() => window.history.back()}>
                <Icon name="chevronLeft" size={24} strokeWidth={2.2} />
                Back
              </button>
              <div className="viewer">
                <aside className="viewer__info">
                  {selected.type && <span className={`tag tag--${tagTone(selected.type)}`}>{selected.type}</span>}
                  <h1 className="viewer__title">{selected.title}</h1>
                  <p className="viewer__by">Shared by {displayName(selected.author)} on {formatDate(selected.created_at)}</p>
                  <p className="viewer__desc">{selected.description || "No description provided."}</p>
                  <dl className="kv">
                    <div><dt>Subject</dt><dd>{selected.subject}</dd></div>
                    <div><dt>Grade</dt><dd>{selected.grade}</dd></div>
                  </dl>
                  <div className="viewer__actions">
                    <button type="button" className={`btn btn--block ${saved ? "btn--secondary" : "btn--primary"}`} onClick={() => toggleBookmark(selected.id)}>
                      <Icon name="star" size={20} filled={saved} />
                      {saved ? "Bookmarked" : "Bookmark"}
                    </button>
                    {selected.file_url && (
                      <a className="btn btn--secondary btn--block" href={selected.file_url} target="_blank" rel="noreferrer">
                        <Icon name={isPdf || isImage ? "externalLink" : "download"} size={20} />
                        {isPdf || isImage ? "Open file" : "Download file"}
                      </a>
                    )}
                  </div>
                </aside>

                <div className="viewer__preview">
                  {selected.file_url ? (
                    isImage ? <img className="viewer__img" src={selected.file_url} alt={selected.title} />
                    : isPdf ? <iframe className="viewer__frame" src={selected.file_url} title={selected.title} />
                    : (
                      <div className="viewer__file">
                        <Icon name="file" size={44} strokeWidth={1.4} />
                        <strong>{selected.file_name}</strong>
                        <span>This file type can't be previewed here.</span>
                      </div>
                    )
                  ) : (
                    <div className="viewer__file">
                      <Icon name="file" size={44} strokeWidth={1.4} />
                      <span>No file attached to this resource.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <footer className="footer">StudyHive Beta 02. Built for South African students. Free forever.</footer>
      </main>

      {/* Tab bar (phones and tablets) */}
      <nav className="tabbar" aria-label="Main">
        {tabs.map(t => (
          <button key={t.id} type="button" className="tabbar__item" aria-current={view === t.id ? "page" : undefined} onClick={() => navigate(t.id)}>
            <Icon name={t.icon} size={26} filled={view === t.id} />
            <span>{t.label}</span>
            {t.count > 0 && <span className="badge" aria-label={`${t.count} saved`}>{t.count}</span>}
          </button>
        ))}
        <button type="button" className="tabbar__item" aria-current={accountOpen || authModal ? "page" : undefined} onClick={openAccount}>
          <Icon name="user" size={26} filled={accountOpen || authModal} />
          <span>{user ? "Account" : "Log in"}</span>
        </button>
      </nav>

      {/* Log in / sign up */}
      <Sheet open={authModal} onClose={() => { setAuthModal(false); setAuthErr(""); }} title={authMode === "login" ? "Log in" : "Create account"}>
        <form className="form" onSubmit={e => { e.preventDefault(); handleAuth(); }}>
          <input
            id="authEmail"
            name="email"
            className="field"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Email"
            aria-label="Email"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
          />
          <input
            id="authPassword"
            name="password"
            className="field"
            type="password"
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
            placeholder="Password"
            aria-label="Password"
            value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
          />
          {authErr && (
            <div className={`notice ${authErr.includes("Check your email") ? "notice--ok" : "notice--error"}`} role="alert">{authErr}</div>
          )}
          <button type="submit" className="btn btn--primary btn--block" disabled={authLoading}>
            {authLoading ? "Please wait..." : authMode === "login" ? "Log in" : "Sign up"}
          </button>
          <button type="button" className="btn btn--plain btn--block" onClick={() => { setAuthMode(authMode === "login" ? "signup" : "login"); setAuthErr(""); }}>
            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
          </button>
        </form>
      </Sheet>

      {/* Account */}
      <Sheet open={accountOpen && !!user} onClose={() => setAccountOpen(false)} title="Account">
        <div className="account">
          <div className="avatar avatar--lg">{initial}</div>
          <div className="account__email">{user?.email}</div>
        </div>
        <button type="button" className="btn btn--danger btn--block" onClick={async () => { setAccountOpen(false); await handleLogout(); }}>
          Log out
        </button>
      </Sheet>

      {/* Share a resource */}
      <Sheet open={uploadOpen} onClose={resetUpload} title={uploadDone ? "Shared" : "Share a resource"} dismissible={!uploading}>
        {uploadDone ? (
          <div className="success">
            <div className="success__icon"><Icon name="check" size={32} strokeWidth={2.6} /></div>
            <h3>Shared successfully</h3>
            <p>Your resource is now live on StudyHive. Thank you for contributing.</p>
            <button type="button" className="btn btn--primary btn--block" onClick={resetUpload}>Done</button>
          </div>
        ) : (
          <form className="form" onSubmit={e => { e.preventDefault(); handleUpload(); }}>
            <input id="resourceTitle" name="resourceTitle" className="field" placeholder="Title" aria-label="Title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <textarea id="resourceDescription" name="resourceDescription" className="field field--area" placeholder="Short description (optional)" aria-label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            <div className="form__row">
              <select id="resourceSubject" name="resourceSubject" className="field" aria-label="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}>
                {subjects.filter(s => s !== "All").map(s => <option key={s}>{s}</option>)}
              </select>
              <select id="resourceGrade" name="resourceGrade" className="field" aria-label="Grade" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                {grades.filter(g => g !== "All Grades").map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <select id="resourceType" name="resourceType" className="field" aria-label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {types.filter(t => t !== "All Types").map(t => <option key={t}>{t}</option>)}
            </select>

            <input ref={fileRef} type="file" accept={ACCEPTED_FILES} className="visually-hidden" tabIndex={-1} onChange={e => setFile(e.target.files[0] || null)} />
            <button type="button" className={`dropzone${file ? " dropzone--filled" : ""}`} onClick={() => fileRef.current?.click()}>
              <Icon name={file ? "paperclip" : "file"} size={26} />
              {file ? (
                <>
                  <strong>{file.name}</strong>
                  <small>{(file.size / 1024 / 1024).toFixed(1)} MB. Tap to change.</small>
                </>
              ) : (
                <>
                  <strong>Attach a file</strong>
                  <small>PDF, Word, PowerPoint or image, up to 50 MB</small>
                </>
              )}
            </button>

            <p className="form__hint">Sharing as {user?.email}</p>

            {uploadErr && <div className="notice notice--error" role="alert">{uploadErr}</div>}
            {uploadProgress && <div className="notice notice--info" role="status">{uploadProgress}</div>}
            <button type="submit" className="btn btn--primary btn--block" disabled={uploading}>
              {uploading ? "Sharing..." : "Share"}
            </button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
