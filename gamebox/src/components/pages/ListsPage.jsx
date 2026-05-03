// src/components/pages/ListsPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../config/firebase";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, where, orderBy, serverTimestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { getImageURL } from "../../services/igdbService";
import toast from "react-hot-toast";

export default function ListsPage() {
  const { currentUser, userProfile } = useAuth();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [activeTab, setActiveTab] = useState("my");

  useEffect(() => { loadLists(); }, [activeTab]);

  async function loadLists() {
    setLoading(true);
    try {
      let q;
      if (activeTab === "my" && currentUser) {
        q = query(collection(db, "lists"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
      } else {
        q = query(collection(db, "lists"), where("isPublic", "==", true), orderBy("createdAt", "desc"));
      }
      const snap = await getDocs(q);
      setLists(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return toast.error("Enter a title");
    try {
      const docRef = await addDoc(collection(db, "lists"), {
        userId: currentUser.uid,
        username: userProfile?.displayName || currentUser.email,
        title: newTitle.trim(),
        description: newDesc.trim(),
        games: [],
        isPublic: true,
        likesCount: 0,
        createdAt: serverTimestamp(),
      });
      setLists([{ id: docRef.id, title: newTitle, description: newDesc, games: [], username: userProfile?.displayName }, ...lists]);
      setNewTitle(""); setNewDesc(""); setShowCreate(false);
      toast.success("List created!");
    } catch { toast.error("Failed to create list"); }
  }

  async function handleDelete(listId) {
    if (!window.confirm("Delete this list?")) return;
    try {
      await deleteDoc(doc(db, "lists", listId));
      setLists((p) => p.filter((l) => l.id !== listId));
      toast.success("List deleted");
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page lists-page">
      <div className="section-header">
        <h1>Game Lists</h1>
        {currentUser && <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">{showCreate ? "Cancel" : "Create List"}</button>}
      </div>

      <div className="browse-tabs" style={{ marginTop: "1rem" }}>
        <button className={`tab-btn ${activeTab === "my" ? "active" : ""}`} onClick={() => setActiveTab("my")}>My Lists</button>
        <button className={`tab-btn ${activeTab === "public" ? "active" : ""}`} onClick={() => setActiveTab("public")}>Community Lists</button>
      </div>

      {showCreate && (
        <div className="review-form-card" style={{ marginTop: "1rem" }}>
          <h3>Create a New List</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. Top Horror Games 2025" />
            </div>
            <div className="form-group">
              <label>Description (Optional)</label>
              <textarea rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this list about?" />
            </div>
            <button type="submit" className="btn-primary">Create</button>
          </form>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="empty-state"><p>{activeTab === "my" ? "You haven't created any lists yet." : "No community lists yet."}</p></div>
      ) : (
        <div className="lists-grid">
          {lists.map((list) => (
            <div key={list.id} className="list-card">
              <div className="list-card-header">
                <h3>{list.title}</h3>
                <span className="list-meta">by {list.username} — {list.games?.length || 0} games</span>
              </div>
              {list.description && <p className="list-desc">{list.description}</p>}
              {list.games?.length > 0 && (
                <div className="list-covers">
                  {list.games.slice(0, 4).map((g, i) => (
                    <img key={i} src={getImageURL(g.coverId, "thumb")} alt="" className="list-cover-thumb" />
                  ))}
                </div>
              )}
              <div className="list-actions">
                <Link to={`/list/${list.id}`} className="btn-ghost btn-sm">View</Link>
                {currentUser?.uid === list.userId && (
                  <button className="btn-ghost btn-sm danger" onClick={() => handleDelete(list.id)}>Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
