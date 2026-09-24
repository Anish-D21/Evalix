// Small shared header used at the top of every page — keeps title/
// description styling consistent without duplicating markup across
// six near-identical page files.
function PageHeader({ title, description }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-navy">{title}</h2>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{description}</p>}
    </div>
  );
}

export default PageHeader;
