import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import { listSyllabi } from '../services/syllabusService.js';
import { generateBlueprint } from '../services/blueprintService.js';
import { getErrorMessage } from '../services/api.js';

const DEFAULT_DIFFICULTY = { easy: 40, medium: 40, hard: 20 };
const DEFAULT_BLOOM = { remember: 20, understand: 25, apply: 25, analyze: 20, evaluate: 10, create: 0 };

function equalWeightage(units) {
  if (units.length === 0) return [];
  const each = Math.round((100 / units.length) * 100) / 100;
  return units.map((u, i) => ({
    unitNumber: u.unitNumber,
    title: u.title,
    weightage: i === units.length - 1 ? Math.round((100 - each * (units.length - 1)) * 100) / 100 : each,
  }));
}

function Blueprint() {
  const navigate = useNavigate();
  const [syllabi, setSyllabi] = useState([]);
  const [syllabiLoading, setSyllabiLoading] = useState(true);
  const [syllabiError, setSyllabiError] = useState('');
  const [selectedSyllabusId, setSelectedSyllabusId] = useState('');

  const [unitWeights, setUnitWeights] = useState([]);
  const [totalMarks, setTotalMarks] = useState(100);
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [difficulty, setDifficulty] = useState(DEFAULT_DIFFICULTY);
  const [bloom, setBloom] = useState(DEFAULT_BLOOM);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [blueprint, setBlueprint] = useState(null);

  useEffect(() => {
    listSyllabi()
      .then(setSyllabi)
      .catch((err) => setSyllabiError(getErrorMessage(err)))
      .finally(() => setSyllabiLoading(false));
  }, []);

  const selectedSyllabus = syllabi.find((s) => s._id === selectedSyllabusId);

  function handleSelectSyllabus(id) {
    setSelectedSyllabusId(id);
    setBlueprint(null);
    setGenerateError('');
    const syllabus = syllabi.find((s) => s._id === id);
    setUnitWeights(equalWeightage(syllabus?.units || []));
  }

  function updateWeight(index, value) {
    setUnitWeights((prev) => prev.map((u, i) => (i === index ? { ...u, weightage: Number(value) } : u)));
  }

  function updateDifficulty(key, value) {
    setDifficulty((prev) => ({ ...prev, [key]: Number(value) }));
  }

  function updateBloom(key, value) {
    setBloom((prev) => ({ ...prev, [key]: Number(value) }));
  }

  const unitSum = unitWeights.reduce((s, u) => s + (u.weightage || 0), 0);
  const difficultySum = Object.values(difficulty).reduce((s, v) => s + v, 0);
  const bloomSum = Object.values(bloom).reduce((s, v) => s + v, 0);

  async function handleGenerate(e) {
    e.preventDefault();
    if (unitWeights.length === 0) {
      setGenerateError('Select a syllabus with at least one unit first.');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    setBlueprint(null);
    try {
      const result = await generateBlueprint({
        totalMarks: Number(totalMarks),
        totalQuestions: Number(totalQuestions),
        units: unitWeights,
        difficultyDistribution: difficulty,
        bloomDistribution: bloom,
        syllabusId: selectedSyllabusId || undefined,
      });
      setBlueprint(result);
    } catch (err) {
      setGenerateError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Question Paper Blueprint"
        description="Select a syllabus and configure how marks and questions should be allocated across units, difficulty tiers, and Bloom's taxonomy levels using deterministic largest-remainder distribution."
        badge="Step 2 · Curriculum Blueprint"
      />

      <form onSubmit={handleGenerate} className="rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 bg-white dark:bg-[#161F1F] p-6 mb-8 space-y-6 shadow-sm dark:shadow-card-dark transition-colors">
        {/* Syllabus selection */}
        <div>
          <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-1.5">Syllabus</label>
          {syllabiLoading && <p className="text-xs text-brand-granite dark:text-brand-lilac/70">Loading syllabi…</p>}
          {syllabiError && <p className="text-xs text-red-500">{syllabiError}</p>}
          {!syllabiLoading && !syllabiError && syllabi.length === 0 && (
            <p className="text-xs text-brand-granite italic">
              No syllabi found. Upload one on the <span className="font-semibold text-brand-charcoal dark:text-brand-ice">Syllabus</span> page first.
            </p>
          )}
          {!syllabiLoading && !syllabiError && syllabi.length > 0 && (
            <select
              value={selectedSyllabusId}
              onChange={(e) => handleSelectSyllabus(e.target.value)}
              className="w-full max-w-md border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-[#131A1A] text-brand-carbon dark:text-brand-silk rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-lilac/40"
            >
              <option value="">Select a syllabus…</option>
              {syllabi.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Unit weightage */}
        {unitWeights.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-2">
              Unit Weightage (%) — sum: <span className="font-mono text-brand-carbon dark:text-brand-silk">{unitSum.toFixed(1)}%</span>
            </label>
            <div className="space-y-2">
              {unitWeights.map((u, i) => (
                <div key={u.unitNumber} className="flex items-center gap-3 p-2 rounded-xl bg-brand-silk/15 dark:bg-[#131A1A] border border-gray-100 dark:border-brand-charcoal/40">
                  <span className="text-xs font-medium text-brand-carbon dark:text-brand-silk flex-1">
                    Unit {u.unitNumber}: {u.title}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={u.weightage}
                      onChange={(e) => updateWeight(i, e.target.value)}
                      className="w-20 border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-brand-carbon text-brand-carbon dark:text-brand-silk rounded-lg px-2 py-1 text-xs text-right"
                    />
                    <span className="text-xs text-brand-granite">%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-1.5">Total Marks</label>
            <input
              type="number"
              min="1"
              value={totalMarks}
              onChange={(e) => setTotalMarks(e.target.value)}
              className="w-full border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-[#131A1A] text-brand-carbon dark:text-brand-silk rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-lilac/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-1.5">Total Questions</label>
            <input
              type="number"
              min="1"
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(e.target.value)}
              className="w-full border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-[#131A1A] text-brand-carbon dark:text-brand-silk rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-lilac/40"
            />
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-2">
            Difficulty Distribution (%) — sum: <span className="font-mono text-brand-carbon dark:text-brand-silk">{difficultySum.toFixed(1)}%</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.keys(difficulty).map((key) => (
              <div key={key} className="p-2.5 rounded-xl bg-brand-silk/15 dark:bg-[#131A1A] border border-gray-100 dark:border-brand-charcoal/40">
                <span className="block text-[11px] font-semibold text-brand-granite dark:text-brand-lilac/70 capitalize mb-1">{key}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={difficulty[key]}
                  onChange={(e) => updateDifficulty(key, e.target.value)}
                  className="w-full border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-brand-carbon text-brand-carbon dark:text-brand-silk rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bloom */}
        <div>
          <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-2">
            Bloom's Taxonomy Distribution (%) — sum: <span className="font-mono text-brand-carbon dark:text-brand-silk">{bloomSum.toFixed(1)}%</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
            {Object.keys(bloom).map((key) => (
              <div key={key} className="p-2.5 rounded-xl bg-brand-silk/15 dark:bg-[#131A1A] border border-gray-100 dark:border-brand-charcoal/40">
                <span className="block text-[11px] font-semibold text-brand-granite dark:text-brand-lilac/70 capitalize mb-1">{key}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bloom[key]}
                  onChange={(e) => updateBloom(key, e.target.value)}
                  className="w-full border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-brand-carbon text-brand-carbon dark:text-brand-silk rounded-lg px-2.5 py-1 text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-charcoal hover:bg-brand-carbon text-white text-xs font-semibold shadow-md shadow-brand-charcoal/30 border border-brand-charcoal/60 hover:border-brand-ice/60 transition-all disabled:opacity-50 w-full sm:w-auto"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-4 w-4 text-brand-ice" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Generating Blueprint…
            </>
          ) : (
            'Generate Blueprint'
          )}
        </button>
        {generateError && <p className="text-xs text-red-500 font-medium">{generateError}</p>}
      </form>

      {/* Result */}
      {blueprint && (
        <div className="rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 bg-white dark:bg-[#161F1F] p-6 shadow-sm dark:shadow-card-dark transition-colors">
          <h3 className="text-sm font-bold text-brand-carbon dark:text-brand-silk mb-1">Generated Blueprint</h3>
          <p className="text-xs text-brand-granite dark:text-brand-lilac/70 mb-4">
            {selectedSyllabus ? `For syllabus: ${selectedSyllabus.title}` : 'No syllabus linked'} · Total Marks:{' '}
            {blueprint.totalMarks} · Total Questions: {blueprint.totalQuestions}
          </p>

          {blueprint.warnings?.length > 0 && (
            <div className="mb-4 rounded-xl bg-amber-500/15 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
              {blueprint.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          {[
            { label: 'Unit-wise Allocation', rows: blueprint.units, nameKey: 'title', prefix: 'Unit' },
            { label: 'Difficulty Allocation', rows: blueprint.difficulty, nameKey: 'label' },
            { label: "Bloom's Level Allocation", rows: blueprint.bloom, nameKey: 'label' },
          ].map((section) => (
            <div key={section.label} className="mb-6 last:mb-0">
              <h4 className="text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 uppercase tracking-wide mb-2">{section.label}</h4>
              <div className="overflow-x-auto border border-gray-100 dark:border-brand-charcoal/40 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-brand-silk/30 dark:bg-brand-carbon text-left text-brand-granite dark:text-brand-lilac uppercase font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Name</th>
                      <th className="px-3.5 py-2.5">%</th>
                      <th className="px-3.5 py-2.5">Questions</th>
                      <th className="px-3.5 py-2.5">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-brand-charcoal/30">
                    {(section.rows || []).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-brand-charcoal/20 transition-colors">
                        <td className="px-3.5 py-2.5 text-brand-carbon dark:text-brand-silk font-medium">
                          {section.prefix ? `${section.prefix} ${row.unitNumber}: ` : ''}
                          {row[section.nameKey]}
                        </td>
                        <td className="px-3.5 py-2.5 text-brand-granite dark:text-brand-lilac/70">{row.percentage}%</td>
                        <td className="px-3.5 py-2.5 text-brand-granite dark:text-brand-lilac/70">{row.questionCount}</td>
                        <td className="px-3.5 py-2.5 text-brand-granite dark:text-brand-lilac/70">{row.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-brand-charcoal/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-brand-granite dark:text-brand-lilac/70">
              Blueprint verified and persisted. Ready for curriculum question generation.
            </span>
            <button
              onClick={() => navigate('/questions')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-charcoal hover:bg-brand-carbon text-white text-xs font-semibold shadow-sm border border-brand-charcoal/60 hover:border-brand-ice/60 transition-all"
            >
              <span>Proceed to Question Bank</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Blueprint;
