export function OccupancyBar({ occupied, total, showLabel = true }) {
    const percent = total > 0 ? Math.round((occupied / total) * 100) : 0
  
    const color =
      percent >= 90 ? 'bg-red-500' :
      percent >= 60 ? 'bg-yellow-500' :
      'bg-green-500'
  
    return (
      <div className="w-full">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        {showLabel && (
          <p className="text-xs text-gray-500 mt-1">
            {occupied} of {total} beds occupied ({percent}%)
          </p>
        )}
      </div>
    )
  }