// src/components/pages/JournalPage.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function JournalPage() {
  const { currentUser, userProfile } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [gameTitle, setGameTitle] = useState("");
  const [mood, setMood] = useState("neutral");

  useEffect(() => { if (currentUser) loadEntries(); }, [currentUser]);

  async function loadEntries() {
    try {
      const q = query(collection(db, "journals"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error("Fill in title and content");
    try {
      const docRef = await addDoc(collection(db, "journals"), {
        userId: currentUser.uid,
        username: userProfile?.displayName || currentUser.email,
        title: title.trim(),
        content: content.trim(),
        gameTitle: gameTitle.trim(),
        mood,
        createdAt: serverTimestamp(),
      });
      setEntries([{ id: docRef.id, title, content, gameTitle, mood, createdAt: new Date() }, ...entries]);
      setTitle(""); setContent(""); setGameTitle(""); setMood("neutral"); setShowNew(false);
      toast.success("Journal entry saved!");
    } catch { toast.error("Failed to save"); }
  }

  async function handleDelete(entryId) {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await deleteDoc(doc(db, "journals", entryId));
      setEntries((p) => p.filter((e) => e.id !== entryId));
      toast.success("Entry deleted");
    } catch { toast.error("Failed"); }
  }

  const moodEmojis = { great: "😄", good: "🙂", neutral: "😐", bad: "😕", terrible: "😫" };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page journal-page">
      <div className="section-header">
        <h1>Game Journal</h1>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary">{showNew ? "Cancel" : "New Entry"}</button>
      </div>
      <p className="page-subtitle">Document your gaming experiences and thoughts</p>

      {showNew && (
        <div className="review-form-card" style={{ marginTop: "1rem" }}>
          <h3>New Journal Entry</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Today's gaming session..." />
            </div>
            <div className="form-group">
              <label>Game (Optional)</label>
              <input type="text" value={gameTitle} onChange={(e) => setGameTitle(e.target.value)} placeholder="What game are you writing about?" />
            </div>
            <div className="form-group">
              <label>Mood</label>
              <div className="mood-selector">
                {Object.entries(moodEmojis).map(([key, emoji]) => (
                  <button key={key} type="button" className={`mood-btn ${mood === key ? "active" : ""}`} onClick={() => setMood(key)}>
                    {emoji} {key}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Entry</label>
              <textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write about your experience..." />
            </div>
            <button type="submit" className="btn-primary">Save Entry</button>
          </form>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="empty-state"><p>No journal entries yet. Start documenting your gaming journey!</p></div>
      ) : (
        <div className="journal-list">
          {entries.map((entry) => (
            <div key={entry.id} className="journal-card">
              <div className="journal-header">
                <div>
                  <h3>{entry.title}</h3>
                  {entry.gameTitle && <span className="genre-tag">{entry.gameTitle}</span>}
                </div>
                <span className="journal-mood">{moodEmojis[entry.mood] || "😐"}</span>
              </div>
              <p className="journal-content">{entry.content}</p>
              <div className="journal-footer">
                <span className="journal-date">
                  {entry.createdAt?.toDate ? entry.createdAt.toDate().toLocaleDateString() : new Date(entry.createdAt).toLocaleDateString()}
                </span>
                <button className="btn-ghost btn-sm danger" onClick={() => handleDelete(entry.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
