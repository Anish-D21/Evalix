import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import BrandLogo from '../components/BrandLogo.jsx';
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
      badgeColor: 'bg-brand-lilac/30 text-brand-carbon dark:text-brand-silk border-brand-lilac/50',
      action: 'Upload Syllabus',
      icon: (
        <svg className="w-5 h-5 text-brand-lilac" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      step: '02',
      title: 'Exam Blueprint',
      description: 'Allocate questions and marks across Bloom’s Taxonomy levels, difficulty tiers, and syllabus units.',
      to: '/blueprint',
      badgeColor: 'bg-brand-charcoal/40 text-brand-carbon dark:text-brand-silk border-brand-charcoal/60',
      action: 'Build Blueprint',
      icon: (
        <svg className="w-5 h-5 text-brand-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      step: '03',
      title: 'Question Bank',
      description: 'Generate curriculum-aligned draft questions, review pedagogical structure, and approve.',
      to: '/questions',
      badgeColor: 'bg-brand-silk/30 text-brand-carbon dark:text-brand-silk border-brand-silk/60',
      action: 'Generate Questions',
      icon: (
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      step: '04',
      title: 'Evaluation Rubric',
      description: 'Generate candidate concepts from reference answers and establish the immutable grading truth.',
      to: '/rubric',
      badgeColor: 'bg-brand-lilac/40 text-brand-carbon dark:text-brand-silk border-brand-lilac/70',
      action: 'Configure Rubric',
      icon: (
        <svg className="w-5 h-5 text-brand-lilac" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      step: '05',
      title: 'Semantic Evaluation',
      description: 'Evaluate descriptive student responses using Sentence-Transformers with partial credit & feedback.',
      to: '/evaluate',
      badgeColor: 'bg-gradient-to-r from-brand-charcoal to-brand-carbon text-brand-ice border-brand-ice/50 shadow-glow-ice',
      action: 'Evaluate Answers',
      icon: (
        <svg className="w-5 h-5 text-brand-ice" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assessment Intelligence Dashboard"
        description="Unified platform for AI-assisted curriculum parsing, blueprint balancing, question paper generation, and explainable semantic answer evaluation."
        badge="Evalix Core Platform"
      />

      {/* Hero / System Health & Architecture Banner */}
      <div className="mb-8 p-5 rounded-2xl bg-white dark:bg-[#161F1F] border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-4">
          <BrandLogo variant="mark" size="md" />
          <div>
            <div className="text-sm font-bold text-brand-carbon dark:text-brand-silk flex items-center gap-2">
              System Architecture Status
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </div>
            <div className="text-xs text-brand-granite dark:text-brand-lilac/75 mt-0.5">
              Node.js Express · MongoDB Atlas · FastAPI NLP Microservice (Sentence-Transformers MiniLM-L6-v2)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-brand-silk/20 dark:bg-brand-carbon/80 border border-brand-charcoal/20 dark:border-brand-charcoal/50">
            <span className="text-brand-granite dark:text-brand-lilac/70 mr-1.5">DB Status:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {healthData?.services?.database === 'connected' ? 'Connected' : 'Active'}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-brand-silk/20 dark:bg-brand-carbon/80 border border-brand-charcoal/20 dark:border-brand-charcoal/50">
            <span className="text-brand-granite dark:text-brand-lilac/70 mr-1.5">NLP Engine:</span>
            <span className="font-semibold text-brand-charcoal dark:text-brand-ice">
              {healthData?.services?.nlpService === 'reachable' ? 'Ready' : 'Local Standby'}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-[#161F1F] p-5 rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark hover:-translate-y-1 hover:border-brand-lilac/50 transition-all duration-300 group">
          <div className="flex items-center justify-between text-xs text-brand-granite dark:text-brand-lilac/80 font-medium">
            <span>Syllabi Uploaded</span>
            <span className="p-2 rounded-xl bg-brand-silk/40 dark:bg-brand-charcoal/40 text-brand-carbon dark:text-brand-silk group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-brand-carbon dark:text-brand-silk mt-2">
            {loading ? '…' : stats.syllabiCount}
          </div>
          <div className="text-[11px] text-brand-granite dark:text-brand-lilac/70 mt-1">Curriculum topics extracted</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-[#161F1F] p-5 rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark hover:-translate-y-1 hover:border-brand-lilac/50 transition-all duration-300 group">
          <div className="flex items-center justify-between text-xs text-brand-granite dark:text-brand-lilac/80 font-medium">
            <span>Total Questions</span>
            <span className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-brand-carbon dark:text-brand-silk mt-2">
            {loading ? '…' : stats.questionsCount}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            {stats.approvedQuestionsCount} Approved for exams
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-[#161F1F] p-5 rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark hover:-translate-y-1 hover:border-brand-lilac/50 transition-all duration-300 group">
          <div className="flex items-center justify-between text-xs text-brand-granite dark:text-brand-lilac/80 font-medium">
            <span>Grading Rubrics</span>
            <span className="p-2 rounded-xl bg-brand-lilac/30 text-brand-carbon dark:text-brand-silk group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-brand-carbon dark:text-brand-silk mt-2">
            {loading ? '…' : stats.rubricsCount}
          </div>
          <div className="text-[11px] text-brand-charcoal dark:text-brand-ice font-medium mt-1">
            {stats.approvedRubricsCount} Verified Ground Truths
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-[#161F1F] p-5 rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark hover:-translate-y-1 hover:border-brand-ice/50 transition-all duration-300 group">
          <div className="flex items-center justify-between text-xs text-brand-granite dark:text-brand-lilac/80 font-medium">
            <span>Semantic Engine</span>
            <span className="p-2 rounded-xl bg-brand-charcoal/40 text-brand-ice group-hover:scale-110 transition-transform">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </span>
          </div>
          <div className="text-3xl font-extrabold font-display text-brand-carbon dark:text-brand-silk mt-2">
            all-MiniLM
          </div>
          <div className="text-[11px] text-brand-granite dark:text-brand-lilac/70 mt-1">CPU Vectorized Inference</div>
        </div>
      </div>

      {/* End-to-End Workflow Pipeline Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold font-display text-brand-carbon dark:text-brand-silk">
              End-to-End Assessment Workflow
            </h3>
            <p className="text-xs text-brand-granite dark:text-brand-lilac/80 mt-0.5">
              Follow the academic workflow from curriculum extraction to explainable semantic evaluation.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.step}
              onClick={() => navigate(step.to)}
              className="bg-white dark:bg-[#161F1F] rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark p-5 flex flex-col justify-between hover:shadow-md hover:border-brand-lilac/60 dark:hover:border-brand-ice/50 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${step.badgeColor} badge-shimmer-effect`}>
                    {step.step}
                  </span>
                  <span className="p-1 rounded-lg text-brand-granite group-hover:text-brand-ice group-hover:translate-x-1 transition-all duration-200">
                    {step.icon}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-brand-carbon dark:text-brand-silk group-hover:text-brand-charcoal dark:group-hover:text-brand-ice transition-colors">
                  {step.title}
                </h4>
                <p className="text-xs text-brand-granite dark:text-brand-lilac/75 mt-1.5 leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-brand-charcoal/40 text-xs font-semibold text-brand-charcoal dark:text-brand-ice flex items-center justify-between group-hover:translate-x-0.5 transition-transform">
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
        <div className="bg-white dark:bg-[#161F1F] rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark p-6 transition-colors">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-brand-charcoal/40">
            <h4 className="text-sm font-bold text-brand-carbon dark:text-brand-silk flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-charcoal dark:bg-brand-ice" />
              Recent Curriculum Syllabi
            </h4>
            <button
              onClick={() => navigate('/syllabus')}
              className="text-xs font-semibold text-brand-charcoal dark:text-brand-ice hover:underline"
            >
              View All
            </button>
          </div>

          {recentSyllabi.length === 0 ? (
            <p className="text-xs text-brand-granite dark:text-brand-lilac/60 italic py-4">No syllabi uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {recentSyllabi.map((s) => (
                <div
                  key={s._id}
                  onClick={() => navigate('/syllabus')}
                  className="p-3 rounded-xl border border-gray-100 dark:border-brand-charcoal/40 hover:border-brand-lilac/50 hover:bg-slate-50/50 dark:hover:bg-brand-charcoal/20 transition-all flex items-center justify-between text-xs cursor-pointer group"
                >
                  <div>
                    <div className="font-semibold text-brand-carbon dark:text-brand-silk group-hover:text-brand-charcoal dark:group-hover:text-brand-ice transition-colors">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-brand-granite dark:text-brand-lilac/70 mt-0.5">
                      {s.units?.length || 0} Units · {s.originalFileName}
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full bg-brand-silk/30 dark:bg-brand-charcoal/60 text-brand-carbon dark:text-brand-silk border border-brand-silk/50 dark:border-brand-charcoal">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Questions */}
        <div className="bg-white dark:bg-[#161F1F] rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark p-6 transition-colors">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-brand-charcoal/40">
            <h4 className="text-sm font-bold text-brand-carbon dark:text-brand-silk flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Recent Generated Questions
            </h4>
            <button
              onClick={() => navigate('/questions')}
              className="text-xs font-semibold text-brand-charcoal dark:text-brand-ice hover:underline"
            >
              View Bank
            </button>
          </div>

          {recentQuestions.length === 0 ? (
            <p className="text-xs text-brand-granite dark:text-brand-lilac/60 italic py-4">No questions generated yet.</p>
          ) : (
            <div className="space-y-3">
              {recentQuestions.map((q) => (
                <div
                  key={q._id}
                  onClick={() => navigate('/questions')}
                  className="p-3 rounded-xl border border-gray-100 dark:border-brand-charcoal/40 hover:border-brand-lilac/50 hover:bg-slate-50/50 dark:hover:bg-brand-charcoal/20 transition-all flex items-center justify-between text-xs cursor-pointer gap-2 group"
                >
                  <div className="truncate flex-1">
                    <div className="font-medium text-brand-carbon dark:text-brand-silk truncate group-hover:text-brand-charcoal dark:group-hover:text-brand-ice transition-colors">
                      {q.text}
                    </div>
                    <div className="text-[11px] text-brand-granite dark:text-brand-lilac/70 mt-0.5">
                      [{q.topicName}] · {q.bloomLevel} · {q.marks}m
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full shrink-0 border ${
                      q.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
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
