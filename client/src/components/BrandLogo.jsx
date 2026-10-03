import { useState } from 'react';
import { Link } from 'react-router-dom';

function BrandLogo({
  variant = 'header', // 'header' | 'mark' | 'full' | 'inline'
  size = 'md',        // 'sm' | 'md' | 'lg'
  withLink = false,
  className = '',
}) {
  const [imgError, setImgError] = useState(false);

  // Logo asset path from public directory
  const logoSrc = '/logo.png';

  const sizeMap = {
    sm: { img: 'w-8 h-8', text: 'text-lg', badge: 'text-[9px]' },
    md: { img: 'w-10 h-10', text: 'text-xl', badge: 'text-[10px]' },
    lg: { img: 'w-14 h-14', text: 'text-2xl', badge: 'text-xs' },
    xl: { img: 'w-20 h-20', text: 'text-3xl', badge: 'text-sm' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  const content = (() => {
    if (variant === 'full') {
      return (
        <div className={`relative flex flex-col items-center group ${className}`}>
          <div className="relative p-1.5 rounded-2xl bg-gradient-to-b from-brand-charcoal/50 to-brand-carbon/90 border border-brand-charcoal/50 shadow-2xl shadow-brand-carbon/60 group-hover:border-brand-ice/50 transition-all duration-300">
            <img
              src={logoSrc}
              alt="Evalix Logo"
              className="w-32 h-32 object-contain rounded-xl drop-shadow-md transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-brand-ice/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </div>
      );
    }

    if (variant === 'mark') {
      return (
        <div className={`relative group inline-flex items-center justify-center ${className}`}>
          <div className={`${currentSize.img} rounded-xl bg-gradient-to-br from-brand-carbon via-brand-charcoal to-brand-carbon p-0.5 border border-brand-charcoal/60 shadow-lg shadow-black/30 group-hover:border-brand-ice/60 group-hover:shadow-brand-ice/20 transition-all duration-300 flex items-center justify-center overflow-hidden`}>
            {!imgError ? (
              <img
                src={logoSrc}
                alt="Evalix"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover rounded-lg group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              // Stylized SVG nib emblem fallback
              <svg className="w-5 h-5 text-brand-silk" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L6 8l3 3-5 9 9-5 3 3 6-6L12 2zm0 4.5l3.5 3.5-2.5 2.5-3.5-3.5L12 6.5zM7.5 16.5l3-3 1.5 1.5-3 3-1.5-1.5z" />
              </svg>
            )}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-brand-carbon animate-pulse" />
        </div>
      );
    }

    if (variant === 'inline') {
      return (
        <div className={`inline-flex items-center gap-2.5 ${className}`}>
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-brand-charcoal/50 shadow-sm shrink-0 bg-brand-carbon flex items-center justify-center">
            <img src={logoSrc} alt="Evalix" className="w-full h-full object-cover" />
          </div>
          <span className="font-display font-bold tracking-tight text-brand-silk">
            EVALIX
          </span>
        </div>
      );
    }

    // Default: 'header' layout (ideal for sidebar top)
    return (
      <div className={`flex items-center gap-3 group ${className}`}>
        {/* Logo Icon with luminous frame */}
        <div className="relative shrink-0">
          <div className={`${currentSize.img} rounded-xl bg-brand-carbon/90 border border-brand-charcoal/60 p-0.5 shadow-xl shadow-black/40 group-hover:border-brand-ice/60 group-hover:shadow-brand-ice/20 transition-all duration-300 overflow-hidden flex items-center justify-center`}>
            <img
              src={logoSrc}
              alt="Evalix"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          {/* Subtle live indicator pulse */}
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-ice opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-ice border border-brand-carbon" />
          </span>
        </div>

        {/* Brand Name & Metadata */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className={`${currentSize.text} font-display font-extrabold tracking-tight text-white group-hover:text-brand-silk transition-colors flex items-center gap-1.5`}>
              <span>EVALIX</span>
            </h1>
            <span className={`${currentSize.badge} uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-brand-charcoal/80 to-brand-carbon text-brand-ice border border-brand-charcoal/60 shadow-sm`}>
              AI CORE
            </span>
          </div>
          <p className="text-[11px] font-medium text-brand-lilac/80 truncate tracking-wide">
            Assessment &amp; NLP Platform
          </p>
        </div>
      </div>
    );
  })();

  if (withLink) {
    return (
      <Link to="/dashboard" className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ice/60 rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
}

export default BrandLogo;
