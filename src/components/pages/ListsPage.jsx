// src/components/pages/ListsPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { db } from "../../config/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, serverTimestamp, updateDoc } from "firebase/firestore";
import { getImageURL } from "../../services/igdbService";
import { Lock, Globe } from "lucide-react";
import toast from "react-hot-toast";

export default function ListsPage() {
  const { currentUser, userProfile } = useAuth();
  const { t, lang } = useLanguage();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIsPrivate, setNewIsPrivate] = useState(false);
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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return toast.error(t("listTitle"));
    try {
      const docRef = await addDoc(collection(db, "lists"), {
        userId: currentUser.uid,
        username: userProfile?.displayName || currentUser.email,
        title: newTitle.trim(),
        description: newDesc.trim(),
        games: [],
        isPublic: !newIsPrivate,
        likesCount: 0,
        createdAt: serverTimestamp(),
      });
      setLists([{
        id: docRef.id,
        title: newTitle,
        description: newDesc,
        games: [],
        isPublic: !newIsPrivate,
        username: userProfile?.displayName,
        userId: currentUser.uid,
      }, ...lists]);
      setNewTitle(""); setNewDesc(""); setNewIsPrivate(false); setShowCreate(false);
      toast.success(lang === "ar" ? "تم إنشاء القائمة" : "List created");
    } catch { toast.error("Failed"); }
  }

  async function handleDelete(listId) {
    if (!window.confirm(t("delete") + "?")) return;
    try {
      await deleteDoc(doc(db, "lists", listId));
      setLists((p) => p.filter((l) => l.id !== listId));
    } catch { toast.error("Failed"); }
  }

  async function togglePrivacy(list) {
    try {
      const newIsPublic = !list.isPublic;
      await updateDoc(doc(db, "lists", list.id), { isPublic: newIsPublic });
      setLists((prev) => prev.map((l) => l.id === list.id ? { ...l, isPublic: newIsPublic } : l));
      toast.success(newIsPublic
        ? (lang === "ar" ? "القائمة الآن عامة" : "List is now public")
        : (lang === "ar" ? "القائمة الآن خاصة" : "List is now private"));
    } catch { toast.error("Failed to update privacy"); }
  }

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page lists-page">
      <div className="section-header">
        <h1>{t("gameListsTitle")}</h1>
        {currentUser && (
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
            {showCreate ? t("cancel") : t("createList")}
          </button>
        )}
      </div>

      <div className="browse-tabs" style={{ marginTop: "1rem" }}>
        <button className={`tab-btn ${activeTab === "my" ? "active" : ""}`} onClick={() => setActiveTab("my")}>{t("myListsTab")}</button>
        <button className={`tab-btn ${activeTab === "public" ? "active" : ""}`} onClick={() => setActiveTab("public")}>{t("communityLists")}</button>
      </div>

      {showCreate && (
        <div className="review-form-card" style={{ marginTop: "1rem" }}>
          <h3>{t("createNewList")}</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>{t("listTitle")}</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder={t("listTitlePlaceholder")} />
            </div>
            <div className="form-group">
              <label>{t("listDescription")}</label>
              <textarea rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t("listDescPlaceholder")} />
            </div>
            <div className="form-group">
              <label className="privacy-toggle-label">
                <input
                  type="checkbox"
                  checked={newIsPrivate}
                  onChange={(e) => setNewIsPrivate(e.target.checked)}
                  style={{ marginRight: "0.5rem" }}
                />
                {newIsPrivate
                  ? <><Lock size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />{lang === "ar" ? "خاصة — فقط أنت تراها" : "Private — only you can see this"}</>
                  : <><Globe size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />{lang === "ar" ? "عامة — يراها الجميع" : "Public — visible to everyone"}</>
                }
              </label>
            </div>
            <button type="submit" className="btn-primary">{t("create")}</button>
          </form>
        </div>
      )}

      {lists.length === 0 ? (
        <div className="empty-state">
          <p>{activeTab === "my" ? t("noListsYet") : t("noCommunityLists")}</p>
        </div>
      ) : (
        <div className="lists-grid">
          {lists.map((list) => (
            <div key={list.id} className="list-card">
              <div className="list-card-header">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <h3>{list.title}</h3>
                  {!list.isPublic && (
                    <span className="list-privacy-badge private">
                      <Lock size={11} /> {lang === "ar" ? "خاصة" : "Private"}
                    </span>
                  )}
                </div>
                <span className="list-meta">by {list.username} — {list.games?.length || 0} {t("games")}</span>
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
                <Link to={`/list/${list.id}`} className="btn-ghost btn-sm">{t("view")}</Link>
                {currentUser?.uid === list.userId && (
                  <>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => togglePrivacy(list)}
                      title={list.isPublic ? (lang === "ar" ? "جعلها خاصة" : "Make private") : (lang === "ar" ? "جعلها عامة" : "Make public")}
                      style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      {list.isPublic
                        ? <><Globe size={13} /> {lang === "ar" ? "عامة" : "Public"}</>
                        : <><Lock size={13} /> {lang === "ar" ? "خاصة" : "Private"}</>
                      }
                    </button>
                    <button className="btn-ghost btn-sm danger" onClick={() => handleDelete(list.id)}>{t("delete")}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
