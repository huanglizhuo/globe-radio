import { useState } from 'react';

export function FloatingInfo() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className={`fixed z-10 transition-all duration-300 ease-in-out ${isCollapsed
        ? 'bottom-4 left-4'
        : 'bottom-4 left-4'
        }`}
    >
      <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-gray-700 shadow-2xl overflow-hidden">
        {/* Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="w-full px-4 py-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition-all flex items-center justify-between group"
          aria-label={isCollapsed ? 'Expand info panel' : 'Collapse info panel'}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🌍</span>
            {!isCollapsed && (
              <span className="text-white font-bold text-lg">Globe Radio</span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''
              }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>

        {/* Expandable Content */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed
            ? 'max-h-0'
            : 'max-h-64'
            }`}
        >
          <div className="p-4 space-y-4">
            {/* Description */}
            <div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Spin the globe to discover radio stations around the world
              </p>
            </div>

            {/* Keyboard shortcuts */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="text-lg">⌨️</span>
                Keyboard Shortcuts
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <kbd className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-gray-300 text-xs font-mono">
                    Space
                  </kbd>
                  <span className="text-gray-400 text-xs">Play / Pause</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}