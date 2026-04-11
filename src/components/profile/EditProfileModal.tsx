"use client";

import { useEffect, useState } from "react";

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
  };
  onSave: (data: EditProfileModalProps["initialData"]) => void;
}

export default function EditProfileModal({ isOpen, onClose, initialData, onSave }: EditProfileModalProps) {
  const [formData, setFormData] = useState(initialData);
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
      setSkillInput("");
    }
  }, [isOpen, initialData]);

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((s) => s !== skill),
    });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "90%",
          maxWidth: 500,
          padding: 32,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
          Edit Profile
        </h2>

        {/* Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>
            Full Name
          </label>
          <input
            type="text"
            className="input"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Your name"
            style={{ width: "100%" }}
          />
        </div>

        {/* College */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>
            College/University
          </label>
          <input
            type="text"
            className="input"
            value={formData.college}
            onChange={(e) => setFormData({ ...formData, college: e.target.value })}
            placeholder="e.g., IIT Delhi"
            style={{ width: "100%" }}
          />
        </div>

        {/* Branch & Year */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>
              Branch
            </label>
            <input
              type="text"
              className="input"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              placeholder="e.g., CSE"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>
              Year
            </label>
            <select
              className="input"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              style={{ width: "100%" }}
            >
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>
        </div>

        {/* Bio */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>
            Bio
          </label>
          <textarea
            className="input"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            style={{ width: "100%", minHeight: 80, fontFamily: "inherit", resize: "vertical" }}
          />
        </div>

        {/* Skills */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", fontSize: 12, color: "#8B8BAD", marginBottom: 6, textTransform: "uppercase", fontWeight: 600 }}>
            Skills
          </label>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              className="input"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="Add a skill..."
              style={{ flex: 1 }}
            />
            <button type="button" className="btn-primary" onClick={handleAddSkill} style={{ padding: "10px 16px" }}>
              Add
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {formData.skills.map((skill) => (
              <div
                key={skill}
                className="tag"
                style={{
                  background: "#6C3BFF33",
                  color: "#8B5CF6",
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 16,
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
