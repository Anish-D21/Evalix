function PageHeader({ title, description, badge, actions }) {
  return (
    <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-brand-charcoal/20 dark:border-brand-charcoal/40 transition-colors">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl lg:text-3xl font-extrabold font-display tracking-tight text-brand-carbon dark:text-brand-silk">
            {title}
          </h2>
          {badge && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-brand-charcoal/30 to-brand-carbon/40 dark:from-brand-charcoal/80 dark:to-brand-carbon text-brand-carbon dark:text-brand-silk border border-brand-charcoal/30 dark:border-brand-lilac/40 shadow-sm badge-shimmer-effect">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-brand-granite dark:text-brand-lilac/80 mt-2 max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0 flex-wrap">{actions}</div>}
    </div>
  );
}

export default PageHeader;
