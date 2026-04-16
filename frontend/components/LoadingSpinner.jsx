export function LoadingSpinner({ text = 'Loading...' }) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-sm">{text}</p>
      </div>
    )
  }