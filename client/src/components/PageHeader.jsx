function PageHeader({ title, description, badge, actions }) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-200/70">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl lg:text-3xl font-bold font-display tracking-tight text-navy">{title}</h2>
          {badge && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-mint text-green border border-green/20">
              {badge}
            </span>
          )}
        </div>
        {description && <p className="text-sm text-gray-500 mt-1.5 max-w-3xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );
}

export default PageHeader;
