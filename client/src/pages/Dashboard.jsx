import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import api from '../services/api.js';
import { listSyllabi } from '../services/syllabusService.js';
import { listQuestions } from '../services/questionService.js';
import { listRubrics } from '../services/rubricService.js';

function Dashboard() {
  const navigate = useNavigate();

  // Metrics
  const [stats, setStats] = useState({
    syllabiCount: 0,
    questionsCount: 0,
    approvedQuestionsCount: 0,
    rubricsCount: 0,
    approvedRubricsCount: 0,
  });

  const [recentSyllabi, setRecentSyllabi] = useState([]);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listSyllabi().catch(() => []),
      listQuestions().catch(() => []),
      listRubrics().catch(() => []),
      api.get('/health').then((r) => r.data?.data).catch(() => null),
    ])
      .then(([syllabi, questions, rubrics, health]) => {
        setStats({
          syllabiCount: syllabi.length,
          questionsCount: questions.length,
          approvedQuestionsCount: questions.filter((q) => q.status === 'approved').length,
          rubricsCount: rubrics.length,
          approvedRubricsCount: rubrics.filter((r) => r.approved).length,
        });
        setRecentSyllabi(syllabi.slice(0, 4));
        setRecentQuestions(questions.slice(0, 4));
        setHealthData(health);
      })
      .finally(() => setLoading(false));
  }, []);

  const WORKFLOW_STEPS = [
    {
      step: '01',
      title: 'Syllabus Extraction',
      description: 'Upload curriculum documents (PDF/DOCX) to automatically segment units and extract topics.',
      to: '/syllabus',
      color: 'bg-green/10 text-green border-green/20',
      action: 'Upload Syllabus',
    },
    {
      step: '02',
      title: 'Exam Blueprint',
      description: 'Allocate questions and marks across Bloom’s Taxonomy levels, difficulty tiers, and syllabus units.',
      to: '/blueprint',
      color: 'bg-aqua/20 text-navy border-aqua/40',
      action: 'Build Blueprint',
    },
    {
      step: '03',
      title: 'Question Bank',
      description: 'Generate curriculum-aligned draft questions, review pedagogical structure, and approve.',
      to: '/questions',
      color: 'bg-yellow/20 text-amber-900 border-yellow/40',
      action: 'Generate Questions',
    },
    {
      step: '04',
      title: 'Evaluation Rubric',
      description: 'Generate candidate concepts from reference answers and establish the immutable grading truth.',
      to: '/rubric',
      color: 'bg-mint text-green border-green/30',
      action: 'Configure Rubric',
    },
    {
      step: '05',
      title: 'Semantic Evaluation',
      description: 'Evaluate descriptive student responses using Sentence-Transformers with partial credit & feedback.',
      to: '/evaluate',
      color: 'bg-pink text-navy border-pink-dark/30',
      action: 'Evaluate Answers',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assessment Intelligence Dashboard"
        description="Unified platform for AI-assisted curriculum parsing, blueprint balancing, question paper generation, and explainable semantic answer evaluation."
        badge="Evalix Core Platform"
      />

      {/* System Health & Readiness Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-mint flex items-center justify-center text-green">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-navy flex items-center gap-2">
              System Architecture Status
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-mint text-green">
                Online
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Node.js Express + MongoDB Atlas + FastAPI NLP Microservice (Sentence-Transformers MiniLM-L6-v2)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-200">
            <span className="text-gray-400 mr-1.5">DB Status:</span>
            <span className="font-semibold text-green">
              {healthData?.services?.database === 'connected' ? 'Connected' : 'Active'}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-gray-200">
            <span className="text-gray-400 mr-1.5">NLP Engine:</span>
            <span className="font-semibold text-green">
              {healthData?.services?.nlpService === 'reachable' ? 'Ready' : 'Local Standby'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Syllabi Uploaded</span>
            <span className="p-1.5 rounded-lg bg-pink text-navy">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-navy mt-2">
            {loading ? '…' : stats.syllabiCount}
          </div>
          <div className="text-[11px] text-gray-400 mt-1">Curriculum topics extracted</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Total Questions</span>
            <span className="p-1.5 rounded-lg bg-yellow/20 text-amber-800">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-navy mt-2">
            {loading ? '…' : stats.questionsCount}
          </div>
          <div className="text-[11px] text-green font-medium mt-1">
            {stats.approvedQuestionsCount} Approved for exams
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Grading Rubrics</span>
            <span className="p-1.5 rounded-lg bg-mint text-green">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-navy mt-2">
            {loading ? '…' : stats.rubricsCount}
          </div>
          <div className="text-[11px] text-green font-medium mt-1">
            {stats.approvedRubricsCount} Verified Ground Truths
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Semantic Engine</span>
            <span className="p-1.5 rounded-lg bg-aqua/20 text-navy">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-navy mt-2">
            all-MiniLM
          </div>
          <div className="text-[11px] text-gray-400 mt-1">CPU Vectorized Inference</div>
        </div>
      </div>

      {/* End-to-End Workflow Pipeline Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold font-display text-navy">End-to-End Assessment Workflow</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Follow the academic workflow from curriculum extraction to explainable semantic evaluation.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.step}
              onClick={() => navigate(step.to)}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 flex flex-col justify-between hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${step.color}`}>
                    {step.step}
                  </span>
                  <span className="text-gray-300 group-hover:text-green transition-colors text-sm font-semibold">
                    →
                  </span>
                </div>
                <h4 className="text-sm font-bold text-navy group-hover:text-green transition-colors">
                  {step.title}
                </h4>
                <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 text-xs font-semibold text-green flex items-center gap-1">
                <span>{step.action}</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Syllabi */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h4 className="text-sm font-bold text-navy flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green" />
              Recent Curriculum Syllabi
            </h4>
            <button
              onClick={() => navigate('/syllabus')}
              className="text-xs font-semibold text-green hover:underline"
            >
              View All
            </button>
          </div>

          {recentSyllabi.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4">No syllabi uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentSyllabi.map((s) => (
                <div
                  key={s._id}
                  onClick={() => navigate('/syllabus')}
                  className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-slate-50 transition-all flex items-center justify-between text-xs cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-navy">{s.title}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {s.units?.length || 0} Units · {s.originalFileName}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-mint text-green">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Questions */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <h4 className="text-sm font-bold text-navy flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow" />
              Recent Generated Questions
            </h4>
            <button
              onClick={() => navigate('/questions')}
              className="text-xs font-semibold text-green hover:underline"
            >
              View Bank
            </button>
          </div>

          {recentQuestions.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4">No questions generated yet.</p>
          ) : (
            <div className="space-y-3">
              {recentQuestions.map((q) => (
                <div
                  key={q._id}
                  onClick={() => navigate('/questions')}
                  className="p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-slate-50 transition-all flex items-center justify-between text-xs cursor-pointer gap-2"
                >
                  <div className="truncate flex-1">
                    <div className="font-medium text-navy truncate">{q.text}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      [{q.topicName}] · {q.bloomLevel} · {q.marks}m
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      q.status === 'approved'
                        ? 'bg-mint text-green'
                        : 'bg-yellow/20 text-amber-800'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
