import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';
import SyllabusDetail from '../components/SyllabusDetail.jsx';
import { uploadSyllabus, listSyllabi } from '../services/syllabusService.js';
import { getErrorMessage } from '../services/api.js';

function Syllabus() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  const [syllabi, setSyllabi] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [selectedId, setSelectedId] = useState(null);

  function refreshList() {
    setListLoading(true);
    setListError('');
    return listSyllabi()
      .then((data) => setSyllabi(data || []))
      .catch((err) => setListError(getErrorMessage(err)))
      .finally(() => setListLoading(false));
  }

  useEffect(() => {
    refreshList();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setUploadError('Please select a syllabus document first (PDF, DOCX, or TXT).');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const created = await uploadSyllabus(file, title);
      setUploadSuccess(`"${created.title}" processed and parsed successfully!`);
      setFile(null);
      setTitle('');
      e.target.reset();
      await refreshList();
      setSelectedId(created._id);
    } catch (err) {
      setUploadError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Curriculum & Syllabus Management"
        description="Upload syllabus documents to automatically detect structural units, extract domain topics using spaCy, and review the approved curriculum."
        badge="Step 1 · Curriculum Pipeline"
      />

      {/* Upload Form Card */}
      <div className="bg-white dark:bg-[#161F1F] rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark p-6 mb-8 transition-colors">
        <h3 className="text-base font-semibold text-brand-carbon dark:text-brand-silk flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 dark:border-brand-charcoal/40">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-charcoal dark:bg-brand-ice" />
          Upload Syllabus Document
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-1.5">
                Curriculum File (PDF, DOCX, TXT) <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-xs border border-gray-300 dark:border-brand-charcoal rounded-xl px-3 py-2.5 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-brand-charcoal/20 dark:file:bg-brand-charcoal/60 file:text-brand-carbon dark:file:text-brand-silk file:text-xs file:font-semibold bg-slate-50/50 dark:bg-[#131A1A] text-brand-carbon dark:text-brand-silk"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brand-granite dark:text-brand-lilac/80 mb-1.5">
                Course Title (Optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. CS402 - Artificial Intelligence & Neural Networks"
                className="w-full border border-gray-300 dark:border-brand-charcoal bg-white dark:bg-[#131A1A] text-brand-carbon dark:text-brand-silk rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-lilac/50 placeholder:text-gray-400 dark:placeholder:text-brand-granite"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="text-[11px] text-brand-granite dark:text-brand-lilac/70">
              Files are processed through PyMuPDF &amp; spaCy NLP models on CPU without storing raw files permanently.
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-charcoal hover:bg-brand-carbon text-white text-xs font-semibold shadow-md shadow-brand-charcoal/30 border border-brand-charcoal/60 hover:border-brand-ice/60 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-brand-ice" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Extracting Units &amp; Topics…
                </>
              ) : (
                'Upload & Parse Syllabus'
              )}
            </button>
          </div>

          {uploadError && <p className="text-xs text-red-500 font-medium mt-2">{uploadError}</p>}
          {uploadSuccess && <p className="text-xs text-emerald-500 font-medium mt-2">{uploadSuccess}</p>}
        </form>
      </div>

      {/* Saved Syllabi List */}
      <div className="bg-white dark:bg-[#161F1F] rounded-2xl border border-gray-200/80 dark:border-brand-charcoal/50 shadow-sm dark:shadow-card-dark p-6 transition-colors">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-brand-charcoal/40">
          <h3 className="text-base font-semibold text-brand-carbon dark:text-brand-silk">Curriculum Repository</h3>
          <span className="text-xs text-brand-granite dark:text-brand-lilac/70 font-medium">{syllabi.length} Uploaded</span>
        </div>

        {listLoading && (
          <div className="p-8 text-center text-xs text-brand-granite dark:text-brand-lilac/70">
            <svg className="animate-spin mx-auto h-5 w-5 text-brand-ice mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading curriculum list…
          </div>
        )}

        {listError && <p className="text-xs text-red-500 p-4">{listError}</p>}

        {!listLoading && !listError && syllabi.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-brand-charcoal/60 p-8 text-center text-xs text-brand-granite dark:text-brand-lilac/70 bg-slate-50/50 dark:bg-[#131A1A]">
            No curriculum uploaded yet. Upload your first syllabus document above to begin topic extraction.
          </div>
        )}

        {!listLoading && !listError && syllabi.length > 0 && (
          <div className="overflow-x-auto border border-gray-200 dark:border-brand-charcoal/50 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-brand-silk/30 dark:bg-brand-carbon text-left text-brand-granite dark:text-brand-lilac uppercase tracking-wider font-semibold border-b border-gray-200 dark:border-brand-charcoal/50">
                <tr>
                  <th className="px-4 py-3">Course / Title</th>
                  <th className="px-4 py-3">Source File</th>
                  <th className="px-4 py-3">Units Extracted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-brand-charcoal/30">
                {syllabi.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/80 dark:hover:bg-brand-charcoal/20 transition-colors">
                    <td className="px-4 py-3.5 font-semibold text-brand-carbon dark:text-brand-silk">{s.title}</td>
                    <td className="px-4 py-3.5 text-brand-granite dark:text-brand-lilac/70 font-mono text-[11px]">{s.originalFileName}</td>
                    <td className="px-4 py-3.5 text-brand-carbon dark:text-brand-silk font-medium">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-charcoal/20 dark:bg-brand-charcoal/60 text-brand-charcoal dark:text-brand-ice font-semibold border border-brand-charcoal/30">
                        {s.units?.length || 0} Units
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold capitalize border border-emerald-500/30">
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-brand-granite dark:text-brand-lilac/60">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-3">
                      <button
                        onClick={() => setSelectedId(s._id)}
                        className="text-xs font-semibold text-brand-charcoal dark:text-brand-ice hover:underline"
                      >
                        View &amp; Edit Topics
                      </button>
                      <button
                        onClick={() => navigate(`/blueprint`)}
                        className="text-xs font-semibold text-brand-granite dark:text-brand-silk hover:text-brand-charcoal dark:hover:text-brand-ice transition-colors"
                      >
                        Create Blueprint →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <SyllabusDetail
          syllabusId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={refreshList}
        />
      )}
    </div>
  );
}

export default Syllabus;
