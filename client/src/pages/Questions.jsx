import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import {
  generateQuestions,
  listQuestions,
  updateQuestion,
  deleteQuestion,
  approveQuestion,
} from '../services/questionService.js';
import { listSyllabi } from '../services/syllabusService.js';
import { getErrorMessage } from '../services/api.js';

const BLOOM_LEVELS = [
  { value: 'remember', label: 'Remember (Level 1)', desc: 'Define, list, recall facts' },
  { value: 'understand', label: 'Understand (Level 2)', desc: 'Explain, describe, summarize' },
  { value: 'apply', label: 'Apply (Level 3)', desc: 'Illustrate, implement, solve' },
  { value: 'analyze', label: 'Analyze (Level 4)', desc: 'Compare, contrast, deconstruct' },
  { value: 'evaluate', label: 'Evaluate (Level 5)', desc: 'Assess, critique, justify' },
  { value: 'create', label: 'Create (Level 6)', desc: 'Design, formulate, construct' },
];

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function Questions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Data states
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  // Syllabus helper for topic selection
  const [syllabi, setSyllabi] = useState([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState('');

  // Form states
  const [topicName, setTopicName] = useState(searchParams.get('topic') || '');
  const [bloomLevel, setBloomLevel] = useState('understand');
  const [difficulty, setDifficulty] = useState('medium');
  const [marks, setMarks] = useState(5);
  const [questionCount, setQuestionCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateWarnings, setGenerateWarnings] = useState([]);

  // Filtering & search
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editMarks, setEditMarks] = useState(5);
  const [editDifficulty, setEditDifficulty] = useState('medium');
  const [editBloom, setEditBloom] = useState('understand');
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionError, setActionError] = useState('');

  function fetchQuestions() {
    setLoading(true);
    setListError('');
    listQuestions()
      .then((data) => setQuestions(data || []))
      .catch((err) => setListError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchQuestions();
    listSyllabi()
      .then((data) => setSyllabi(data || []))
      .catch(() => {});
  }, []);

  // When a syllabus is chosen, auto-fill topic dropdown
  const selectedSyllabus = syllabi.find((s) => s._id === selectedSyllabusId);
  const availableTopics = selectedSyllabus
    ? selectedSyllabus.units.flatMap((u) => u.topics)
    : [];

  async function handleGenerate(e) {
    e.preventDefault();
    if (!topicName.trim()) {
      setGenerateError('Please enter or select a topic name.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    setGenerateWarnings([]);
    setActionError('');

    try {
      const existingForTopic = questions.filter(
        (q) =>
          q.topicName?.toLowerCase() === topicName.trim().toLowerCase() &&
          q.bloomLevel?.toLowerCase() === bloomLevel.toLowerCase() &&
          q.difficulty?.toLowerCase() === difficulty.toLowerCase() &&
          Number(q.marks) === Number(marks)
      ).length;

      const requests = Array.from({ length: Number(questionCount) }, (_, idx) => ({
        topicId: topicName.toLowerCase().replace(/\s+/g, '_'),
        topic: topicName.trim(),
        topicName: topicName.trim(),
        bloomLevel,
        difficulty,
        marks: Number(marks),
        questionType: 'descriptive',
        variantIndex: existingForTopic + idx,
      }));

      const result = await generateQuestions({ requests });
      if (result.warnings?.length) {
        setGenerateWarnings(result.warnings);
      }
      await fetchQuestions();
    } catch (err) {
      setGenerateError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(id) {
    setActionError('');
    try {
      await approveQuestion(id);
      setQuestions((prev) =>
        prev.map((q) => (q._id === id ? { ...q, status: 'approved' } : q))
      );
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    setActionError('');
    try {
      await deleteQuestion(id);
      setQuestions((prev) => prev.filter((q) => q._id !== id));
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  }

  function startEdit(question) {
    setEditingId(question._id);
    setEditText(question.text);
    setEditMarks(question.marks);
    setEditDifficulty(question.difficulty);
    setEditBloom(question.bloomLevel);
  }

  async function saveEdit(id) {
    setSavingEdit(true);
    setActionError('');
    try {
      const updated = await updateQuestion(id, {
        text: editText,
        marks: Number(editMarks),
        difficulty: editDifficulty,
        bloomLevel: editBloom,
      });
      setQuestions((prev) => prev.map((q) => (q._id === id ? updated : q)));
      setEditingId(null);
    } catch (err) {
      setActionError(getErrorMessage(err));
    } finally {
      setSavingEdit(false);
    }
  }

  // Filtered view
  const filteredQuestions = questions.filter((q) => {
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.text?.toLowerCase().includes(query);
      const matchTopic = q.topicName?.toLowerCase().includes(query);
      if (!matchText && !matchTopic) return false;
    }
    return true;
  });

  const totalCount = questions.length;
  const draftCount = questions.filter((q) => q.status === 'draft').length;
  const approvedCount = questions.filter((q) => q.status === 'approved').length;

  return (
    <div>
      <PageHeader
        title="Question Bank & Generation"
        description="Generate curriculum-aligned exam questions using Bloom's Taxonomy and difficulty tiers. Review, customize, and approve them before creating evaluation rubrics."
        badge="Phase 8 Step 3"
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Total Questions</div>
          <div className="text-2xl font-bold font-display text-navy mt-1">{totalCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
          <div className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Drafts (Need Approval)
          </div>
          <div className="text-2xl font-bold font-display text-amber-700 mt-1">{draftCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
          <div className="text-xs text-green font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green" /> Approved Questions
          </div>
          <div className="text-2xl font-bold font-display text-green mt-1">{approvedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Active Syllabi</div>
          <div className="text-2xl font-bold font-display text-navy mt-1">{syllabi.length}</div>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="text-xs font-semibold text-red-500 hover:text-red-800">
            Dismiss
          </button>
        </div>
      )}

      {/* Question Generator Form */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6 mb-10">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-navy flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow" />
              Generate Draft Questions
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Deterministic NLP templates create questions with verified pedagogical structure.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-5">
          {/* Syllabus & Topic picker */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Load Topic from Syllabus (Optional)
              </label>
              <select
                value={selectedSyllabusId}
                onChange={(e) => {
                  setSelectedSyllabusId(e.target.value);
                  const syl = syllabi.find((s) => s._id === e.target.value);
                  if (syl?.units?.[0]?.topics?.[0]) {
                    setTopicName(syl.units[0].topics[0]);
                  }
                }}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/30 bg-slate-50/50"
              >
                <option value="">Choose a syllabus to browse topics…</option>
                {syllabi.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Topic Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                list={availableTopics.length > 0 ? 'available-topics-list' : undefined}
                placeholder="e.g. Supervised Learning, Backpropagation, Gradient Descent"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/30 bg-white"
              />
              {availableTopics.length > 0 && (
                <>
                  <datalist id="available-topics-list" style={{ display: 'none' }}>
                    {availableTopics.map((t, idx) => (
                      <option key={idx} value={t} />
                    ))}
                  </datalist>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[11px] text-gray-400">Suggested:</span>
                    {availableTopics.slice(0, 5).map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTopicName(t)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-lg border transition-all ${
                          topicName === t
                            ? 'bg-green/15 text-green-800 border-green/40 font-semibold'
                            : 'bg-slate-50 hover:bg-slate-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bloom, Difficulty, Marks, Count */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Bloom's Taxonomy Level
              </label>
              <select
                value={bloomLevel}
                onChange={(e) => setBloomLevel(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/30 capitalize"
              >
                {BLOOM_LEVELS.map((b) => (
                  <option key={b.value} value={b.value}>
                    {b.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/30 capitalize"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Target Marks
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-xs text-gray-500">
              Generated questions start in <span className="font-semibold text-amber-600">Draft</span> status and
              require teacher approval before exam publication.
            </div>

            <button
              type="submit"
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-green hover:bg-green-dark text-white text-sm font-semibold shadow-md shadow-green/20 transition-all disabled:opacity-50 w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Generating {Number(questionCount) > 1 ? `${questionCount} Questions` : 'Question'}…
                </>
              ) : (
                `Generate ${Number(questionCount) > 1 ? `${questionCount} Questions` : 'Question'}`
              )}
            </button>
          </div>

          {generateError && <p className="text-sm text-red-600 mt-2 font-medium">{generateError}</p>}

          {generateWarnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <span className="font-semibold">Generation Notice:</span>
              {generateWarnings.map((w, idx) => (
                <div key={idx}>• {w}</div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Questions Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">Status:</span>
          {['all', 'draft', 'approved'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-navy text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {st}
            </button>
          ))}

          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-3 mr-1">Difficulty:</span>
          {['all', 'easy', 'medium', 'hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => setFilterDifficulty(diff)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterDifficulty === diff
                  ? 'bg-navy text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search by topic or text…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green/30 bg-white"
          />
        </div>
      </div>

      {/* Questions List */}
      <div>
        {loading && (
          <div className="p-12 text-center text-sm text-gray-500">
            <svg className="animate-spin mx-auto h-6 w-6 text-green mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading questions repository…
          </div>
        )}

        {listError && (
          <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {listError}
          </div>
        )}

        {!loading && !listError && filteredQuestions.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gray-300/80 p-12 text-center bg-white/60">
            <div className="w-12 h-12 rounded-full bg-pink flex items-center justify-center mx-auto mb-3 text-navy">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-navy">No questions match your filter</h4>
            <p className="text-xs text-gray-500 mt-1">Generate a question above or adjust your search filters.</p>
          </div>
        )}

        {!loading && !listError && filteredQuestions.length > 0 && (
          <div className="space-y-4">
            {filteredQuestions.map((q) => (
              <div
                key={q._id}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md transition-all p-5"
              >
                {/* Top badges */}
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-pink text-navy border border-pink-dark/20">
                      Topic: {q.topicName}
                    </span>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-lg bg-aqua/20 text-navy capitalize">
                      Bloom: {q.bloomLevel}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize ${
                        q.difficulty === 'easy'
                          ? 'bg-mint text-green'
                          : q.difficulty === 'medium'
                          ? 'bg-yellow/20 text-amber-800'
                          : 'bg-navy/10 text-navy font-semibold'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-gray-700">
                      {q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}
                    </span>
                  </div>

                  <div>
                    {q.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-mint text-green border border-green/20">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Approved
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-yellow/20 text-amber-800 border border-yellow/40">
                        Draft (Needs Review)
                      </span>
                    )}
                  </div>
                </div>

                {/* Question body / editor */}
                {editingId === q._id ? (
                  <div className="space-y-3 my-3 p-4 bg-slate-50 rounded-xl border border-gray-200">
                    <label className="block text-xs font-semibold text-gray-600">Question Text</label>
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Marks</label>
                        <input
                          type="number"
                          value={editMarks}
                          onChange={(e) => setEditMarks(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Difficulty</label>
                        <select
                          value={editDifficulty}
                          onChange={(e) => setEditDifficulty(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm capitalize"
                        >
                          {DIFFICULTIES.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Bloom Level</label>
                        <select
                          value={editBloom}
                          onChange={(e) => setEditBloom(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm capitalize"
                        >
                          {BLOOM_LEVELS.map((b) => (
                            <option key={b.value} value={b.value}>
                              {b.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => saveEdit(q._id)}
                        disabled={savingEdit}
                        className="px-4 py-1.5 rounded-lg bg-green text-white text-xs font-semibold hover:bg-green-dark"
                      >
                        {savingEdit ? 'Saving…' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-base font-medium text-navy my-3 leading-relaxed">{q.text}</p>
                )}

                {/* Bottom actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-2 flex-wrap gap-2">
                  <div className="text-[11px] text-gray-400">
                    Created: {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '—'}
                  </div>

                  <div className="flex items-center gap-2">
                    {q.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(q._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mint text-green hover:bg-green hover:text-white border border-green/30 text-xs font-semibold transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Approve Question
                      </button>
                    )}

                    <button
                      onClick={() =>
                        navigate(`/rubric?questionId=${q._id}&marks=${q.marks}&text=${encodeURIComponent(q.text)}`)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow/20 hover:bg-yellow hover:text-navy text-navy text-xs font-semibold transition-all border border-yellow/40"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Create Rubric
                    </button>

                    {editingId !== q._id && (
                      <button
                        onClick={() => startEdit(q)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-navy hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(q._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Questions;
