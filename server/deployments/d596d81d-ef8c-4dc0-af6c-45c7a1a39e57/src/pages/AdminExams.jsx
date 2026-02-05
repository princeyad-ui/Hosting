import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminExams.css";

const SERVER = "https://ai-proctor-2.onrender.com";

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // create exam
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passingMarks, setPassingMarks] = useState(0);

  // selected exam + questions
  const [selectedExam, setSelectedExam] = useState(null);
  const [questions, setQuestions] = useState([]);

  const navigate = useNavigate();

  function getToken() {
    return localStorage.getItem("token") || "";
  }

  // ───────────────────────────
  // LOAD EXAMS
  // ───────────────────────────
  async function loadExams() {
    try {
      setLoading(true);
      setError("");

      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${SERVER}/api/exams`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load exams");
      }

      setExams(data.exams || []);
    } catch (err) {
      console.error("loadExams error", err);
      setError(err.message || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadExams();
  }, []);

  // ───────────────────────────
  // CREATE EXAM
  // ───────────────────────────
  async function handleCreateExam(e) {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${SERVER}/api/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          durationMinutes: Number(durationMinutes) || 30,
          passingMarks: Number(passingMarks) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create exam");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setDurationMinutes(30);
      setPassingMarks(0);

      // reload + select this exam
      await loadExams();
      setSelectedExam(data.exam);
      setQuestions(data.exam.questions || []);
    } catch (err) {
      console.error("create exam error", err);
      setError(err.message || "Failed to create exam");
    }
  }

  // ───────────────────────────
  // DELETE EXAM
  // ───────────────────────────
  async function handleDeleteExam(examId) {
    const confirmDel = window.confirm(
      "Are you sure you want to delete this exam?"
    );
    if (!confirmDel) return;

    try {
      setError("");
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${SERVER}/api/exams/${examId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to delete exam");
      }

      // Remove from local list
      setExams((prev) => prev.filter((ex) => ex._id !== examId));

      // If we deleted the selected exam, clear right panel
      if (selectedExam && selectedExam._id === examId) {
        setSelectedExam(null);
        setQuestions([]);
      }

      alert("Exam deleted");
    } catch (err) {
      console.error("delete exam error", err);
      setError(err.message || "Failed to delete exam");
    }
  }

  // ───────────────────────────
  // SELECT EXAM
  // ───────────────────────────
  function handleSelectExam(exam) {
    setSelectedExam(exam);
    setQuestions(
      exam.questions && exam.questions.length
        ? exam.questions
        : [
            {
              text: "",
              options: ["", "", "", ""],
              correctIndex: 0,
            },
          ]
    );
  }

  // ───────────────────────────
  // QUESTION EDITOR FUNCTIONS
  // ───────────────────────────

  function updateQuestionText(index, value) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], text: value };
      return next;
    });
  }

  function updateOptionText(qIndex, optIndex, value) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[qIndex] };
      const opts = [...(q.options || ["", "", "", ""])];
      opts[optIndex] = value;
      q.options = opts;
      next[qIndex] = q;
      return next;
    });
  }

  function updateCorrectIndex(qIndex, value) {
    setQuestions((prev) => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], correctIndex: Number(value) };
      return next;
    });
  }

  function handleAddQuestion() {
    setQuestions((prev) => [
      ...prev,
      {
        text: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      },
    ]);
  }

  function handleRemoveQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  // ───────────────────────────
  // SAVE QUESTIONS
  // ───────────────────────────
  async function handleSaveQuestions() {
    if (!selectedExam) return;

    // Validation
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setError(`Question ${i + 1} text is required`);
        return;
      }
      if (!q.options || q.options.length < 2) {
        setError(`Question ${i + 1} needs at least 2 options`);
        return;
      }
      if (
        q.correctIndex == null ||
        q.correctIndex < 0 ||
        q.correctIndex >= q.options.length
      ) {
        setError(`Question ${i + 1}: correct option index is invalid`);
        return;
      }
    }

    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(
        `${SERVER}/api/exams/${selectedExam._id}/questions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questions }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save questions");
      }

      setSelectedExam(data.exam);
      setQuestions(data.exam.questions || []);
      alert("Questions saved successfully");
      loadExams();
    } catch (err) {
      console.error("save questions error", err);
      setError(err.message || "Failed to save questions");
    }
  }

  const examLink =
    selectedExam && selectedExam.linkCode
      ? `${window.location.origin}/exam/${selectedExam.linkCode}`
      : null;

  // ───────────────────────────
  // RENDER UI
  // ───────────────────────────

  return (
    <div className="admin-exams-page">
      {/* Header + link to email sender page */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h1 className="admin-exams-title">Conduct / Schedule Exams</h1>

        <button
          className="secondary-btn"
          onClick={() => navigate("/sendexamemail")}
        >
          Open Email Sender Page
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}

      <div className="admin-exams-layout">
        {/* LEFT COLUMN */}
        <div className="admin-exams-left">
          {/* CREATE EXAM */}
          <div className="panel">
            <h2 className="panel-title">Create New Exam</h2>

            <form onSubmit={handleCreateExam} className="form-vertical">
              <label className="field-label">
                Title <span className="req">*</span>
              </label>
              <input
                className="input-field"
                placeholder="e.g. DBMS Mid Term"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <label className="field-label">Description</label>
              <textarea
                className="textarea-field"
                placeholder="Short description for students"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="two-cols">
                <div>
                  <label className="field-label">Duration (minutes)</label>
                  <input
                    type="number"
                    className="input-field"
                    min="5"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                  />
                </div>

                <div>
                  <label className="field-label">Passing Marks</label>
                  <input
                    type="number"
                    className="input-field"
                    min="0"
                    value={passingMarks}
                    onChange={(e) => setPassingMarks(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="primary-btn full"
                disabled={loading}
              >
                {loading ? "Saving..." : "Create Exam"}
              </button>
            </form>
          </div>

          {/* EXAMS LIST */}
          <div className="panel">
            <div className="panel-header-row">
              <h2 className="panel-title">Existing Exams</h2>
              <button className="secondary-btn" onClick={loadExams}>
                Refresh
              </button>
            </div>

            {exams.length === 0 ? (
              <div className="muted">No exams created yet.</div>
            ) : (
              <ul className="exam-list">
                {exams.map((ex) => (
                  <li
                    key={ex._id}
                    className={
                      selectedExam && selectedExam._id === ex._id
                        ? "exam-list-item selected"
                        : "exam-list-item"
                    }
                    onClick={() => handleSelectExam(ex)}
                  >
                    <div className="exam-list-main">
                      <div className="exam-title">{ex.title}</div>
                      <div className="exam-meta">
                        {ex.totalQuestions || 0} questions •{" "}
                        {ex.durationMinutes || 30} min
                      </div>
                    </div>
                    <button
                      type="button"
                      className="small-danger-btn"
                      onClick={(e) => {
                        e.stopPropagation(); // prevent selecting exam
                        handleDeleteExam(ex._id);
                      }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="admin-exams-right">
          {!selectedExam ? (
            <div className="panel">
              <h2 className="panel-title">Question Builder</h2>
              <div className="muted">
                Select an exam on the left or create a new one to add
                questions.
              </div>
            </div>
          ) : (
            <div className="panel">
              <div className="panel-header-row">
                <div>
                  <h2 className="panel-title">
                    Questions — {selectedExam.title}
                  </h2>

                  {examLink && (
                    <div className="exam-link">
                      Student link:{" "}
                      <a href={examLink} target="_blank" rel="noreferrer">
                        {examLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="questions-scroll">
                {questions.map((q, qi) => (
                  <div key={qi} className="question-card">
                    <div className="question-header">
                      <div className="q-number">Q{qi + 1}</div>
                      <button
                        type="button"
                        className="small-danger-btn"
                        onClick={() => handleRemoveQuestion(qi)}
                      >
                        Remove
                      </button>
                    </div>

                    <label className="field-label">Question text</label>
                    <textarea
                      className="textarea-field"
                      placeholder="Enter question here"
                      value={q.text}
                      onChange={(e) =>
                        updateQuestionText(qi, e.target.value)
                      }
                    />

                    <label className="field-label">Options</label>
                    <div className="options-grid">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="option-row">
                          <span className="opt-label">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          <input
                            className="input-field"
                            placeholder={`Option ${oi + 1}`}
                            value={opt}
                            onChange={(e) =>
                              updateOptionText(qi, oi, e.target.value)
                            }
                          />
                        </div>
                      ))}
                    </div>

                    <div className="correct-row">
                      <label className="field-label">
                        Correct Option
                      </label>
                      <select
                        value={q.correctIndex}
                        onChange={(e) =>
                          updateCorrectIndex(qi, e.target.value)
                        }
                      >
                        {q.options.map((_, oi) => (
                          <option key={oi} value={oi}>
                            {String.fromCharCode(65 + oi)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="question-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleAddQuestion}
                >
                  + Add Question
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={handleSaveQuestions}
                >
                  Save Questions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
