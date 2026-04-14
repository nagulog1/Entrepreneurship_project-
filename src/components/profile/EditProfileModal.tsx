"use client";

import { useEffect, useState } from "react";

const AVATAR_OPTIONS = [
  "\u{1F9D1}\u200D\u{1F4BB}", "\u{1F469}\u200D\u{1F4BB}", "\u{1F9D1}\u200D\u{1F393}", "\u{1F469}\u200D\u{1F393}", "\u{1F9D1}\u200D\u{1F52C}", "\u{1F468}\u200D\u{1F52C}",
  "\u{1F9B8}", "\u{1F9B8}\u200D\u2640\uFE0F", "\u{1F9D9}", "\u{1F9D9}\u200D\u2640\uFE0F", "\u{1F977}", "\u{1F916}",
  "\u{1F98A}", "\u{1F43C}", "\u{1F981}", "\u{1F42F}", "\u{1F985}", "\u{1F98B}",
  "\u{1F31F}", "\u26A1", "\u{1F525}", "\u{1F48E}", "\u{1F3AF}", "\u{1F680}",
];

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    name: string;
    college: string;
    branch: string;
    year: string;
    bio: string;
    skills: string[];
    avatar?: string;
  };
  onSave: (data: EditProfileModalProps["initialData"]) => void;
}

export default function EditProfileModal({ isOpen, onClose, initialData, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState(initialData);
  const [skillInput, setSkillInput] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setSkillInput("");
      setShowAvatarPicker(false);
    }
  }, [isOpen, initialData]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  const avatarDisplay = formData.avatar || formData.name?.charAt(0) || "?";
  const isEmoji = formData.avatar && formData.avatar.length > 0;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: "90%", maxWidth: 500, padding: 32, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Edit Profile</h2>

        {/* Avatar Picker */}
        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: "1px solid #2A2A4A" }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 12, textTransform: "uppercase", fontWeight: 600 }}>Avatar</label>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              onClick={() => setShowAvatarPicker((v) => !v)}
              style={{
                width: 72, height: 72, borderRadius: "50%",
                background: "linear-gradient(135deg, #6C3BFF, #8B5CF6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: isEmoji ? 34 : 30, fontWeight: 700,
                border: showAvatarPicker ? "3px solid #6C3BFF" : "3px solid #6C3BFF55",
                cursor: "pointer", position: "relative", userSelect: "none", flexShrink: 0,
              }}
            >
              {avatarDisplay}
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, background: "#6C3BFF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, border: "2px solid #0D0D1A" }}>
                {"\u270F\uFE0F"}
              </div>
            </div>
            <div>
              <p style={{ color: "#F0F0FF", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{isEmoji ? "Avatar selected" : "No avatar selected"}</p>
              <button type="button" onClick={() => setShowAvatarPicker((v) => !v)} style={{ background: showAvatarPicker ? "#6C3BFF33" : "transparent", border: "1px solid #6C3BFF55", borderRadius: 8, color: "#8B5CF6", padding: "6px 14px", fontSize: 13, cursor: "pointer", fontWeight: 500 }}>
                {showAvatarPicker ? "Hide picker" : "Choose emoji"}
              </button>
              {isEmoji && (
                <button type="button" onClick={() => setFormData({ ...formData, avatar: "" })} style={{ marginLeft: 8, background: "transparent", border: "none", color: "#8B8BAD", fontSize: 12, cursor: "pointer", padding: 0 }}>Reset</button>
              )}
            </div>
          </div>
          {showAvatarPicker && (
            <div style={{ marginTop: 12, padding: 16, background: "#16213E", borderRadius: 12, border: "1px solid #2A2A4A", width: "100%" }}>
              <p style={{ fontSize: 12, color: "#8B8BAD", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>Choose an avatar</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {AVATAR_OPTIONS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => { setFormData({ ...formData, avatar: emoji }); setShowAvatarPicker(false); }}
                    style={{ width: "100%", aspectRatio: "1", borderRadius: 8, border: "2px solid", borderColor: formData.avatar === emoji ? "#6C3BFF" : "transparent", background: formData.avatar === emoji ? "#6C3BFF22" : "#0D0D1A", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>Full Name</label>
          <input type="text" className="input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Your name" style={{ width: "100%" }} />
        </div>

        {/* College */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>College/University</label>
          <input type="text" className="input" value={formData.college} onChange={(e) => setFormData({ ...formData, college: e.target.value })} placeholder="e.g., IIT Delhi" style={{ width: "100%" }} />
        </div>

        {/* Branch & Year */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>Branch</label>
            <input type="text" className="input" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} placeholder="e.g., CSE" style={{ width: "100%" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>Year</label>
            <select className="input" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} style={{ width: "100%" }}>
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>
        </div>

        {/* Bio */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>Bio</label>
          <textarea className="input" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." style={{ width: "100%", minHeight: 80, fontFamily: "inherit", resize: "vertical" }} />
        </div>

        {/* Skills */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>Skills</label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input type="text" className="input" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }} placeholder="Add a skill..." style={{ flex: 1 }} />
            <button type="button" className="btn-primary" onClick={handleAddSkill} style={{ padding: "10px 16px" }}>Add</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {formData.skills.map((skill) => (
              <div key={skill} className="tag" style={{ background: "#6C3BFF33", color: "#8B5CF6", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                {skill}
                <button type="button" onClick={() => handleRemoveSkill(skill)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, fontSize: 16, lineHeight: 1 }}>{"\u00D7"}</button>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
