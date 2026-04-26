import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

// ─────────────────────────────────────────
// Auth Screen
// ─────────────────────────────────────────

function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null); setLoading(true);
    try {
      const endpoint = mode === "signup" ? "/signup" : "/login";
      const body = mode === "signup"
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Auth failed");
      onAuth(data.access_token, data.user);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.container, maxWidth: "420px" }}>
        <div style={{ ...styles.header, textAlign: "center" }}>
          <h1 style={styles.title}>AI Content Generator</h1>
          <p style={styles.subtitle}>Trend-aware content for marketing teams</p>
        </div>
        <div style={styles.card}>
          <div style={styles.authTabRow}>
            {["login", "signup"].map((m) => (
              <button key={m}
                style={{ ...styles.authTab, ...(mode === m ? styles.authTabActive : {}) }}
                onClick={() => { setMode(m); setError(null); }}>
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>
          {error && <div style={styles.errorBanner}>⚠ {error}</div>}
          {mode === "signup" && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name</label>
              <input style={styles.input} type="text" placeholder="Jane Smith"
                value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
          )}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" placeholder="you@example.com"
              value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input style={styles.input} type="password"
              placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
          <button style={{ ...styles.generateBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSubmit} disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────

function Dashboard({ token, onLoad }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: authHeaders });
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch { setProjects([]); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    await fetch(`${API_BASE}/projects/${id}`, { method: "DELETE", headers: authHeaders });
    fetchProjects();
  };

  const typeColors = {
    blog:    { bg: "#ede9fe", color: "#4f46e5" },
    ad:      { bg: "#fef3c7", color: "#92400e" },
    caption: { bg: "#dcfce7", color: "#166534" },
    email:   { bg: "#dbeafe", color: "#1e40af" },
  };

  if (loading) return <p style={{ color: "#6b7280" }}>Loading projects...</p>;
  if (projects.length === 0) return (
    <div style={{ textAlign: "center", padding: "48px 0", color: "#9ca3af" }}>
      <p style={{ fontSize: "32px" }}>📂</p>
      <p style={{ fontSize: "15px" }}>No saved projects yet.</p>
      <p style={{ fontSize: "13px" }}>Generate content and click "Save Project" to see it here.</p>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
        {projects.length} saved project{projects.length !== 1 ? "s" : ""}
      </p>
      {projects.map((p) => (
        <div key={p.id} style={styles.projectCard}>
          <div style={styles.projectCardHeader}>
            <div style={{ flex: 1 }}>
              <div style={styles.projectMeta}>
                <span style={{ ...styles.badge, ...typeColors[p.content_type] }}>{p.content_type}</span>
                <span style={styles.badgeGray}>{p.tone}</span>
                <span style={styles.badgeGray}>{p.industry}</span>
                {p.trend_score !== null && <span style={styles.badgeGray}>🔥 {p.trend_score}/100</span>}
              </div>
              <p style={styles.projectTitle}>{p.title}</p>
              <p style={styles.projectPrompt}>"{p.prompt}"</p>
            </div>
            <div style={styles.projectActions}>
              <button style={styles.loadBtn} onClick={() => onLoad(p)}>Load</button>
              <button style={styles.deleteBtn} onClick={() => handleDelete(p.id)}>Delete</button>
            </div>
          </div>
          <p style={styles.projectPreview}>{p.content.slice(0, 160)}{p.content.length > 160 ? "..." : ""}</p>
          <p style={styles.projectDate}>{p.word_count} words · saved {new Date(p.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// SEO Panel
// ─────────────────────────────────────────

function SEOPanel({ content, industry, keywords, token }) {
  const [seo, setSeo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyze = async () => {
    setLoading(true); setError(null); setSeo(null);
    try {
      const res = await fetch(`${API_BASE}/content/seo`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, industry, keywords }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "SEO analysis failed");
      setSeo(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const scoreColor = (s) => s >= 70 ? "#166534" : s >= 40 ? "#854d0e" : "#991b1b";
  const scoreBg    = (s) => s >= 70 ? "#dcfce7" : s >= 40 ? "#fef9c3" : "#fef2f2";

  return (
    <div style={styles.seoPanel}>
      <div style={styles.seoPanelHeader}>
        <span style={styles.cardTitle}>🔍 SEO Analysis</span>
        <button style={{ ...styles.saveBtn, fontSize: "12px", padding: "6px 14px" }}
          onClick={analyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </div>

      {error && <p style={{ color: "#991b1b", fontSize: "13px" }}>{error}</p>}

      {seo && (
        <div>
          {/* Score */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <span style={{
              fontSize: "22px", fontWeight: "700",
              color: scoreColor(seo.score),
              background: scoreBg(seo.score),
              padding: "4px 14px", borderRadius: "20px"
            }}>{seo.score}/100</span>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>SEO Score</span>
          </div>

          {/* Title suggestion */}
          {seo.title_suggestion && (
            <div style={styles.seoItem}>
              <p style={styles.seoLabel}>Suggested Title</p>
              <p style={styles.seoValue}>{seo.title_suggestion}</p>
            </div>
          )}

          {/* Meta description */}
          {seo.meta_description && (
            <div style={styles.seoItem}>
              <p style={styles.seoLabel}>Meta Description</p>
              <p style={styles.seoValue}>{seo.meta_description}</p>
            </div>
          )}

          {/* Tips */}
          {seo.tips?.length > 0 && (
            <div style={styles.seoItem}>
              <p style={styles.seoLabel}>Improvement Tips</p>
              {seo.tips.map((tip, i) => (
                <p key={i} style={styles.seoTip}>• {tip}</p>
              ))}
            </div>
          )}

          {/* Missing keywords */}
          {seo.missing_keywords?.length > 0 && (
            <div style={styles.seoItem}>
              <p style={styles.seoLabel}>Missing Keywords</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {seo.missing_keywords.map((kw) => (
                  <span key={kw} style={{ ...styles.badgeGray, background: "#fef2f2", color: "#991b1b" }}>{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Main App
// ─────────────────────────────────────────

function MainApp({ token, user, onLogout }) {
  const [activeTab, setActiveTab] = useState("generate");
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState({
    content_type: "blog", prompt: "", tone: "professional",
    industry: "technology", keywords: "", use_trends: true,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trends, setTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [showTitleInput, setShowTitleInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [variations, setVariations] = useState(null);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  const [showSEO, setShowSEO] = useState(false);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    fetch(`${API_BASE}/options`).then((r) => r.json()).then(setOptions)
      .catch(() => setError("Cannot connect to backend."));
  }, []);

  const fetchTrends = useCallback(async (industry) => {
    setTrendsLoading(true); setTrendsError(null); setTrends(null);
    try {
      const res = await fetch(`${API_BASE}/trends/${industry}`);
      if (!res.ok) throw new Error();
      setTrends(await res.json());
    } catch { setTrendsError("Could not load trends — try again shortly."); }
    finally { setTrendsLoading(false); }
  }, []);

  useEffect(() => { fetchTrends(form.industry); }, [form.industry, fetchTrends]);

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const addKeyword = (kw) => {
    setForm((prev) => {
      const existing = prev.keywords
        ? prev.keywords.split(",").map((k) => k.trim()).filter(Boolean) : [];
      if (existing.includes(kw)) return prev;
      return { ...prev, keywords: [...existing, kw].join(", ") };
    });
  };

  const handleGenerate = async () => {
    if (!form.prompt.trim()) { setError("Please enter a prompt."); return; }
    setError(null); setLoading(true); setResult(null);
    setSaveStatus(null); setShowTitleInput(false);
    setVariations(null); setShowSEO(false);
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: "POST", headers: authHeaders, body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 401) { onLogout(); return; }
        throw new Error(err.detail || "Generation failed");
      }
      setResult(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  // Rewrite / Expand / Shorten
  const handleAction = async (action) => {
    if (!result?.content) return;
    setActionLoading(action);
    try {
      const res = await fetch(`${API_BASE}/content/action`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({ content: result.content, action, tone: form.tone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult((p) => ({ ...p, content: data.content, word_count: data.word_count }));
    } catch (err) { setError(err.message); }
    finally { setActionLoading(null); }
  };

  // Multiple Variations
  const handleVariations = async () => {
    setVariationsLoading(true); setVariations(null);
    try {
      const res = await fetch(`${API_BASE}/content/variations`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({
          content_type: form.content_type,
          prompt: form.prompt,
          tone: form.tone,
          industry: form.industry,
          keywords: form.keywords,
          count: 3,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setVariations(data.variations);
    } catch (err) { setError(err.message); }
    finally { setVariationsLoading(false); }
  };

  // Copy to clipboard
  const handleCopy = () => {
    if (!result?.content) return;
    navigator.clipboard.writeText(result.content).then(() => {
      setCopyStatus(true);
      setTimeout(() => setCopyStatus(false), 2000);
    });
  };

  const handleSaveProject = async () => {
    if (!projectTitle.trim()) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify({
          title: projectTitle,
          content_type: result.content_type,
          tone: result.tone,
          industry: form.industry,
          prompt: form.prompt,
          content: result.content,
          keywords_used: result.keywords_used,
          trend_keywords: result.trend_keywords_injected,
          trend_score: result.trend_score,
          word_count: result.word_count,
        }),
      });
      if (!res.ok) throw new Error();
      setSaveStatus("saved"); setShowTitleInput(false); setProjectTitle("");
    } catch { setSaveStatus("error"); }
  };

  const handleLoadProject = (p) => {
    setForm({
      content_type: p.content_type, prompt: p.prompt, tone: p.tone,
      industry: p.industry, keywords: p.keywords_used.join(", "), use_trends: true,
    });
    setResult({
      content: p.content, content_type: p.content_type, tone: p.tone,
      keywords_used: p.keywords_used, trend_keywords_injected: p.trend_keywords,
      trend_score: p.trend_score, word_count: p.word_count, generated_at: p.created_at,
    });
    setVariations(null); setShowSEO(false); setSaveStatus(null);
    setActiveTab("generate");
  };

  const trendScoreColor = (score) => {
    if (score >= 70) return { bg: "#dcfce7", color: "#166534" };
    if (score >= 40) return { bg: "#fef9c3", color: "#854d0e" };
    return { bg: "#f3f4f6", color: "#6b7280" };
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Navbar */}
        <div style={styles.navbar}>
          <span style={styles.navTitle}>AI Content Generator</span>
          <div style={styles.navRight}>
            <div style={styles.navTabs}>
              {["generate", "dashboard"].map((tab) => (
                <button key={tab}
                  style={{ ...styles.navTab, ...(activeTab === tab ? styles.navTabActive : {}) }}
                  onClick={() => setActiveTab(tab)}>
                  {tab === "generate" ? "✦ Generate" : "📂 Dashboard"}
                </button>
              ))}
            </div>
            <span style={styles.navUser}>👤 {user.name}</span>
            <button style={styles.logoutBtn} onClick={onLogout}>Log out</button>
          </div>
        </div>

        {error && <div style={styles.errorBanner}>⚠ {error}</div>}

        {/* ── GENERATE TAB ── */}
        {activeTab === "generate" && (
          <div style={styles.twoColLayout}>
            <div style={{ flex: 1 }}>
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>Generate Content</h2>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Content Type</label>
                  <div style={styles.tabRow}>
                    {(options?.content_types || ["blog","ad","caption","email"]).map((type) => (
                      <button key={type}
                        style={{ ...styles.tab, ...(form.content_type === type ? styles.tabActive : {}) }}
                        onClick={() => handleChange("content_type", type)}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Your Prompt</label>
                  <textarea style={styles.textarea} rows={3}
                    placeholder="e.g. Write about the benefits of daily meditation for busy professionals..."
                    value={form.prompt} onChange={(e) => handleChange("prompt", e.target.value)} />
                </div>

                <div style={styles.twoCol}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Tone</label>
                    <select style={styles.select} value={form.tone}
                      onChange={(e) => handleChange("tone", e.target.value)}>
                      {(options?.tones || []).map((t) => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.label}>Industry</label>
                    <select style={styles.select} value={form.industry}
                      onChange={(e) => handleChange("industry", e.target.value)}>
                      {(options?.industries || []).map((ind) => (
                        <option key={ind} value={ind}>{ind.charAt(0).toUpperCase() + ind.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>
                    Keywords <span style={styles.labelHint}>(comma-separated · click trends to add)</span>
                  </label>
                  <input style={styles.input} type="text"
                    placeholder="e.g. productivity, mindfulness, wellness"
                    value={form.keywords} onChange={(e) => handleChange("keywords", e.target.value)} />
                </div>

                <div style={styles.toggleRow}>
                  <div>
                    <p style={styles.toggleLabel}>🔥 Inject trending keywords</p>
                    <p style={styles.toggleHint}>Auto-pulls top trends for your industry</p>
                  </div>
                  <div style={{ ...styles.toggleTrack, background: form.use_trends ? "#4f46e5" : "#d1d5db" }}
                    onClick={() => handleChange("use_trends", !form.use_trends)}>
                    <div style={{ ...styles.toggleThumb, transform: form.use_trends ? "translateX(20px)" : "translateX(2px)" }} />
                  </div>
                </div>

                <button style={{ ...styles.generateBtn, opacity: loading ? 0.7 : 1 }}
                  onClick={handleGenerate} disabled={loading}>
                  {loading ? "Generating..." : "✦ Generate Content"}
                </button>

                {/* Variations Button */}
                {form.prompt.trim() && (
                  <button style={{ ...styles.variationsBtn, opacity: variationsLoading ? 0.7 : 1 }}
                    onClick={handleVariations} disabled={variationsLoading}>
                    {variationsLoading ? "Generating..." : "⚡ Generate 3 Variations"}
                  </button>
                )}
              </div>

              {/* Variations Card */}
              {variations && (
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>⚡ Variations</h2>
                  <p style={styles.labelHint}>Click any variation to use it as your main content</p>
                  {variations.map((v, i) => (
                    <div key={i} style={styles.variationItem}
                      onClick={() => setResult((p) => p
                        ? { ...p, content: v, word_count: v.split(" ").length }
                        : { content: v, content_type: form.content_type, tone: form.tone,
                            keywords_used: [], trend_keywords_injected: [],
                            trend_score: null, word_count: v.split(" ").length,
                            generated_at: new Date().toISOString() }
                      )}>
                      <p style={styles.variationLabel}>Variation {i + 1}</p>
                      <p style={styles.variationText}>{v.slice(0, 200)}{v.length > 200 ? "..." : ""}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Result Card */}
              {result && (
                <div style={styles.card}>
                  <div style={styles.resultHeader}>
                    <h2 style={styles.cardTitle}>Generated Content</h2>
                    <div style={styles.metaRow}>
                      <span style={styles.badge}>{result.content_type}</span>
                      <span style={styles.badge}>{result.tone}</span>
                      <span style={styles.badgeGray}>{result.word_count} words</span>
                      {result.trend_score !== null && (
                        <span style={{ ...styles.badgeGray, ...trendScoreColor(result.trend_score), fontWeight: "600" }}>
                          🔥 {result.trend_score}/100
                        </span>
                      )}
                    </div>
                  </div>

                  {result.trend_keywords_injected?.length > 0 && (
                    <div style={styles.trendInjectedRow}>
                      <span style={styles.labelHint}>Trends injected: </span>
                      {result.trend_keywords_injected.map((kw) => (
                        <span key={kw} style={styles.trendInjectedTag}>{kw}</span>
                      ))}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={styles.actionRow}>
                    {["rewrite", "expand", "shorten"].map((action) => (
                      <button key={action}
                        style={{ ...styles.actionBtn, opacity: actionLoading === action ? 0.6 : 1 }}
                        onClick={() => handleAction(action)}
                        disabled={actionLoading !== null}>
                        {actionLoading === action ? "..." : {
                          rewrite: "↺ Rewrite",
                          expand:  "↕ Expand",
                          shorten: "↔ Shorten",
                        }[action]}
                      </button>
                    ))}
                    <button
                      style={{ ...styles.actionBtn, background: copyStatus ? "#059669" : "#374151", color: "#fff" }}
                      onClick={handleCopy}>
                      {copyStatus ? "✓ Copied!" : "⎘ Copy"}
                    </button>
                    <button
                      style={{ ...styles.actionBtn, background: showSEO ? "#4f46e5" : undefined, color: showSEO ? "#fff" : undefined }}
                      onClick={() => setShowSEO((p) => !p)}>
                      🔍 SEO
                    </button>
                  </div>

                  <textarea style={styles.outputEditor} rows={14}
                    value={result.content}
                    onChange={(e) => setResult((p) => ({ ...p, content: e.target.value,
                      word_count: e.target.value.split(" ").length }))} />

                  {result.keywords_used.length > 0 && (
                    <div style={styles.keywordsRow}>
                      <span style={styles.labelHint}>Your keywords: </span>
                      {result.keywords_used.map((kw) => (
                        <span key={kw} style={styles.kwTag}>{kw}</span>
                      ))}
                    </div>
                  )}

                  {/* SEO Panel */}
                  {showSEO && (
                    <SEOPanel
                      content={result.content}
                      industry={form.industry}
                      keywords={form.keywords}
                      token={token}
                    />
                  )}

                  {/* Save Section */}
                  <div style={styles.saveRow}>
                    {!showTitleInput && saveStatus !== "saved" && (
                      <button style={styles.saveBtn} onClick={() => setShowTitleInput(true)}>
                        💾 Save Project
                      </button>
                    )}
                    {showTitleInput && (
                      <div style={styles.titleInputRow}>
                        <input style={{ ...styles.input, flex: 1 }} type="text"
                          placeholder="Project title..."
                          value={projectTitle}
                          onChange={(e) => setProjectTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveProject()} />
                        <button style={styles.saveBtn} onClick={handleSaveProject}
                          disabled={saveStatus === "saving"}>
                          {saveStatus === "saving" ? "Saving..." : "Save"}
                        </button>
                        <button style={styles.cancelBtn} onClick={() => setShowTitleInput(false)}>Cancel</button>
                      </div>
                    )}
                    {saveStatus === "saved" && <span style={styles.savedConfirm}>✓ Saved to Dashboard</span>}
                    {saveStatus === "error"  && <span style={{ color: "#991b1b", fontSize: "13px" }}>Save failed — try again</span>}
                  </div>

                  <p style={styles.generatedAt}>
                    Generated at {new Date(result.generated_at).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            {/* Trends Panel */}
            <div style={{ width: "260px", flexShrink: 0 }}>
              <div style={styles.card}>
                <div style={styles.trendHeader}>
                  <h2 style={styles.cardTitle}>🔥 Trending Now</h2>
                  <button style={styles.refreshBtn}
                    onClick={() => fetchTrends(form.industry)} disabled={trendsLoading}>
                    {trendsLoading ? "..." : "↻"}
                  </button>
                </div>
                <p style={styles.trendSubtitle}>{form.industry} · last 7 days</p>
                {trendsLoading && <p style={styles.trendNote}>Fetching Google Trends...</p>}
                {trendsError  && <p style={styles.trendError}>{trendsError}</p>}
                {trends && !trendsLoading && (
                  <>
                    <div style={{ marginBottom: "16px" }}>
                      <p style={styles.trendSectionLabel}>Interest score</p>
                      {trends.trending.map((item) => (
                        <div key={item.keyword} style={styles.trendItem}
                          onClick={() => addKeyword(item.keyword)} title="Click to add">
                          <div style={styles.trendItemTop}>
                            <span style={styles.trendKeyword}>{item.keyword}</span>
                            <span style={styles.trendScore}>{item.score}</span>
                          </div>
                          <div style={styles.trendBarBg}>
                            <div style={{ ...styles.trendBarFill, width: `${item.score}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {trends.rising.length > 0 && (
                      <div>
                        <p style={styles.trendSectionLabel}>🚀 Rising queries</p>
                        {trends.rising.map((q) => (
                          <div key={q} style={styles.risingTag} onClick={() => addKeyword(q)}>{q}</div>
                        ))}
                      </div>
                    )}
                    <p style={styles.trendFooter}>Click any keyword to add it →</p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {activeTab === "dashboard" && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>📂 Saved Projects</h2>
            <Dashboard token={token} onLoad={handleLoadProject} />
          </div>
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Root
// ─────────────────────────────────────────

export default function App() {
  const [token, setToken] = useState(null);
  const [user, setUser]   = useState(null);

  return !token
    ? <AuthScreen onAuth={(t, u) => { setToken(t); setUser(u); }} />
    : <MainApp token={token} user={user} onLogout={() => { setToken(null); setUser(null); }} />;
}

// ─────────────────────────────────────────
// Styles
// ─────────────────────────────────────────

const styles = {
  page:               { minHeight: "100vh", background: "#f3f4f6", padding: "32px 16px" },
  container:          { maxWidth: "1020px", margin: "0 auto", fontFamily: "system-ui, sans-serif" },
  header:             { marginBottom: "24px" },
  title:              { fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0 },
  subtitle:           { fontSize: "14px", color: "#6b7280", marginTop: "4px" },
  navbar:             { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" },
  navTitle:           { fontSize: "18px", fontWeight: "700", color: "#111827" },
  navRight:           { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  navTabs:            { display: "flex", gap: "6px" },
  navTab:             { padding: "7px 16px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", color: "#374151", fontSize: "13px", fontWeight: "500", cursor: "pointer" },
  navTabActive:       { background: "#4f46e5", color: "#fff", border: "1px solid #4f46e5" },
  navUser:            { fontSize: "14px", color: "#374151" },
  logoutBtn:          { padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#fff", color: "#374151", fontSize: "13px", cursor: "pointer" },
  errorBanner:        { background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px" },
  authTabRow:         { display: "flex", marginBottom: "24px", borderBottom: "1px solid #e5e7eb" },
  authTab:            { flex: 1, padding: "10px", background: "none", border: "none", fontSize: "15px", fontWeight: "500", color: "#6b7280", cursor: "pointer", borderBottom: "2px solid transparent" },
  authTabActive:      { color: "#4f46e5", borderBottom: "2px solid #4f46e5" },
  twoColLayout:       { display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" },
  card:               { background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", marginBottom: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  cardTitle:          { fontSize: "17px", fontWeight: "600", color: "#111827", marginTop: 0, marginBottom: "16px" },
  fieldGroup:         { marginBottom: "18px" },
  label:              { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" },
  labelHint:          { fontWeight: "400", color: "#9ca3af", fontSize: "12px" },
  tabRow:             { display: "flex", gap: "8px", flexWrap: "wrap" },
  tab:                { padding: "8px 18px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#f9fafb", color: "#374151", fontSize: "14px", cursor: "pointer", fontWeight: "500" },
  tabActive:          { background: "#4f46e5", color: "#fff", border: "1px solid #4f46e5" },
  textarea:           { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outline: "none", background: "#111827", color: "#ffffff"},
  twoCol:             { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  select:             { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", background: "#fff", color: "#111827", outline: "none", cursor: "pointer" },
  input:              { width: "100%", padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box", outline: "none", background: "#111827",color: "#ffffff"},
  toggleRow:          { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "#f9fafb", borderRadius: "10px", marginBottom: "18px", gap: "12px" },
  toggleLabel:        { fontSize: "13px", fontWeight: "600", color: "#374151", margin: "0 0 2px 0" },
  toggleHint:         { fontSize: "12px", color: "#9ca3af", margin: 0 },
  toggleTrack:        { width: "44px", height: "24px", borderRadius: "12px", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" },
  toggleThumb:        { position: "absolute", top: "2px", width: "20px", height: "20px", background: "#fff", borderRadius: "50%", transition: "transform 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
  generateBtn:        { width: "100%", padding: "13px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "10px", fontSize: "15px", fontWeight: "600", cursor: "pointer", marginBottom: "10px" },
  variationsBtn:      { width: "100%", padding: "11px", background: "#fff", color: "#4f46e5", border: "2px solid #4f46e5", borderRadius: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  actionRow:          { display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" },
  actionBtn:          { padding: "7px 14px", border: "1px solid #d1d5db", borderRadius: "8px", background: "#f9fafb", color: "#374151", fontSize: "13px", fontWeight: "500", cursor: "pointer" },
  trendHeader:        { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" },
  refreshBtn:         { background: "none", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "16px", color: "#6b7280" },
  trendSubtitle:      { fontSize: "12px", color: "#9ca3af", marginBottom: "16px", marginTop: 0 },
  trendNote:          { fontSize: "13px", color: "#6b7280", textAlign: "center", padding: "12px 0" },
  trendError:         { fontSize: "12px", color: "#991b1b", background: "#fef2f2", padding: "8px", borderRadius: "6px" },
  trendSectionLabel:  { fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" },
  trendItem:          { marginBottom: "10px", cursor: "pointer" },
  trendItemTop:       { display: "flex", justifyContent: "space-between", marginBottom: "4px" },
  trendKeyword:       { fontSize: "13px", color: "#374151", fontWeight: "500" },
  trendScore:         { fontSize: "12px", color: "#6b7280" },
  trendBarBg:         { height: "4px", background: "#f3f4f6", borderRadius: "2px" },
  trendBarFill:       { height: "4px", background: "#4f46e5", borderRadius: "2px", transition: "width 0.4s ease" },
  risingTag:          { display: "inline-block", margin: "3px", padding: "4px 10px", background: "#fef3c7", color: "#92400e", borderRadius: "20px", fontSize: "12px", cursor: "pointer", border: "1px solid #fde68a" },
  trendFooter:        { fontSize: "11px", color: "#d1d5db", marginTop: "12px", textAlign: "center" },
  resultHeader:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", flexWrap: "wrap", gap: "8px" },
  metaRow:            { display: "flex", gap: "6px", flexWrap: "wrap" },
  badge:              { padding: "3px 10px", background: "#ede9fe", color: "#4f46e5", borderRadius: "20px", fontSize: "12px", fontWeight: "500" },
  badgeGray:          { padding: "3px 10px", background: "#f3f4f6", color: "#6b7280", borderRadius: "20px", fontSize: "12px" },
  trendInjectedRow:   { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", marginBottom: "14px", fontSize: "13px" },
  trendInjectedTag:   { padding: "2px 10px", background: "#ede9fe", color: "#4f46e5", borderRadius: "20px", fontSize: "12px", border: "1px solid #c4b5fd" },
  outputEditor:       { width: "100%", padding: "14px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", lineHeight: "1.6", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", background: "#fafafa", color: "#111827", outline: "none" },
  keywordsRow:        { marginTop: "12px", fontSize: "13px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px" },
  kwTag:              { padding: "2px 10px", background: "#f0fdf4", color: "#166534", borderRadius: "20px", fontSize: "12px", border: "1px solid #bbf7d0" },
  saveRow:            { marginTop: "16px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
  titleInputRow:      { display: "flex", gap: "8px", flex: 1, flexWrap: "wrap" },
  saveBtn:            { padding: "8px 18px", background: "#059669", color: "#fff", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  cancelBtn:          { padding: "8px 14px", background: "none", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px", color: "#6b7280", cursor: "pointer" },
  savedConfirm:       { fontSize: "13px", color: "#059669", fontWeight: "600" },
  generatedAt:        { fontSize: "12px", color: "#9ca3af", marginTop: "12px", marginBottom: 0 },
  variationItem:      { border: "1px solid #e5e7eb", borderRadius: "8px", padding: "14px", marginBottom: "10px", cursor: "pointer", transition: "border-color 0.15s" },
  variationLabel:     { fontSize: "12px", fontWeight: "600", color: "#4f46e5", margin: "0 0 6px 0" },
  variationText:      { fontSize: "13px", color: "#374151", margin: 0, lineHeight: "1.5" },
  projectCard:        { border: "1px solid #e5e7eb", borderRadius: "10px", padding: "16px", marginBottom: "12px", background: "#fafafa" },
  projectCardHeader:  { display: "flex", justifyContent: "space-between", gap: "12px", marginBottom: "8px" },
  projectMeta:        { display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" },
  projectTitle:       { fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 2px 0" },
  projectPrompt:      { fontSize: "12px", color: "#6b7280", margin: 0, fontStyle: "italic" },
  projectActions:     { display: "flex", gap: "6px", flexShrink: 0 },
  loadBtn:            { padding: "6px 14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "7px", fontSize: "12px", cursor: "pointer" },
  deleteBtn:          { padding: "6px 14px", background: "none", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: "7px", fontSize: "12px", cursor: "pointer" },
  projectPreview:     { fontSize: "13px", color: "#6b7280", margin: "8px 0 4px", lineHeight: "1.5" },
  projectDate:        { fontSize: "11px", color: "#9ca3af", margin: 0 },
  seoPanel:           { marginTop: "20px", padding: "16px", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: "10px" },
  seoPanelHeader:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  seoItem:            { marginBottom: "12px" },
  seoLabel:           { fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px 0" },
  seoValue:           { fontSize: "13px", color: "#374151", margin: 0 },
  seoTip:             { fontSize: "13px", color: "#374151", margin: "4px 0" },
};