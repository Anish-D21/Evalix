import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import SyllabusDetail from '../components/SyllabusDetail.jsx';
import { uploadSyllabus, listSyllabi } from '../services/syllabusService.js';
import { getErrorMessage } from '../services/api.js';

function Syllabus() {
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
      .then((data) => setSyllabi(data))
      .catch((err) => setListError(getErrorMessage(err)))
      .finally(() => setListLoading(false));
  }

  useEffect(() => {
    refreshList();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setUploadError('Please choose a syllabus file first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const created = await uploadSyllabus(file, title);
      setUploadSuccess(`"${created.title}" uploaded successfully.`);
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
        title="Syllabus"
        description="Upload a syllabus file to automatically extract units and topics, or review syllabi you've already uploaded."
      />

      {/* Upload form */}
      <form onSubmit={handleUpload} className="rounded-xl border border-gray-200 bg-white p-6 mb-8">
        <h3 className="text-sm font-semibold text-navy mb-4">Upload New Syllabus</h3>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Syllabus file (PDF, DOCX, TXT)</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-mint file:text-green file:text-xs file:font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Title (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS301 - Machine Learning"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green/40"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="px-4 py-2 rounded-lg bg-green text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? 'Uploading…' : 'Upload Syllabus'}
        </button>
        {uploadError && <p className="text-sm text-red-600 mt-3">{uploadError}</p>}
        {uploadSuccess && <p className="text-sm text-green mt-3">{uploadSuccess}</p>}
      </form>

      {/* Saved syllabi list */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-4">Saved Syllabi</h3>

        {listLoading && <p className="text-sm text-gray-500">Loading syllabi…</p>}
        {listError && <p className="text-sm text-red-600">{listError}</p>}

        {!listLoading && !listError && syllabi.length === 0 && (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">
            No syllabi uploaded yet. Upload one above to get started.
          </div>
        )}

        {!listLoading && !listError && syllabi.length > 0 && (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-pink/40 text-left text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {syllabi.map((s) => (
                  <tr key={s._id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-navy">{s.title}</td>
                    <td className="px-4 py-3 text-gray-500">{s.originalFileName}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{s.status}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedId(s._id)}
                        className="text-xs font-medium text-green hover:underline"
                      >
                        View
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
